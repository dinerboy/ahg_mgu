'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/ahg_control_center');
const M=require(path.join(app,'model')),{MockProvider}=require(path.join(app,'telemetry'));
const {Trip}=require(path.join(app,'trip'));
const {Recorder}=require('../kit/runtime/record');
// Same Gauge module, with the staged ./kit path resolved to the actual SDK.
// No build tree shared with the live-reloading emulator is mutated by tests.
const loaded={};
function loadApp(name){
    if(loaded[name])return loaded[name].exports;
    const module={exports:{}};loaded[name]=module;
    const local=(request)=>request.indexOf('./kit/')===0?require(path.join(root,'kit/runtime',request.slice(6))):request.indexOf('./')===0?loadApp(request.slice(2)):require(request);
    new Function('require','module','exports','__dirname',fs.readFileSync(path.join(app,name+'.js'),'utf8'))(local,module,module.exports,app);
    return module.exports;
}
const {Gauge}=loadApp('gauge'),V=loadApp('reference-view');
const spec=require('../apps/ahg_control_center/app.json');
const values=spec.settings.reduce((o,s)=>{o[s.key]=s.default;return o;},{});
function fixture(demo){const store=new M.SignalStore();if(demo)new MockProvider(store,10).sample(2);
    return {store,demo,emulator:true,page:0,elapsed:2,systemMode:'overview',signalOffset:0,trip:new Trip(),gauges:new Gauge(),ctx:{settings:{get:(k)=>values[k]}},
        controls:{simulated:true,armed:false,ready:false,getState:(id)=>({source:'simulation',actual:null})},control:()=>{},armControls:()=>{},
        diagnostics:{started:Date.now(),entries:['DEMO provider'],update:()=>({cpu:10,ram:40,storage:30})},accent:()=> '#d51e28',navigate:()=>{},setProfile:()=>{},refresh:()=>{},resetTrip:()=>{},toggleDisplay:()=>{},settings:()=>{},exportReport:()=>{}};}
for(const demo of [true,false])for(let page=0;page<6;page++)test('SDK records page '+page+' / '+(demo?'demo':'no data')+' with safe input targets',()=>{
    const state=fixture(demo);state.page=page;const cv=new Recorder(1600,520);V.draw(cv,state,1/60);
    assert.ok(cv.words().length>100);assert.ok(cv.words().byteLength<200000);
    for(const t of cv.targets){assert.ok(t.x>=12&&t.y>=38&&t.x+t.w<=1588&&t.y+t.h<=477,JSON.stringify(t));}
    if(page===1){['flap-OPEN','flap-OEM','flap-CLOSED','hold-toggle','close-guard'].forEach((key)=>assert.ok(cv.targets.some((t)=>t.key===key),key));}state.gauges.clear();
});
test('gauge caches static geometry, clamps the needle and removes it for stale data',()=>{
    const g=new Gauge(),spec=M.DEFINITIONS.oil,cv=new Recorder(1600,520),r={value:900,quality:'live',source:'mgu'};
    g.draw(cv,'oil',spec,r,300,250,170,0.1);assert.equal(g.needle.oil,150);assert.equal(g.keys.length,1);
    const face=g.faces[g.keys[0]];
    assert.equal(face.words[0],10,'photographic face starts with native triangle geometry');
    assert.ok(!face.sublayers||face.sublayers.size===0,'native renderer cannot draw nested layers');
    g.draw(cv,'oil',spec,r,300,250,170,0.1);assert.equal(g.keys.length,1);
    g.draw(cv,'oil',spec,Object.assign({},r,{quality:'stale'}),300,250,170,0.1);assert.equal(g.needle.oil,undefined);g.clear();
});
test('vehicle controls expose a recheck action and retain a readable blocked reason',()=>{
    const state=fixture(false);state.page=1;state.controls.simulated=false;state.controls.armed=true;state.controls.ready=false;
    state.controls.getState=(id)=>({source:'vehicle',actual:null,error:id==='exhaust'?'Diagnostic link unavailable':null});
    state.recheckControls=()=>{};
    const cv=new Recorder(1600,520);V.draw(cv,state,1/60);
    assert.ok(cv.targets.some((t)=>t.key==='recheck-link'));state.gauges.clear();
});
test('app syntax parses as ECMAScript 2017 (Node 8 target)',()=>{
    const acorn=require('acorn');fs.readdirSync(app).filter((f)=>f.endsWith('.js')).forEach((file)=>acorn.parse(fs.readFileSync(path.join(app,file),'utf8'),{ecmaVersion:2017}));
});
test('vehicle permissions are limited to known TASU methods and ambient colour setter',()=>{
    assert.equal(spec.settings.find((s)=>s.key==='demo').default,'off');
    const writable=[];Object.values(spec.signals).forEach((fields)=>Object.keys(fields).forEach((key)=>{if(key[0]!=='_'&&fields[key]==='w')writable.push(key);}));
    assert.deepEqual(writable,['ambientLightInteriorColour']);
    assert.deepEqual(spec.signals['com.harman.infotainment.systemfunctions.tasu.tasu.InternalTasu']._methods,['sendTasuRequest']);
    assert.equal(spec.autostart,undefined);
});
