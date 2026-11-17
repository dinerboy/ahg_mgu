'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
test('SDK polling refreshes unchanged getter values and stops cleanly on shutdown',async()=>{
    let reads=0,delivered=0,interval,cleared=false,notify;
    const proxy={init:async()=>{},subscribeToAvailability:()=>{},subscribe:async(o)=>{notify=o.onReceive;},isAvailable:()=>true,
        getValue:async()=>{reads++;return {rpm:0};},shutdown:async()=>{}};
    const req=(name)=>name==='someip'?{buildProxy:async()=>proxy}:name==='fs'?{readFileSync:()=>JSON.stringify({fields:{rpm:{getter:true}}})}:require(name);
    const module={exports:{}};
    new Function('require','module','exports','__dirname','setInterval','clearInterval',fs.readFileSync(path.resolve(__dirname,'../kit/runtime/signals.js'),'utf8'))(
        req,module,module.exports,__dirname,(fn)=>{interval=fn;return 1;},()=>{cleared=true;});
    const sub=await module.exports.watch('test.rpm','1',{rpm:()=>delivered++},null,{pollMs:1000});
    await new Promise(setImmediate);assert.ok(reads>=1);const before=delivered;
    interval();await new Promise(setImmediate);await Promise.resolve();assert.ok(delivered>before,'steady zero RPM is re-read rather than going stale');
    await sub.shutdown();assert.equal(cleared,true);const after=delivered;
    interval();notify({rpm:1});await new Promise(setImmediate);assert.equal(delivered,after,'no callbacks or stale pollers after shutdown');
});
