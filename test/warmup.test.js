'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../apps/ahg_control_center/model'),{WarmUp}=require('../apps/ahg_control_center/warmup');
function w_lim(f){f.store.put('oil',40,'mgu');return f.w.limit();}
function fixture(){let now=1e9;const store=new M.SignalStore(()=>now),vals={warmOil:80,warmCoolant:80,warmGearbox:60,coldLimit:3500,redline:6500};
    return {store,w:new WarmUp(store,{get:(k)=>vals[k]},{now:()=>now}),tick:(ms)=>{now+=ms;},vals};}
test('safe rev limit climbs from the cold limit at 30 °C to the redline at warm oil',()=>{
    const {w}=fixture();assert.equal(w.limit(null),null);assert.equal(w.limit(20),3500);assert.equal(w.limit(30),3500);
    assert.equal(w.limit(55),5000);assert.equal(w.limit(80),6500);assert.equal(w.limit(95),6500);
});
test('cold over-rev is flagged above the safe limit only while cold, counted once per excursion',()=>{
    const f=fixture();const put=(oil,rpm)=>{f.store.put('oil',oil,'mgu');f.store.put('rpm',rpm,'mgu');f.tick(200);return f.w.update();};
    assert.equal(w_lim(f),4100);assert.equal(put(40,3000),false);assert.equal(put(40,4200),false,'inside the 100 rpm margin');assert.equal(put(40,4300),true);assert.equal(put(40,4500),true);assert.equal(f.w.overCount,1);assert.equal(f.w.overPeak,4500);
    assert.equal(put(40,3000),false);assert.equal(put(40,4400),true);assert.equal(f.w.overCount,2);
    assert.equal(put(85,6000),false,'warm: no warning');
});
test('ready-in estimate uses the measured warm-up rate, engine off for a hybrid driving electric',()=>{
    const f=fixture();
    for(let i=0;i<40;i++){f.tick(5000);f.store.put('oil',40+i*0.5,'mgu');f.store.put('rpm',1500,'mgu');f.store.put('speed',50,'mgu');f.w.update();} // 6 °C/min
    f.store.put('oil',59.5,'mgu');f.store.put('rpm',1500,'mgu');f.store.put('speed',50,'mgu');
    const e=f.w.eta('oil');assert.equal(e.state,'warming');assert.ok(Math.abs(e.rate-6)<0.3,String(e.rate));assert.ok(Math.abs(e.min-(80-59.5)/6)<0.3,String(e.min));
    f.store.put('rpm',0,'mgu');assert.equal(f.w.eta('oil').state,'off');
    f.store.put('oil',82,'mgu');assert.equal(f.w.eta('oil').state,'ready');
});
