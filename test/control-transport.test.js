'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-app'),{Controls}=load('controls'),{SignalStore}=load('model');
test('real Controller/DiagLink/Diag handle late TASU startup and exact flap request/reply flow',async()=>{
    let available,receive,percent=0;const sent=[];
    const ctx={settings:{get:(k)=>({controlMode:'vehicle',hold:'off',closeLimit:'4000'})[k]},log:{info:()=>{},warn:()=>{},error:()=>{}},signals:{
        proxy:async()=>({shutdown:async()=>{}}),on:async(p,n,fn)=>{receive=fn;},onAvailable:async(p,fn)=>{available=fn;fn(false);},
        watch:async()=>({proxy:null,shutdown:async()=>{}}),
        call:async(p,name,v)=>{
            const d=Array.from(v.udsData);sent.push([v.serviceID].concat(d));let uds;
            if(v.serviceID===0x22){const raw=d[0]===0x62&&d[1]===0xfd?[percent>>8,percent&255]:[0x0f,0x25,0x10];uds=[0x62].concat(d,raw);}
            else{percent=d[2]===0?0:(d[3]<<8)|d[4];uds=[0x6f].concat(d);}
            const header=[0,0,0,0,0,0,v.targetAddress,0,0];
            setImmediate(()=>receive({errorCode:'NO_ERROR',udsResponse:header.concat(uds)}));return 'NO_ERROR';
        }
    }};
    const c=new Controls(ctx,new SignalStore(),{demo:()=>false});
    try{
        await c.arm();assert.equal(c.ready,false);assert.equal(sent.length,0);
        c.sync();assert.match(c.getState('exhaust').error,/Diagnostic link/);
        available(true);await c.queue;assert.equal(c.ready,true);assert.ok(sent.every((r)=>r[0]===0x22),'reconnect only detects/reads');
        const result=await c.request('exhaust','OPEN');assert.equal(result.acknowledged,true);assert.equal(result.readback,'OPEN');assert.equal(result.actual,null);
        assert.deepEqual(sent.filter((r)=>r[0]===0x2f),[[0x2f,0x60,0xfd,3,3,0xe8]]);
    }finally{await c.stop();}
    assert.deepEqual(sent.filter((r)=>r[0]===0x2f).slice(-1)[0],[0x2f,0x60,0xfd,0]);
});
