'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const base='../apps/ahg_control_center/';
const M=require(base+'model'),{convert,MockProvider,MguProvider}=require(base+'telemetry');
const {Trip}=require(base+'trip'),{validated,normalize}=require(base+'settings');
test('dial angles: negative and nonzero minima, exact endpoints and bounds',()=>{
    assert.equal(M.angle(-1,-1,2),140);assert.equal(M.angle(2,-1,2),400);assert.equal(M.angle(100,50,150),270);
    assert.equal(M.angle(-999,50,150),140);assert.equal(M.angle(999,50,150),400);
});
test('damping converges at irregular frame rates without overshoot',()=>{
    let v=-1;for(let i=0;i<100;i++){v=M.damp(v,2,[0.016,0.1,0.001,4][i%4]);assert.ok(v>=-1&&v<=2);}assert.ok(Math.abs(v-2)<0.0001);
    for(let i=0;i<100;i++){v=M.damp(v,-1,0.02);assert.ok(v>=-1&&v<=2);}assert.ok(Math.abs(v+1)<0.0001);
});
test('null, invalid and stale readings do not format as measurements',()=>{
    let now=100;const store=new M.SignalStore(()=>now);
    assert.equal(M.format(store.get('oil')),'--');store.put('oil',NaN,'mgu');assert.equal(store.get('oil').quality,'error');
    store.put('oil',97.7,'mgu');assert.equal(M.format(store.get('oil'),1),'97.7');now+=3001;
    assert.equal(store.get('oil').quality,'stale');assert.equal(M.format(store.get('oil'),1),'--');
});
test('boost requires contemporarily fresh, correctly sourced absolute and atmospheric pressure',()=>{
    const a={value:1.8,quality:'live',source:'mgu',unit:'bar abs'},b={value:1.01,quality:'live',source:'mgu',unit:'bar abs'};
    assert.ok(Math.abs(M.boostFrom(a,b)-0.79)<1e-9);assert.equal(M.boostFrom(a,null),null);
    assert.equal(M.boostFrom(a,Object.assign({},b,{quality:'stale'})),null);
    assert.equal(M.boostFrom(a,Object.assign({},b,{unit:'bar'})),null);
    assert.equal(M.boostFrom(a,Object.assign({},b,{source:'mock'})),null);
});
test('upstream raw conversions reject sentinels and impossible values',()=>{
    assert.equal(convert(16000,0.25,0,65535,0,12000),4000);
    assert.equal(convert(148,1,-48,255,-40,170),100);
    assert.equal(convert(6400,1/64,0,65535,0,400),100);
    assert.equal(convert(255,1,-48,255,-40,170),null);assert.equal(convert(65535,0.25,0,65535,0,12000),null);
    assert.equal(convert(undefined,1,0,255,0,100),null);
});
test('demo is deterministic and provenance remains synthetic',()=>{
    const a=new M.SignalStore(),b=new M.SignalStore();new MockProvider(a,10).sample(42);new MockProvider(b,10).sample(42);
    a.rows().forEach((r)=>{assert.equal(r.source,'mock');assert.equal(r.value,b.get(r.key).value);});
});
test('read-only MGU provider uses only known watchers, no demo fallback and shuts subscriptions down',async()=>{
    const watchers=[],store=new M.SignalStore();let closed=0;
    const ctx={signals:{watch:(iface,instance,handlers,log,options)=>{watchers.push({iface,instance,handlers,options});return Promise.resolve({shutdown:()=>{closed++;}});}},log:{warn:()=>{}}};
    const p=new MguProvider(ctx,store);p.start();await new Promise(setImmediate);
    assert.equal(watchers.length,6);watchers.forEach((w)=>assert.equal(w.options.pollMs,1000));assert.equal(store.get('boost').quality,'unsupported');assert.equal(store.get('rpm').quality,'unsupported');
    watchers[0].handlers.statusEngineSpeed2({actualValueRPMEngineCrankshaft:8000});assert.equal(store.get('rpm').value,2000);
    watchers[2].handlers.statusFESVehicleDynamicSwitchHMI({actualValueModeDrivingExperience:17});assert.equal(store.get('drive_mode').value,'Hybrid');
    p.stop();assert.equal(closed,6);watchers[0].handlers.statusEngineSpeed2({actualValueRPMEngineCrankshaft:4000});assert.equal(store.get('rpm').value,2000);
});
test('trip integrates received speed only and marks data gaps partial',()=>{
    const trip=new Trip();for(let i=0;i<=10;i++)trip.update({value:36,quality:'live'},i*100);
    assert.ok(Math.abs(trip.km-0.01)<1e-9);trip.update({value:null,quality:'stale'},1200);assert.equal(trip.partial,true);
    trip.update({value:36,quality:'live'},10000);assert.ok(Math.abs(trip.km-0.01)<1e-9);trip.reset();assert.equal(trip.known,false);
});
test('invalid saved settings revert to schema defaults',()=>{
    const schema=[{key:'mode',type:'choice',default:'off',options:[['off','Off'],['on','On']]},{key:'hz',type:'number',default:10,steps:[5,10,20]}];
    const values={mode:'auto',hz:1000000};normalize({get:(k)=>values[k],set:(k,v)=>{values[k]=v;}},schema);
    assert.deepEqual(values,{mode:'off',hz:10});assert.equal(validated(schema[0],'on'),'on');
});
