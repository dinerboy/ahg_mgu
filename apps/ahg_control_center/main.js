'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges');
const M=require('./model'),T=require('./theme'),V=require('./reference-view');
const {Gauge}=require('./gauge'),{MockProvider,MguProvider}=require('./telemetry');
const {Controls}=require('./controls'),{Diagnostics}=require('./diagnostics');
const {listSheet}=require('./kit/sheet');
const IDS=['home','controls','hybrid','system'];
const {Trip}=require('./trip');
const {normalize}=require('./settings');
function start(ctx) {
    normalize(ctx.settings,ctx.spec.settings || []);
    const app={ctx:ctx,store:new M.SignalStore(),gauges:new Gauge(),diagnostics:new Diagnostics(ctx.dataDir),
        page:Math.max(0,IDS.indexOf(ctx.settings.get('page'))),provider:null,systemMode:'overview',signalOffset:0,
        emulator:process.env.AHG_EMULATOR==='1',demo:false,trip:new Trip(),elapsed:0,toast:null,toastUntil:0};
    app.accent=()=>({comfort:T.C.blue,sport:T.C.red,night:'#bd8ddb',custom:'#dfb161'})[ctx.settings.get('profile')]||T.C.red;
    app.notice=(s)=>{app.toast=s;app.toastUntil=Date.now()+3500;app.diagnostics.log(s);};
    app.ioCtx=Object.assign({},ctx,{log:app.diagnostics.logger(ctx.log)});
    app.controls=new Controls(app.ioCtx,app.store,{emulator:app.emulator,demo:()=>app.demo});
    app.control=(id,value)=>app.controls.request(id,value).then((s)=>app.notice(s.source==='simulation'?'SIMULATED '+id+' = '+value:s.error||'Request sent; inspect ECU read-back')).catch((e)=>app.notice(e.message));
    app.armControls=()=>{const p=app.controls.armed?app.controls.disarm():app.controls.arm();p.then(()=>app.notice(app.controls.armed?'Session armed; press a control to send':'Disarmed; OEM hand-back requested')).catch((e)=>app.notice(e.message));};
    app.recheckControls=()=>app.controls.recheck().then((ready)=>app.notice(ready?'MG1 flap ready; select Open/Closed/OEM':app.controls.detectionError)).catch((e)=>app.notice(e.message));
    app.navigate=(i)=>{app.page=M.clamp(i,0,3);ctx.settings.set('page',IDS[app.page]);};
    app.setProfile=(p)=>{ctx.settings.set('profile',p);app.control('ambientHardware',Number(ctx.settings.get('slot_'+p))||1);};
    app.resetTrip=()=>{app.trip.reset();app.notice('App trip session reset');};
    app.toggleDisplay=()=>ctx.settings.set('displayMode',ctx.settings.get('displayMode')==='dark'?'auto':'dark');
    app.settings=()=>{if(!ctx.sheet(listSheet(ctx.settings,null,{version:ctx.spec.version})))ctx.ui.open('SETTINGS');};
    app.exportReport=()=>{try{app.notice('Saved locally: '+app.diagnostics.export(app.store,app.controls));}catch(e){app.notice('Report unavailable: data directory is not writable');}};
    function provider(){
        if(app.provider)app.provider.stop();app.store.clear();app.trip.reset();app.gauges.needle={};
        app.demo=ctx.settings.get('demo')==='on';
        app.provider=app.demo?new MockProvider(app.store,Number(ctx.settings.get('sensorHz'))||10):new MguProvider(app.ioCtx,app.store);
        app.provider.start();app.diagnostics.log(app.demo?'DEMO provider started: synthetic readings':'Read-only provider started: no demo fallback');
    }
    app.refresh=()=>{provider();app.notice('Readings refreshed; no diagnostic scan or vehicle command');};
    ctx.settings.onChange((key)=>{if(key==='demo'||key==='sensorHz')provider();if(key==='page')app.page=Math.max(0,IDS.indexOf(ctx.settings.get('page')));app.controls.settingsChanged(key).catch((e)=>app.notice(e.message));});
    ctx.ui.onClick('BTN_PAGE',()=>app.navigate((app.page+1)%4));ctx.ui.onClick('BTN_PREV',()=>app.navigate((app.page+3)%4));
    ctx.onTab((i)=>app.navigate(i));
    if(ctx.ui.onVisible)ctx.ui.onVisible((name,on)=>{if(name==='MAIN'&&app.provider){app.provider.setVisible(on);if(!on)app.controls.disarm().catch((e)=>app.notice(e.message));}});
    provider();
    app.controls.start();
    let previous=Date.now(),tripAt=previous;
    const loop=ctx.loop('MAIN',4,async()=>{
        const now=Date.now(),dt=M.clamp((now-previous)/1000,0,0.1);previous=now;app.elapsed=(now-app.diagnostics.started)/1000;
        if(now-tripAt>=100){app.trip.update(app.store.get('speed'),now);tripAt=now;}
        const cv=ctx.canvas(1600,520);cv.clear('#07090c');
        G.frame(cv,ctx.theme(),[],-1,[{text:app.controls.simulated?'SIMULATION':app.controls.armed?'ARMED':'DISARMED',color:app.controls.armed?T.C.red:T.C.amber}]);
        V.draw(cv,app,dt);await ctx.ui.image('MAIN_GFX',cv);
    });
    const stop=async()=>{app.provider.stop();loop.stop();app.gauges.clear();await app.controls.stop();};
    const shutdown=()=>{stop().catch((e)=>ctx.log.warn('shutdown: '+String(e))).then(()=>process.exit(0));};
    process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
    app.stop=stop;return app;
}
if(process.env.AHG_UNIT_TEST!=='1')mgu.run({start:start});
module.exports={start,Trip};
