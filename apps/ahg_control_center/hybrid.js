'use strict';
/**
 * hybrid.js - high-voltage battery and 12 V readings, READ-ONLY.
 *
 * Source: idrive7-apps eDrive (apps/edrive/app.json config.battery), set up on the X5 45e and
 * written for BMW plug-in hybrids in general. Not yet confirmed on a G30 530e: every value has
 * several candidate identifiers; the first one that answers with a plausible number is used.
 *
 *   HV charge      SME (0x07)  22 DDBC   0.1 %
 *   HV voltage     SME (0x07)  22 DDB4 / DD68 / DD66 / DDEF
 *   HV current     SME (0x07)  22 DD69   0.01 A, signed, negative = the battery gives power
 *   12 V voltage   DME (0x12)  22 F442 (or OBD 01 42), else the battery sensor / gearbox unit
 *   Boost          DME (0x12)  22 F470 / F487 / F40B (or OBD 01 0B) absolute kPa minus 22 F433 outside air
 *                  pressure - only when the sport display sends no boost (as idrive7-apps car_vitals readBoost)
 *
 * Every request goes through kit/readonly-diag.js, which refuses anything but 0x22 reads (and
 * OBD 01/09) before it reaches the car: nothing is written, coded or actuated here.
 */
const M=require('./model');
const SME=0x07;
const C={
    soc:[{ecu:SME,did:'DDBC',bytes:2,factor:0.1,min:0.5,max:100,timeoutMs:1500}],
    hvV:[{ecu:SME,did:'DDB4',bytes:2,factor:0.01,min:150,max:500,timeoutMs:600},{ecu:SME,did:'DD68',bytes:2,factor:0.01,min:150,max:500,timeoutMs:800},
        {ecu:SME,did:'DD66',bytes:2,factor:0.01,min:150,max:500,timeoutMs:800},{ecu:SME,did:'DDEF',bytes:2,factor:1,min:150,max:500,timeoutMs:800}],
    hvI:[{ecu:SME,did:'DD69',bytes:4,factor:0.01,signed:true,min:-800,max:800,timeoutMs:600}],
    v12:[{ecu:0x12,did:'F442',bytes:2,factor:0.001,min:5,max:18,timeoutMs:1500},{ecu:0x12,obd:'42',bytes:2,factor:0.001,min:5,max:18,timeoutMs:1500},
        {ecu:0x12,did:'402B',bytes:2,at:2,factor:0.00025,offset:6,min:5,max:18,timeoutMs:1500},{ecu:0x12,did:'5853',bytes:2,factor:0.001,min:5,max:18,timeoutMs:1500},
        {ecu:0x18,did:'F442',bytes:2,factor:0.001,min:5,max:18,timeoutMs:1500}],
    // car_vitals app.json config.dme.boost / baro (absolute kPa)
    boost:[{ecu:0x12,did:'F470',bytes:2,at:3,factor:0.03125,min:20,max:600,timeoutMs:600},{ecu:0x12,did:'F487',bytes:2,at:1,factor:0.03125,min:20,max:600,timeoutMs:600},
        {ecu:0x12,did:'F40B',bytes:1,factor:1,min:20,max:255,timeoutMs:600},{ecu:0x12,obd:'0B',bytes:1,factor:1,min:20,max:255,timeoutMs:600}],
    baro:[{ecu:0x12,did:'F433',bytes:1,factor:1,min:50,max:115,timeoutMs:1000},{ecu:0x12,obd:'33',bytes:1,factor:1,min:50,max:115,timeoutMs:1000}]
};
const POWER_SIGN=-1;          // DD69: negative current = the battery gives power -> positive kW = driving
const TICK_MS=500,FAST_MS=1000,SOC_MS=10000,V12_MS=5000,BARO_MS=60000;
/** What drives the car now, from engine speed, battery power and speed (all measured). */
function driveSource(rpm,kw,speed){
    if(!M.finite(rpm))return null;
    const engine=rpm>400,moving=M.finite(speed)&&speed>2,k=M.finite(kw)?kw:0;
    if(!moving&&!engine)return k<-0.8?'Charging':'Ready';
    if(engine)return k>3?'Hybrid boost':k<-1?'Engine + charging':'Engine';
    return k<-1?'Recuperating':'Electric';
}
class EnergyTrip {
    constructor(){this.reset();}
    reset(){this.usedKwh=0;this.regenKwh=0;this.km=0;this.evKm=0;this.last=null;}
    update(kw,speed,rpm,now){
        const p=this.last;this.last={t:now,kw:kw,speed:speed,rpm:rpm};
        if(!p)return;const h=(now-p.t)/3600000;if(h<=0||h>5/3600)return; // gaps over 5 s are not integrated
        if(M.finite(kw)&&M.finite(p.kw)){const e=(kw+p.kw)/2*h;if(e>0)this.usedKwh+=e;else this.regenKwh-=e;}
        if(M.finite(speed)&&M.finite(p.speed)){const d=(speed+p.speed)/2*h;this.km+=d;if(M.finite(rpm)&&rpm<300)this.evKm+=d;}
    }
    share(){return this.km>0.05?100*this.evKm/this.km:null;}
}
class HybridReader {
    constructor(ctx,store,options){
        this.ctx=ctx;this.store=store;this.options=options||{};this.link=null;this.reader=null;
        this.timer=null;this.stopped=true;this.at={soc:0,v12:0,fast:0,baro:0};this.baro=101.3;this.trip=new EnergyTrip();this.error=null;
    }
    async start(){
        this.stopped=false;
        try{
            const {ReadOnlyDiag}=require('./kit/readonly-diag'),{DidReader}=require('./kit/dids');
            this.link=this.options.link||new ReadOnlyDiag(this.ctx.signals,this.ctx.log);
            if(!this.options.link)await this.link.init();
            this.reader=new DidReader(this.link,{ecu:SME});
        }catch(e){this.error='Diagnostic link unavailable: '+String(e.message||e);this.ctx.log.warn('hybrid: '+this.error);return;}
        if(!this.stopped)this.schedule(500);
    }
    schedule(ms){if(!this.stopped){clearTimeout(this.timer);this.timer=setTimeout(()=>this.tick().catch((e)=>this.ctx.log.warn('hybrid read: '+String(e))).then(()=>this.schedule(TICK_MS)),ms);}}
    put(key,value,note){if(!this.stopped)this.store.put(key,value,'mgu',note);}
    async tick(){
        if(this.stopped||!this.reader||(this.link.available===false))return;
        const now=Date.now();
        // Boost from the DME, twice a second, only while the sport display sends none
        const fes=this.store.get('boost');
        if(!(fes.quality==='live'&&String(fes.provenance).indexOf('FES')>=0))await this.readBoost(now);
        if(now-this.at.fast>=FAST_MS){this.at.fast=now;
            const v=await this.reader.value('hvV',C.hvV),i=await this.reader.value('hvI',C.hvI);
            if(v!=null)this.put('hv_v',v,'SME 22 '+C.hvV[this.reader.pick.hvV||0].did);
            if(v!=null&&i!=null){
                const kw=POWER_SIGN*v*i/1000;
                this.put('electric_kw',kw,'SME pack voltage x current (DD69)');this.put('regen_kw',kw<0?-kw:0,'SME: negative battery power');
            }
        }
        if(now-this.at.soc>=SOC_MS){this.at.soc=now;const s=await this.reader.value('soc',C.soc);if(s!=null)this.put('hv_soc',s,'SME 22 DDBC');}
        if(now-this.at.v12>=V12_MS){this.at.v12=now;const b=await this.reader.value('v12',C.v12);if(b!=null)this.put('voltage',b,'12 V: '+(C.v12[this.reader.pick.v12||0].did||'OBD 42'));}
        this.derive(Date.now());
    }
    /** charge / manifold pressure (absolute kPa) minus outside air pressure, in bar */
    async readBoost(now){
        if(now-this.at.baro>=BARO_MS){this.at.baro=now;const b=await this.reader.value('baro',C.baro);if(b!=null)this.baro=b;}
        const m=await this.reader.value('boost',C.boost);
        if(m!=null){const c=C.boost[this.reader.pick.boost||0];this.put('boost',(m-this.baro)/100,'DME 22 '+(c.did||'OBD '+c.obd)+' minus outside air '+Math.round(this.baro)+' kPa');}
    }
    // Derived values from what was measured (no extra requests).
    derive(now){
        const g=(k)=>{const r=this.store.get(k);return r.quality==='live'?r.value:null;};
        const rpm=g('rpm'),kw=g('electric_kw'),speed=g('speed');
        const src=driveSource(rpm,kw,speed);if(src)this.put('drive_source',src,'Derived: engine speed, battery power, speed');
        this.trip.update(kw,speed,rpm,now);
        if(this.trip.km>0||this.trip.usedKwh>0){
            this.put('energy_used',this.trip.usedKwh,'Integrated battery power');this.put('regen_energy',this.trip.regenKwh,'Integrated negative battery power');
            const sh=this.trip.share();if(sh!=null)this.put('electric_share',sh,'Distance with the engine off');
        }
    }
    stop(){this.stopped=true;clearTimeout(this.timer);if(this.link&&this.link.cancel)this.link.cancel();}
}
module.exports={HybridReader,EnergyTrip,driveSource,CANDIDATES:C};
