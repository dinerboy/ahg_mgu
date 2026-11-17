'use strict';
// Stock-car integration of Engine Config's existing MG1 adapter and RPM guard.
const {Controller}=require('./ec_controller'),{AutoFlap}=require('./ec_auto');
const {request:colourRequest,slotOf}=require('./ec_ambient');
const LIGHT='de.bmw.infotainment.misc.ComfortFunctionIuK';
class Controls {
    constructor(ctx,store,options){
        this.ctx=ctx;this.store=store;this.options=options||{};this.armed=false;this.ready=false;this.stopped=false;this.busy=false;
        this.queue=Promise.resolve();this.sub=null;this.light=null;this.timer=null;this.lastColour=-Infinity;
        this.states={};this.mode='simulation';this.generation=0;
        const settings={get:(k)=>k==='arm'?(this.armed?'on':'off'):k==='platform'?'auto':k==='driveLink'?'off':ctx.settings.get(k),set:()=>{}};
        this.controller=this.options.controller||new Controller({signals:ctx.signals,log:ctx.log,spec:ctx.spec,settings});
        this.auto=new AutoFlap({controller:this.controller,get:(k)=>k==='driveLink'?'off':ctx.settings.get(k),rpm:()=>{
            const r=store.get('rpm');return r.quality==='live'&&r.source==='mgu'?r.value:null;
        },log:ctx.log});
        this.reset();
    }
    reset(){['exhaust','asd','startStop','ambientHardware'].forEach((id)=>{this.states[id]={id,supported:true,desired:null,pending:false,acknowledged:null,actual:null,readback:null,error:null,source:this.mode};});}
    get simulated(){return !!this.options.emulator||!!(this.options.demo&&this.options.demo())||this.ctx.settings.get('controlMode')!=='vehicle';}
    getState(id){return Object.assign({},this.states[id]);}
    capabilities(){return {exhaust:this.simulated||this.ready,asd:this.simulated,startStop:this.simulated,ambientHardware:this.simulated||!!this.light};}
    async start(){
        this.mode=this.simulated?'simulation':'vehicle';this.reset();
        // No diagnostic link or capability probe until a session Arm press.
        this.timer=setInterval(()=>{if(this.armed&&!this.busy)this.auto.tick().then(()=>this.sync()).catch((e)=>this.ctx.log.warn(String(e)));},250);
    }
    enqueue(fn){const p=this.queue.then(fn);this.queue=p.catch(()=>{});return p;}
    sync(){
        if(!this.armed)return;
        const v=this.controller.view(),s=this.states.exhaust;
        s.desired=this.auto.desired;s.pending=!!v.busy;s.acknowledged=v.accepted;
        s.readback=v.confirmed==='UNKNOWN'?null:v.confirmed;s.actual=null;s.source='vehicle';
        const note=this.auto.note();s.error=v.error||(note&&note.warn?note.text:null)||(v.accepted===false?'DME rejected or did not answer; see app logs':null);
    }
    async arm(){return this.enqueue(async()=>{
        if(this.stopped)throw new Error('Controls stopped');
        if(this.simulated)throw new Error('Choose vehicle control mode and turn demo off on the car to arm');
        if(this.armed)return;
        this.busy=true;
        try{
            this.mode='vehicle';this.reset();this.armed=true;
            if(!this.controller.link)await this.controller.start();else await this.controller.refresh();
            this.ready=this.controller.real&&!this.controller.blocked;
            this.auto.desired='OEM';this.auto.sent='OEM';
            if(!this.sub){
                this.sub=await this.ctx.signals.watch(LIGHT,'1',{statusAmbientLightInteriorColour:(v)=>{
                    if(!this.armed||this.stopped)return;
                    const n=slotOf(v&&v.statusMenuAmbientePanoramicRoofInteriorLighting);if(n===null)return;
                    const s=this.states.ambientHardware;s.actual=n;s.observedAt=Date.now();
                    s.readback=s.desired===n?n:null;
                    if(s.desired===n){s.pending=false;s.error=null;clearTimeout(this.colourTimer);}
                }},this.ctx.log);
                this.light=this.sub.proxy||null;
            }
            if(!this.ready)this.states.exhaust.error=this.controller.pickReason||'No compatible MG1 flap detected';
        }catch(e){this.armed=false;throw e;}finally{this.busy=false;}
    });}
    async disarm(){return this.enqueue(async()=>{
        this.generation++;clearTimeout(this.colourTimer);this.auto._stop();
        try{if(this.armed&&this.ready){await this.auto.press('OEM');this.sync();}}
        finally{
            this.armed=false;this.ready=false;this.auto._stop();this.auto.desired='OEM';this.auto.sent='OEM';
            await this.controller.refresh();
            if(this.sub&&this.sub.shutdown)await this.sub.shutdown();this.sub=null;this.light=null;
            this.states.ambientHardware.pending=false;
        }
    });}
    async settingsChanged(key){
        if(key==='controlMode'||key==='demo'){
            await this.disarm();this.mode=this.simulated?'simulation':'vehicle';this.reset();
        }else if(key==='hold'||key==='closeLimit')await this.auto.settingsChanged(key);
    }
    async request(id,desired){return this.enqueue(async()=>{
        if(this.stopped)throw new Error('Controls stopped');
        if(!this.states[id])throw new Error('Unknown control');
        const s=this.states[id];s.error=null;
        if(id==='exhaust'&&['OEM','OPEN','CLOSED'].indexOf(desired)<0)throw new Error('Invalid exhaust mode');
        if((id==='asd'||id==='startStop')&&typeof desired!=='boolean')throw new Error('Expected on/off');
        if(id==='ambientHardware'&&(!Number.isInteger(desired)||desired<1||desired>12))throw new Error('Ambient slot must be 1–12');
        if(this.simulated){
            s.source='simulation';s.supported=true;s.desired=desired;s.acknowledged=true;s.actual=desired;s.readback=desired;s.pending=false;return this.getState(id);
        }
        if(id==='ambientHardware'&&Date.now()-this.lastColour<1500){s.error='Wait 1.5 seconds between colour changes';throw new Error(s.error);}
        s.source='vehicle';s.desired=desired;s.actual=id==='ambientHardware'?s.actual:null;s.acknowledged=null;
        if(id==='asd'||id==='startStop'){
            s.supported=false;s.error=id==='asd'?'Stock ASD write unavailable; Engine Config ASD requires bootmod3':'No verified stock start-stop memory write in the referenced SDK';throw new Error(s.error);
        }
        if(!this.armed){s.error='Arm vehicle controls for this session first';throw new Error(s.error);}
        if(id==='exhaust'){
            if(!this.ready){s.error=this.controller.pickReason||'No compatible MG1 exhaust flap';throw new Error(s.error);}
            s.pending=true;await this.auto.press(desired);this.sync();return this.getState(id);
        }
        if(!this.light){s.error='Ambient colour interface unavailable';throw new Error(s.error);}
        if(s.actual===desired){s.readback=desired;s.pending=false;return this.getState(id);}
        const generation=this.generation;s.pending=true;s.readback=null;this.lastColour=Date.now();
        clearTimeout(this.colourTimer);
        try{
            await this.ctx.signals.set(this.light,'ambientLightInteriorColour',colourRequest(desired));
            if(this.generation!==generation)return this.getState(id);
            s.acknowledged=true;
            if(s.actual===desired){s.pending=false;s.readback=desired;}
            else this.colourTimer=setTimeout(()=>{s.pending=false;s.error='Colour submitted; matching status not received';},5000);
        }catch(e){s.pending=false;s.acknowledged=false;s.error=String(e.message||e);throw e;}
        return this.getState(id);
    });}
    async stop(){this.stopped=true;clearInterval(this.timer);clearTimeout(this.colourTimer);await this.disarm();
        const p=this.controller.link&&this.controller.link.diag&&this.controller.link.diag.p;
        if(p&&p.shutdown)await p.shutdown();
    }
}
module.exports={Controls};
