'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-app'),{Controls}=load('controls'),{SignalStore}=load('model');
function fixture(opts){
    opts=opts||{};let control,watcher,now=Date.now();const listeners=[],link={available:!opts.offline,onAvailable:(fn)=>listeners.push(fn)};
    const commands=[],writes=[],values={controlMode:'vehicle',hold:'off',closeLimit:'4000'},store=new SignalStore(()=>now);
    const controller={link:null,real:true,blocked:!!opts.unsupported,pickReason:'No supported DME',state:{requested:'OEM',accepted:null,confirmed:'UNKNOWN'},
        get armedSetting(){return control.armed;},async start(){this.link=link;},async refresh(){},
        async setMode(mode){commands.push(mode);this.state={requested:mode,accepted:true,confirmed:opts.confirmed||'UNKNOWN',busy:false};},view(){return this.state;}};
    const ctx={settings:{get:(k)=>values[k]},log:{info:()=>{},warn:()=>{},error:()=>{}},signals:{
        watch:async(i,n,h)=>{watcher=h;return {proxy:{},shutdown:async()=>{}};},
        set:async(p,f,v)=>{writes.push({f,v});if(opts.failSet)throw new Error('setter failed');}}};
    control=new Controls(ctx,store,{controller,emulator:!!opts.emulator,demo:()=>!!opts.demo});
    return {control,controller,commands,writes,values,store,availability:(on)=>{link.available=on;listeners.forEach((fn)=>fn(on));},status:(n)=>watcher.statusAmbientLightInteriorColour({statusMenuAmbientePanoramicRoofInteriorLighting:'FARBAUSWAHL_'+n}),advance:(ms)=>{now+=ms;}};
}
test('in the car the controls arm themselves at startup: read-only detection, no command until a press',async()=>{
    const f=fixture();await f.control.start();assert.equal(f.control.armed,true);assert.equal(f.control.ready,true);assert.deepEqual(f.commands,[]);
    const s=await f.control.request('exhaust','OPEN');assert.equal(s.acknowledged,true);assert.deepEqual(f.commands,['OPEN']);await f.control.stop();
    assert.equal(f.commands[f.commands.length-1],'OEM','quitting hands the flap back to the DME');
});
test('a DME that is not reachable at startup keeps the controls armed and is detected later',async()=>{
    const f=fixture({offline:true});await f.control.start();assert.equal(f.control.armed,true);assert.equal(f.control.ready,false);
    f.availability(true);await f.control.queue;assert.equal(f.control.ready,true);assert.deepEqual(f.commands,[]);await f.control.stop();
});
test('emulator and demo force simulated controls even when vehicle mode is selected',async()=>{
    for(const opts of [{emulator:true},{demo:true}]){const f=fixture(opts);await f.control.start();
        for(const [id,value] of [['exhaust','OPEN'],['asd',true],['startStop',true],['ambientHardware',4]]){
            const s=await f.control.request(id,value);assert.equal(s.source,'simulation');assert.equal(s.actual,value);
        }
        assert.deepEqual(f.commands,[]);assert.deepEqual(f.writes,[]);await assert.rejects(f.control.arm(),/desktop emulator/);await f.control.stop();
    }
});
test('armed stock flap preserves acceptance versus unknown physical state and OEM disarm',async()=>{
    const f=fixture();await f.control.arm();assert.deepEqual(f.commands,[]);
    const s=await f.control.request('exhaust','OPEN');assert.equal(s.acknowledged,true);assert.equal(s.actual,null);assert.equal(s.readback,null);
    await f.control.disarm();assert.deepEqual(f.commands,['OPEN','OEM']);assert.equal(f.control.armed,false);await f.control.stop();
});
test('Close rejects mock or stale RPM, and returns to OEM when fresh RPM is lost',async()=>{
    const f=fixture();await f.control.arm();f.store.put('rpm',800,'mock');await f.control.request('exhaust','CLOSED');assert.deepEqual(f.commands,['OEM']);
    f.store.put('rpm',800,'mgu');await f.control.request('exhaust','CLOSED');assert.equal(f.commands[f.commands.length-1],'CLOSED');
    f.advance(3001);await f.control.auto.tick();assert.equal(f.commands[f.commands.length-1],'OEM');assert.equal(f.control.auto.desired,'OEM');await f.control.stop();
});
test('Close hands back above RPM limit and resumes below hysteresis',async()=>{
    const f=fixture();await f.control.arm();f.store.put('rpm',800,'mgu');await f.control.request('exhaust','CLOSED');
    f.store.put('rpm',4500,'mgu');await f.control.auto.tick();assert.equal(f.commands[f.commands.length-1],'OEM');
    f.store.put('rpm',3000,'mgu');await f.control.auto.tick();assert.equal(f.commands[f.commands.length-1],'CLOSED');await f.control.stop();
});
test('unsupported DME never silently simulates; stock ASD/start-stop never send',async()=>{
    const f=fixture({unsupported:true});await f.control.arm();await assert.rejects(f.control.request('exhaust','OPEN'),/No supported/);
    for(const id of ['asd','startStop']){await assert.rejects(f.control.request(id,true));assert.equal(f.control.getState(id).actual,null);}
    assert.deepEqual(f.commands,[]);assert.deepEqual(f.writes,[]);await f.control.stop();
});
test('flap blocking reason survives periodic status refresh',async()=>{
    const f=fixture({unsupported:true});await f.control.arm();f.control.sync();
    assert.match(f.control.getState('exhaust').error,/No supported/);
    await assert.rejects(f.control.request('exhaust','OPEN'),/No supported/);f.control.sync();
    assert.match(f.control.getState('exhaust').error,/No supported/);await f.control.stop();
});
test('late diagnostic availability re-detects read-only, then allows an explicit command',async()=>{
    const f=fixture({offline:true});await f.control.arm();assert.equal(f.control.ready,false);
    assert.match(f.control.getState('exhaust').error,/Diagnostic link/);
    f.availability(true);await f.control.queue;assert.equal(f.control.ready,true);assert.deepEqual(f.commands,[]);
    await f.control.request('exhaust','OPEN');assert.deepEqual(f.commands,['OPEN']);await f.control.stop();
});
test('disconnect cancels previous override and reconnect does not replay it',async()=>{
    const f=fixture();await f.control.arm();await f.control.request('exhaust','OPEN');
    f.availability(false);assert.equal(f.control.ready,false);assert.equal(f.control.auto.desired,'OEM');
    f.availability(true);await f.control.queue;await f.control.auto.tick();assert.deepEqual(f.commands,['OPEN']);await f.control.stop();
});
test('ambient setter uses upstream unfilled fields, confirms only matching status and rate limits',async()=>{
    const f=fixture();await f.control.arm();f.status(1);const s=await f.control.request('ambientHardware',3);
    assert.equal(s.acknowledged,true);assert.equal(s.pending,true);assert.equal(s.actual,1);assert.equal(s.readback,null);
    assert.equal(f.writes[0].v.controlMenuAmbientePanoramicRoofInteriorLighting,'FARBAUSWAHL_3');
    assert.equal(f.writes[0].v.controlModeAmbientePanoramicRoofInteriorLighting,'SIGNAL_UNBEFUELLT');
    f.status(3);assert.equal(f.control.getState('ambientHardware').pending,false);assert.equal(f.control.getState('ambientHardware').readback,3);
    await assert.rejects(f.control.request('ambientHardware',4),/1.5/);assert.equal(f.writes.length,1);assert.equal(f.control.getState('ambientHardware').desired,3);await f.control.stop();
});
test('ambient failures do not report acceptance or overwrite actual colour',async()=>{
    const f=fixture({failSet:true});await f.control.arm();f.status(2);await assert.rejects(f.control.request('ambientHardware',4),/setter failed/);
    const s=f.control.getState('ambientHardware');assert.equal(s.acknowledged,false);assert.equal(s.actual,2);assert.equal(s.pending,false);await f.control.stop();
});
test('switching to simulation disarms, returns OEM and clears real state',async()=>{
    const f=fixture();await f.control.arm();await f.control.request('exhaust','OPEN');f.values.controlMode='simulation';await f.control.settingsChanged('controlMode');
    assert.equal(f.control.armed,false);assert.equal(f.commands[f.commands.length-1],'OEM');assert.equal(f.control.getState('exhaust').actual,null);await f.control.stop();
});
test('stock adapter uses the upstream MG1 commands and rejects unarmed requests',async()=>{
    const {Mg1ElAgk}=load('ec_real_adapters'),sent=[];
    const link={sendToDme:async(sid,data)=>{sent.push([sid].concat(data));return {ok:true};}};
    Mg1ElAgk.armed=false;await assert.rejects(Mg1ElAgk.open(link),/not armed/);assert.deepEqual(sent,[]);
    assert.equal(Mg1ElAgk.match({elAgk:{supported:false}}),false);
    try{Mg1ElAgk.armed=true;await Mg1ElAgk.open(link);await Mg1ElAgk.closed(link);await Mg1ElAgk.oem(link);
        assert.deepEqual(sent,[[0x2f,0x60,0xfd,3,3,0xe8],[0x2f,0x60,0xfd,3,0x23,0x28],[0x2f,0x60,0xfd,0]]);
    }finally{Mg1ElAgk.armed=false;}
});
