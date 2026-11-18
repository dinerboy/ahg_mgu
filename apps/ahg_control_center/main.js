'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges');
const M=require('./model'),T=require('./theme'),V=require('./reference-view');
const {Gauge}=require('./gauge'),{MockProvider,MguProvider}=require('./telemetry');
const {Controls}=require('./controls'),{Diagnostics}=require('./diagnostics');
const {listSheet}=require('./kit/sheet');
const IDS=['home','controls','hybrid','drive','system'];
const {HybridReader}=require('./hybrid');
const KIT_RED=require('./kit/themes').THEMES.m_red;
const {Trip}=require('./trip');
const {normalize}=require('./settings');
const {DriveLog}=require('./drivelog');
function start(ctx) {
    normalize(ctx.settings,ctx.spec.settings || []);
    const app={ctx:ctx,store:new M.SignalStore(),gauges:new Gauge(),diagnostics:new Diagnostics(ctx.dataDir,ctx.spec&&ctx.spec.version),logOffset:0,
        page:Math.max(0,IDS.indexOf(ctx.settings.get('page'))),provider:null,systemMode:'overview',signalOffset:0,
        emulator:process.env.AHG_EMULATOR==='1',demo:false,trip:new Trip(),elapsed:0,toast:null,toastUntil:0};
    app.notice=(s)=>{app.toast=s;app.toastUntil=Date.now()+3500;app.diagnostics.log(s);};
    app.ioCtx=Object.assign({},ctx,{log:app.diagnostics.logger(ctx.log)});
    app.controls=new Controls(app.ioCtx,app.store,{emulator:app.emulator,demo:()=>app.demo});
    const NAMES={exhaust:'Exhaust flap',asd:'Active Sound',startStop:'Start-stop memory',ambientHardware:'Ambient slot'};
    const said=(v)=>v===true?'on':v===false?'off':v==='OEM'?'auto':String(v).toLowerCase();
    app.control=(id,value)=>app.controls.request(id,value).then((s)=>app.notice(s.source==='simulation'?'Simulation: '+NAMES[id]+' '+said(value):s.error||NAMES[id]+' '+said(value)+' sent - waiting for ECU read-back')).catch((e)=>app.notice(e.message));
    app.recheckControls=()=>app.controls.recheck().then((ready)=>app.notice(ready?'Exhaust flap ready':app.controls.detectionError)).catch((e)=>app.notice(e.message));
    app.cycleSetting=(key)=>{const it=(ctx.spec.settings||[]).find((x)=>x.key===key);if(!it)return;const list=it.options.map((o)=>o[0]);ctx.settings.set(key,list[(list.indexOf(ctx.settings.get(key))+1)%list.length]);};
    app.navigate=(i)=>{app.page=M.clamp(i,0,IDS.length-1);ctx.settings.set('page',IDS[app.page]);};
    // Only remember the preset once the colour request went through (or simulation accepted it).
    app.setProfile=(p)=>{const slot=Number(ctx.settings.get('slot_'+p))||1;
        app.controls.request('ambientHardware',slot).then((s)=>{ctx.settings.set('profile',p);
            app.notice(s.source==='simulation'?'Simulation: ambient '+p+' (slot '+slot+')':'Ambient '+p+' sent (slot '+slot+'); waiting for car read-back');})
        .catch((e)=>app.notice(e.message));};
    app.driveLog=new DriveLog(ctx.dataDir);app.driveLog.setEnabled(ctx.settings.get('logging')!=='off');
    app.toggleLogging=()=>{ctx.settings.set('logging',ctx.settings.get('logging')==='off'?'on':'off');};
    app.newDrive=()=>{app.driveLog.finish();app.trip.reset();app.notice('Drive saved; a new log starts with the next live reading');};
    app.resetTrip=()=>{app.trip.reset();app.notice('Trip distance reset');};
    app.toggleDisplay=()=>ctx.settings.set('displayMode',ctx.settings.get('displayMode')==='dark'?'auto':'dark');
    app.settings=()=>{if(!ctx.sheet(listSheet(ctx.settings,null,{version:ctx.spec.version})))ctx.ui.open('SETTINGS');};
    app.exportReport=()=>{try{app.notice('Saved locally: '+app.diagnostics.export(app.store,app.controls));}catch(e){app.notice('Report unavailable: data directory is not writable');}};
    function provider(){
        if(app.provider)app.provider.stop();if(app.hybrid){app.hybrid.stop();app.hybrid=null;}app.store.clear();app.trip.reset();app.gauges.needle={};
        app.demo=ctx.settings.get('demo')==='on';
        app.provider=app.demo?new MockProvider(app.store,Number(ctx.settings.get('sensorHz'))||10):new MguProvider(app.ioCtx,app.store);
        app.provider.start();
        // Read-only HV battery / 12 V reads (kit/readonly-diag: 0x22 only). Not in demo or the emulator.
        if(!app.demo&&!app.emulator){app.hybrid=new HybridReader(app.ioCtx,app.store);app.hybrid.start().catch((e)=>app.diagnostics.log('hybrid: '+String(e)));}
        app.diagnostics.log(app.demo?'DEMO provider started: synthetic readings':'Read-only provider started: no demo fallback');
    }
    app.refresh=()=>{provider();app.notice('Readings refreshed; no diagnostic scan or vehicle command');};
    ctx.settings.onChange((key)=>{if(key==='demo'||key==='sensorHz'){app.driveLog.finish();provider();}
        if(key==='logging'){app.driveLog.setEnabled(ctx.settings.get('logging')!=='off');app.notice(ctx.settings.get('logging')==='off'?'Drive logging off':'Drive logging on');}
        if(key==='logHz')sampler();if(key==='page')app.page=Math.max(0,IDS.indexOf(ctx.settings.get('page')));app.controls.settingsChanged(key).catch((e)=>app.notice(e.message));});
    ctx.ui.onClick('BTN_PAGE',()=>app.navigate((app.page+1)%IDS.length));ctx.ui.onClick('BTN_PREV',()=>app.navigate((app.page+IDS.length-1)%IDS.length));
    ctx.onTab((i)=>app.navigate(i));
    // Hiding the app (navigation, a call) keeps the flap where you put it; only quitting hands it back to the DME.
    if(ctx.ui.onVisible)ctx.ui.onVisible((name,on)=>{if(name==='MAIN'&&app.provider)app.provider.setVisible(on);});
    provider();
    app.controls.start();
    // Trip and logging run on timers, not the draw loop, so they keep going
    // while navigation or another app is on screen.
    let logTimer=null;
    function sampler(){clearInterval(logTimer);const hz=Number(ctx.settings.get('logHz'))||2;
        logTimer=setInterval(()=>{try{const f=app.controls.getState('exhaust');app.driveLog.sample(app.store,{flap:f.source==='simulation'?'':f.readback||''});}catch(e){ctx.log.warn('drive log: '+String(e));}},1000/hz);}
    sampler();
    const tripTimer=setInterval(()=>app.trip.update(app.store.get('speed'),Date.now()),200);
    let previous=Date.now();
    const loop=ctx.loop('MAIN',4,async()=>{
        const now=Date.now(),dt=M.clamp((now-previous)/1000,0,0.5);previous=now;app.elapsed=(now-app.diagnostics.started)/1000;
        T.setAccent(ctx.settings.get('accent'));const cv=ctx.canvas(1600,520);cv.clear(T.C.bg);
        G.frame(cv,T.kitTheme(KIT_RED),[],-1,[{text:app.controls.simulated?'SIMULATION':app.controls.ready?'FLAP READY':app.controls.busy?'CONNECTING':'NO FLAP',color:app.controls.simulated?T.C.amber:app.controls.ready?T.C.accent:T.C.amber}]);
        V.draw(cv,app,dt);await ctx.ui.image('MAIN_GFX',cv);
    });
    const stop=async()=>{if(app.hybrid)app.hybrid.stop();clearInterval(logTimer);clearInterval(tripTimer);app.driveLog.stop();app.provider.stop();loop.stop();app.gauges.clear();await app.controls.stop();};
    const shutdown=()=>{stop().catch((e)=>ctx.log.warn('shutdown: '+String(e))).then(()=>process.exit(0));};
    process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
    app.stop=stop;return app;
}
if(process.env.AHG_UNIT_TEST!=='1')mgu.run({start:start});
module.exports={start,Trip};
