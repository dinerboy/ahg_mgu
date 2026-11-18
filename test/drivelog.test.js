'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const M=require('../apps/ahg_control_center/model'),{DriveLog}=require('../apps/ahg_control_center/drivelog');
function tmp(){return fs.mkdtempSync(path.join(os.tmpdir(),'ahg-log-'));}
test('drive log writes CSV only for live readings and saves a summary',()=>{
    let now=Date.UTC(2026,10,18,7,0,0);const store=new M.SignalStore(()=>now),dir=tmp(),log=new DriveLog(dir,{now:()=>now});
    log.sample(store);assert.equal(log.current,null,'no file without live data');
    for(let i=0;i<20;i++){now+=500;store.put('speed',72,'mgu');store.put('oil',90+i,'mgu');store.put('rpm',2000,'mgu');log.sample(store,{flap:'OPEN'});}
    assert.equal(log.status().state,'rec');const file=log.current.file;log.finish();
    const csv=fs.readFileSync(path.join(dir,'drive-logs',file),'utf8').trim().split('\n');
    assert.equal(csv[0],'time,elapsed_s,source,speed_kmh,rpm,oil_c,coolant_c,drive_mode,flap_readback');
    assert.equal(csv.length,21);assert.ok(csv[1].indexOf(',car,72.0,2000,90,,,OPEN')>0,csv[1]);
    const s=log.summaries[0];assert.equal(s.maxOil,109);assert.equal(s.maxSpeed,72);assert.equal(s.maxCoolant,null);assert.ok(Math.abs(s.km-0.19)<0.02,String(s.km));
    const again=new DriveLog(dir);assert.equal(again.summaries.length,1,'summaries persist');
});
test('drive log stays quiet when disabled and splits drives after a long gap',()=>{
    let now=0;const store=new M.SignalStore(()=>now),log=new DriveLog(tmp(),{now:()=>now});
    log.setEnabled(false);store.put('speed',50,'mgu');log.sample(store);assert.equal(log.current,null);assert.equal(log.status().state,'off');
    log.setEnabled(true);for(let i=0;i<6;i++){now+=1000;store.put('speed',50,'mgu');log.sample(store);}
    assert.ok(log.current);now+=11*60*1000;log.sample(store);assert.equal(log.current,null);assert.equal(log.summaries.length,1);
});
