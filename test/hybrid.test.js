'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const M=require('../apps/ahg_control_center/model'),{MguProvider}=require('../apps/ahg_control_center/telemetry');
const load=require('./load-app'),{HybridReader,EnergyTrip,driveSource}=load('hybrid');
test('drive source is derived from engine speed, battery power and speed',()=>{
    assert.equal(driveSource(null,5,50),null);
    assert.equal(driveSource(0,12,50),'Electric');assert.equal(driveSource(0,-8,50),'Recuperating');
    assert.equal(driveSource(2200,0,80),'Engine');assert.equal(driveSource(2200,20,80),'Hybrid boost');
    assert.equal(driveSource(0,-3.5,0),'Charging');assert.equal(driveSource(0,0.2,0),'Ready');
});
test('energy trip integrates used and recovered energy and the electric share',()=>{
    const t=new EnergyTrip();for(let i=0;i<=3600;i++)t.update(i<1800?10:-5,60,i<1800?0:2000,i*1000);
    assert.ok(Math.abs(t.usedKwh-5)<0.01,String(t.usedKwh));assert.ok(Math.abs(t.regenKwh-2.5)<0.01,String(t.regenKwh));
    assert.ok(Math.abs(t.share()-50)<0.1);
});
test('HV reader sends only 0x22 reads to the SME/DME and scales power, charge and 12 V',async()=>{
    const sent=[],store=new M.SignalStore();
    const reply={'7:DDB4':[0x89,0x80],'7:DD69':[0xff,0xff,0xf8,0x30],'7:DDBC':[0x02,0x9a],'18:F442':[0x36,0xb0]}; // 352.00 V, -20.00 A, 66.6 %, 14.0 V
    const link={available:true,physical:async(ecu,sid,data,ms,accept)=>{sent.push([ecu,sid].concat(data));
        const key=ecu+':'+data.map((b)=>b.toString(16).toUpperCase().padStart(2,'0')).join('');const d=reply[key];
        const u=d?[sid+0x40].concat(data,d):[0x7f,sid,0x31];assert.ok(accept(u));return u;},cancel(){}};
    const h=new HybridReader({signals:{},log:{warn(){},info(){}}},store,{link});await h.start();h.stop();h.stopped=false;await h.tick();h.stop();
    sent.forEach((r)=>assert.ok(r[1]===0x22||r[1]===0x01||r[1]===0x06,'read-only: '+r));
    assert.equal(store.get('hv_v').value,352);assert.ok(Math.abs(store.get('electric_kw').value-7.04)<1e-9);
    assert.ok(Math.abs(store.get('hv_soc').value-66.6)<1e-9);assert.ok(Math.abs(store.get('voltage').value-14)<1e-9);
});
test('boost comes from the sport display in the car pressure unit, 255 = no value',async()=>{
    const watchers={},store=new M.SignalStore();
    const ctx={signals:{watch:(iface,inst,handlers)=>{watchers[iface]=handlers;return Promise.resolve({shutdown(){}});}},log:{warn(){}}};
    const p=new MguProvider(ctx,store);p.start();await new Promise(setImmediate);
    const fes=watchers['de.bmw.infotainment.drivingexcitement.FES'];
    fes.statusSwitchDriveDynamicSport2({displayBoostPressure:0});assert.notEqual(store.get('boost').quality,'live','a constant 0 is not trusted');
    fes.statusSwitchDriveDynamicSport2({displayBoostPressure:85});assert.ok(Math.abs(store.get('boost').value-0.85)<1e-9);
    watchers['de.bmw.infotainment.vehicle.Vehicle'].statusNewCurrentUnitsStatusExt({unitOfMeasurementAirPressure:'PSI'});
    fes.statusSwitchDriveDynamicSport2({displayBoostPressure:123});assert.ok(Math.abs(store.get('boost').value-12.3/14.5038)<1e-9);
    fes.statusSwitchDriveDynamicSport2({displayBoostPressure:255});assert.ok(Math.abs(store.get('boost').value-12.3/14.5038)<1e-9,'255 = no value: keeps the last one');
    watchers['de.bmw.infotainment.drivingexcitement.Efficiencytainment2'].statusBatteryTemperature({list:[{actualValueTemperatureHighVoltageStorage:76}]});
    assert.equal(store.get('hv_temp').value,26);p.stop();
});
test('boost falls back to the DME: absolute charge pressure minus outside air pressure, read-only',async()=>{
    const sent=[],store=new M.SignalStore();
    const reply={'18:F470':[0x1f,0,0,0x10,0x80,0,0],'18:F433':[100]}; // 4224/32 = 132 kPa ; 100 kPa outside -> 0.32 bar
    const link={available:true,physical:async(ecu,sid,data,ms,accept)=>{sent.push([ecu,sid].concat(data));
        const key=ecu+':'+data.map((b)=>b.toString(16).toUpperCase().padStart(2,'0')).join('');const d=reply[key];
        return d?[sid+0x40].concat(data,d):[0x7f,sid,0x31];},cancel(){}};
    const h=new HybridReader({signals:{},log:{warn(){},info(){}}},store,{link});await h.start();h.stop();h.stopped=false;await h.tick();h.stop();
    sent.forEach((r)=>assert.ok(r[1]===0x22||r[1]===0x01||r[1]===0x06,'read-only: '+r));
    assert.ok(Math.abs(store.get('boost').value-0.32)<1e-9,String(store.get('boost').value));assert.match(store.get('boost').provenance,/F470/);
});
test('boost is read every cycle; slow reads go one per cycle and back off when the car never answers',async()=>{
    const sent=[],store=new M.SignalStore();
    // DME answers boost + baro; the SME (hybrid battery) never answers
    const reply={'18:F470':[0x1f,0,0,0x10,0x80,0,0],'18:F433':[100]};
    const link={available:true,physical:async(ecu,sid,data)=>{const key=ecu+':'+data.map((b)=>b.toString(16).toUpperCase().padStart(2,'0')).join('');sent.push(key);
        const d=reply[key];return d?[sid+0x40].concat(data,d):null;},cancel(){}};
    const h=new HybridReader({signals:{},log:{warn(){},info(){}}},store,{link});await h.start();h.stop();h.stopped=false;
    for(let i=0;i<40;i++){sent.length=0;
        h.tasks().forEach((t)=>{t.due-=1500;}); // 1.5 s pass per cycle
        await h.step();
        assert.ok(sent.filter((k)=>k==='18:F470').length>=1,'boost read every cycle (cycle '+i+')');
        assert.ok(sent.length<=4,'boost plus at most one slow task per cycle (cycle '+i+'): '+sent);
        assert.ok(sent.filter((k)=>k.indexOf('7:')===0).length<=4,'at most one slow task per cycle');}
    const hv=h.tasks().find((t)=>t.name==='hv');assert.ok(hv.fails>=1);assert.ok(hv.due-Date.now()>100000,'unanswered HV reads back off to 2 min');
    h.stop();assert.ok(Math.abs(store.get('boost').value-0.32)<1e-9);
});
