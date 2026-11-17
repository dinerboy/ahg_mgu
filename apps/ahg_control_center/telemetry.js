'use strict';
const M=require('./model');
const CDS='de.bmw.infotainment.vehicle.CDS', VEHICLE='de.bmw.infotainment.vehicle.Vehicle2';
function convert(raw,factor,offset,invalid,min,max) {
    if(!M.finite(raw) || raw===invalid) return null;
    const value=raw*factor+offset;
    return value>=min && value<=max?value:null;
}
class MockProvider {
    constructor(store,hz) { this.store=store;this.hz=hz;this.startTime=Date.now();this.timer=null;this.visible=true; }
    sample(t) {
        const s=t==null?(Date.now()-this.startTime)/1000:t;
        const wave=(1+Math.sin(s*0.34-0.4))/2;
        const data={oil:102+8*Math.sin(s*0.05),coolant:91+3*Math.sin(s*0.09),voltage:14.2+0.12*Math.sin(s*0.17),
            rpm:1200+4300*wave,speed:38+72*wave,hv_soc:72-1.2*Math.sin(s*0.01),ev_range:31,
            electric_kw:18*Math.sin(s*0.18),regen_kw:Math.min(0,18*Math.sin(s*0.18)),fuel:4.1,
            energy_used:4.2,electric_share:68,drive_source:'Hybrid',drive_mode:'Sport',charging:'Not connected',charge_energy:9.8,
            baro_bar:1.013,manifold_bar:1.013+0.78+0.64*Math.sin(s*0.3)};
        Object.keys(data).forEach((k)=>this.store.put(k,data[k],'mock','Deterministic emulator/demo model'));
        const boost=M.boostFrom(this.store.get('manifold_bar'),this.store.get('baro_bar'));
        this.store.put('boost',boost,'mock','DEMO: manifold absolute minus atmospheric pressure');
    }
    start() { this.sample();this.schedule(); }
    schedule() { clearInterval(this.timer);this.timer=setInterval(()=>this.sample(),this.visible?1000/this.hz:1000); }
    setVisible(visible) { if(this.visible!==visible){this.visible=visible;this.schedule();} }
    stop() { clearInterval(this.timer);this.timer=null; }
    capabilities() { return {mode:'demo',vehicleWrites:false}; }
}
class MguProvider {
    constructor(ctx,store) { this.ctx=ctx;this.store=store;this.subscriptions=[];this.timers=[];this.stopped=false;this.generation=0; }
    start() {
        this.stopped=false;const generation=++this.generation;
        const source=process.env.AHG_EMULATOR==='1'?'mock':'mgu';
        const put=(key,value,provenance)=>{ if(!this.stopped && generation===this.generation) this.store.put(key,value,source,provenance); };
        this.subscribe(CDS,{
            statusEngineSpeed2:(v)=>put('rpm',convert(v.actualValueRPMEngineCrankshaft,0.25,0,65535,0,12000),CDS+'.statusEngineSpeed2 raw * 0.25'),
            statusEngineTemperature:(v)=>{
                put('oil',convert(v.temperatureEngineOilDrive,1,-48,255,-40,170),CDS+'.statusEngineTemperature.temperatureEngineOilDrive raw - 48');
                put('coolant',convert(v.temperatureEngineDrive,1,-48,255,-40,170),CDS+'.statusEngineTemperature.temperatureEngineDrive raw - 48');
            }
        },1000,generation);
        this.subscribe(VEHICLE,{statusCarSpeed2:(v)=>put('speed',convert(v.speedVehicleCentreOfGravity,1/64,0,65535,0,400),VEHICLE+'.statusCarSpeed2 raw / 64')},1000,generation);
    }
    subscribe(iface,handlers,delay,generation) {
        if(this.stopped || generation!==this.generation) return;
        this.ctx.signals.watch(iface,'1',handlers,this.ctx.log).then((sub)=>{
            if(this.stopped || generation!==this.generation){if(sub.shutdown)sub.shutdown();return;}
            if(sub.error){
                if(sub.shutdown)sub.shutdown();
                const timer=setTimeout(()=>this.subscribe(iface,handlers,Math.min(delay*2,30000),generation),delay);
                this.timers.push(timer);
            } else this.subscriptions.push(sub);
        }).catch((error)=>{
            this.ctx.log.warn('Read-only subscription: '+String(error));
            if(!this.stopped && generation===this.generation)this.timers.push(setTimeout(()=>this.subscribe(iface,handlers,Math.min(delay*2,30000),generation),delay));
        });
    }
    setVisible() {}
    stop() { this.stopped=true;this.generation++;this.timers.forEach(clearTimeout);this.timers=[];
        this.subscriptions.forEach((s)=>{if(s.shutdown)s.shutdown();});this.subscriptions=[]; }
    capabilities() { return {mode:'read-only',signals:['rpm','oil','coolant','speed'],vehicleWrites:false}; }
}
module.exports={MockProvider,MguProvider,convert};
