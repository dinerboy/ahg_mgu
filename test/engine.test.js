'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../apps/ahg_control_center/model');
const load=require('./load-app');
const E=load('engine'),{HybridReader}=load('hybrid'),{HealthMonitor,MisfireAlert,AmbientWarn}=load('health');
const {DidReader}=require('../kit/runtime/dids');
const {check}=require('../kit/runtime/readonly-diag');
const hex=(b)=>b.toString(16).toUpperCase().padStart(2,'0');

// a DME with 4 cylinders: OBD 06 MID A0 lists A1..A5, MID A2..A5 give test 0C (this cycle) and 0B
function dme(counts,extra){
    return {available:true,cancel(){},sent:[],physical:async function(ecu,sid,data,ms,accept){
        this.sent.push([ecu,sid].concat(data));
        let u=null;
        if(ecu===0x12&&sid===0x06){const mid=data[0];
            if(mid===0xA0)u=[0x46,0xA0,0x01,0x00,0x7C,0x00,0x00,0x00,0x00,0x00,0x00];   // bits: A2..A6 -> 0x7C in byte 2 counts A9..; see below
            else if(mid>=0xA2&&mid<0xA2+counts.length){const n=counts[mid-0xA2];u=[0x46,mid,0x0B,0x24,0,1,0,0,0xff,0xff,mid,0x0C,0x24,n>>8,n&255,0,0,0xff,0xff];}
            else u=[0x7F,0x06,0x31];}
        else if(extra){const d=extra[ecu+':'+data.map(hex).join('')];if(d)u=[sid+0x40].concat(data,d);}
        if(!u)u=[0x7F,sid,0x31];
        if(accept)assert.ok(accept(u),'accepted '+u);
        return u;}};
}
test('read-only link passes OBD 06 monitor requests only when opened for monitors',()=>{
    assert.throws(()=>check(0x12,0x06,[0xA2],false));
    assert.doesNotThrow(()=>check(0x12,0x06,[0xA2],false,true));
    assert.throws(()=>check(0x12,0x2F,[0x60,0xFD,0x03],false,true),'still no I/O control');
    assert.throws(()=>check(0x12,0x06,[0xA2,0x0C],false,true),'one MID');
});
test('misfire reader counts cylinders from the monitor list and reads test 0C',async()=>{
    const link=dme([0,2,61,0]);link.physical=link.physical.bind(link);
    // MID A0 bit map: byte0 bit 0x40 = A2 .. : make A2..A5 supported
    const rd=new DidReader(link,{ecu:0x12});
    const real=link.physical;link.physical=async(ecu,sid,data,ms,acc)=>sid===0x06&&data[0]===0xA0?[0x46,0xA0,0x78,0,0,0]:real(ecu,sid,data,ms,acc);
    const m=new E.MisfireReader(rd,{info(){}});
    assert.deepEqual(await m.read(),[0,2,61,0]);
    assert.equal(m.cyl,4);assert.equal(m.mode,false);assert.equal(m.total(),63);assert.equal(m.level(),'warn');
    assert.equal(E.misfireLevel([0,1,0,0]),'ok');assert.equal(E.misfireLevel([200,200,150,0]),'crit');
});
test('engine values: IAT, fuel, timing, load and boost target vs actual, read-only',async()=>{
    const store=new M.SignalStore();
    const link=dme([0,0,0,0],{'18:F40F':[0x4B],'18:F423':[0x07,0xD0],'18:F40A':[0xAA],'18:F40E':[0x94],'18:5813':[0x64],'18:480C':[0x0D,0x55],
        '18:4AB0':[0x7D,0x00],'18:580B':[0x78,0x00],'18:F433':[100]});
    const h=new HybridReader({signals:{},log:{warn(){},info(){}}},store,{link,focus:()=>true});await h.start();h.stop();h.stopped=false;await h.tick();h.stop();
    link.sent.forEach((r)=>assert.ok([0x22,0x01,0x06].indexOf(r[1])>=0,'read-only: '+r));
    assert.equal(store.get('iat').value,35);assert.equal(store.get('hpfp').value,200);
    assert.ok(Math.abs(store.get('lpfp').value-5.1)<1e-9);assert.equal(store.get('timing').value,10);
    assert.equal(store.get('load').value,75);assert.ok(Math.abs(store.get('load_target').value-80.0)<0.1);
    assert.ok(Math.abs(store.get('boost_target').value-0.25)<1e-9,String(store.get('boost_target').value));
    assert.ok(Math.abs(store.get('boost_actual').value-0.2)<1e-9);
});
test('health report: pass, attention and no data from what was seen',()=>{
    let t=1000;const store=new M.SignalStore(()=>t),hm=new HealthMonitor(store,{now:()=>t});
    const put=(o)=>Object.keys(o).forEach((k)=>store.put(k,o[k],'mgu'));
    assert.equal(hm.report().result,'nodata');
    for(let i=0;i<20;i++){t+=200;put({rpm:4000,boost_target:1.2,boost_actual:i<10?1.15:0.8,hpfp:250,lpfp:5.2,voltage:14.1,oil:95,coolant:90});hm.sample();}
    hm.setMisfire([0,0,3,0],'ok');
    const r=hm.report();
    const by=(id)=>r.items.find((x)=>x.id===id);
    assert.equal(by('boost').status,'attention','0.4 bar under target');assert.equal(by('hpfp').status,'pass');assert.equal(by('lpfp').status,'pass');
    assert.equal(by('v12').status,'pass');assert.equal(by('misfire').status,'pass');assert.equal(by('hv').status,'nodata');
    assert.equal(r.result,'attention');assert.equal(r.attention,1);
});
test('misfire alert warns once per cylinder and once on critical',()=>{
    const a=new MisfireAlert();
    assert.equal(a.update([0,1,0,0],'ok'),null);
    assert.match(a.update([0,1,55,0],'warn'),/cylinder 3/);
    assert.equal(a.update([0,1,58,0],'warn'),null);
    assert.match(a.update([300,1,250,0],'crit'),/MISFIRES/);
});
test('ambient warning: warn slot on a cold over-rev, the driver colour back after, at most every 1.5 s',async()=>{
    let t=0;const sent=[];
    const state={actual:3};
    const controls={lastColour:-Infinity,getState:()=>({actual:state.actual}),request:async(id,slot)=>{sent.push(slot);controls.lastColour=t;state.actual=slot;return {};}};
    const warm={over:false,ready:()=>false,live:(k)=>k==='rpm'?3000:40};
    const set={ambientWarn:'on',warnSlot:2,readySlot:5};
    const aw=new AmbientWarn(controls,(k)=>set[k],warm,null,()=>t);
    await aw.tick();assert.deepEqual(sent,[]);
    warm.over=true;t=100;await aw.tick();assert.deepEqual(sent,[2]);
    t=200;await aw.tick();assert.deepEqual(sent,[2],'no repeat');
    warm.over=false;t=1000;await aw.tick();assert.deepEqual(sent,[2],'held for a moment');
    t=3000;await aw.tick();assert.deepEqual(sent,[2,3],'driver colour back');
    // warm-up done with the engine running: a short flash of the ready slot
    warm.ready=()=>true;warm.live=(k)=>k==='rpm'?1500:85;t=5000;await aw.tick();assert.deepEqual(sent,[2,3,5]);
    t=12000;await aw.tick();assert.deepEqual(sent,[2,3,5,3]);
    set.ambientWarn='off';warm.over=true;t=20000;await aw.tick();assert.deepEqual(sent,[2,3,5,3],'off: nothing sent');
});
