'use strict';
// AHG Digital Garage: pages, service book, fault scan (read only), manifest.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),os=require('os');
const load=require('./load-dg');
const {Recorder}=require('../kit/runtime/record');
const app=path.resolve(__dirname,'../apps/ahg_digital_garage');
const V=load('view'),T=load('theme'),{ServiceBook,DAY}=load('book'),{summarise,REQUEST,FaultScanner}=load('faults'),H=load('health');
const {fixture}=load.fixtureModule();

for(const empty of [false,true])for(let page=0;page<8;page++)test('page '+V.PAGES[page][0]+' ('+(empty?'no data':'demo')+') records with targets inside the safe area',async()=>{
    const a=await fixture({empty});a.page=page;T.setAccent('red');
    const cv=new Recorder(1600,520);V.draw(cv,a);
    assert.ok(cv.words().length>100);
    for(const t of cv.targets)assert.ok(t.x>=12&&t.y>=38&&t.x+t.w<=1588&&t.y+t.h<=477,V.PAGES[page][0]+' '+JSON.stringify({key:t.key,x:t.x,y:t.y,w:t.w,h:t.h}));
    const keys=cv.targets.map((t)=>t.key);assert.equal(new Set(keys).size,keys.length,'unique target keys');
    for(let i=0;i<8;i++)assert.ok(keys.indexOf('nav-'+i)>=0);
});
test('every target runs without throwing (all pages, demo)',async()=>{
    const a=await fixture();
    for(let page=0;page<8;page++){a.page=page;const cv=new Recorder(1600,520);V.draw(cv,a);
        for(const t of cv.targets){if(t.key.indexOf('nav-')===0)continue;a.page=page;t.run();}}
});
test('app sources parse as ECMAScript 2017 (Node 8 on the car)',()=>{
    const acorn=require('acorn');
    fs.readdirSync(app).filter((f)=>f.endsWith('.js')).forEach((f)=>acorn.parse(fs.readFileSync(path.join(app,f),'utf8'),{ecmaVersion:2017,sourceType:'script'}));
});
test('manifest: nothing writable, only the diagnostic request method, demo off by default',()=>{
    const spec=require('../apps/ahg_digital_garage/app.json');
    Object.values(spec.signals).forEach((fields)=>Object.keys(fields).forEach((k)=>{if(k[0]!=='_')assert.notEqual(fields[k],'w',k);}));
    assert.deepEqual(spec.signals['com.harman.infotainment.systemfunctions.tasu.tasu.InternalTasu']._methods,['sendTasuRequest']);
    assert.equal(spec.settings.find((s)=>s.key==='demo').default,'off');
    assert.equal(spec.id,'ahg_digital_garage');assert.ok(fs.existsSync(path.join(app,'icon.png')));
});

test('service book: due by distance or time, whichever comes first',()=>{
    let now=Date.UTC(2026,0,1);const b=new ServiceBook(null,{now:()=>now});
    assert.equal(b.state(b.item('oil')).status,'unknown');
    b.setManualKm(50000);b.markDone('oil');
    let s=b.state(b.item('oil'));assert.equal(s.status,'ok');assert.equal(s.kmLeft,15000);assert.ok(s.daysLeft>=364);
    b.addDistance(14000);s=b.state(b.item('oil'));assert.equal(s.status,'soon');assert.equal(s.kmLeft,1000);
    b.addDistance(1500);assert.equal(b.state(b.item('oil')).status,'due');
    b.markDone('oil');now+=380*DAY;s=b.state(b.item('oil'));assert.equal(s.status,'due');assert.ok(s.daysLeft<0);
    assert.equal(b.records[0].type,'service');
});
test('service book: the next item is the soonest, adjust stays in range, toggles',()=>{
    const b=new ServiceBook(null);b.seedDemo();
    assert.equal(b.next().item.id,'oil');assert.equal(b.next().s.kmLeft,4800);assert.equal(b.next().s.daysLeft,167);
    b.adjust('oil','km',-100000);assert.equal(b.item('oil').km,0);b.adjust('oil','months',-50);assert.equal(b.item('oil').months,0);
    assert.equal(b.state(b.item('oil')).status,'unknown');
    b.toggleItem('brakes');assert.equal(b.state(b.item('brakes')).status,'off');
    const r=b.toggleMod('wheels');assert.equal(r.text,'Wheels & Tyres fitted');assert.equal(b.mods.find((m)=>m.id==='wheels').km,72418);
});
test('service book: a car reading wins, distance only moves an estimate on',()=>{
    const b=new ServiceBook(null);b.addDistance(5);assert.equal(b.km(),null);
    b.setCarKm(1000);b.addDistance(2);assert.equal(b.km(),1002);assert.equal(b.odometer.source,'estimated');
    assert.equal(b.setCarKm(-1),false);b.setCarKm(1010);assert.equal(b.odometer.source,'car');
});
test('service book: saved and loaded again (atomic file in the data folder)',()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dg-'));
    const b=new ServiceBook(dir);b.setManualKm(12345);b.markDone('cabin_filter');b.toggleMod('tint');assert.ok(b.save());
    const c=new ServiceBook(dir);assert.equal(c.km(),12345);assert.equal(c.item('cabin_filter').lastKm,12345);
    assert.ok(c.mods.find((m)=>m.id==='tint').fitted);assert.equal(c.records.length,3);assert.equal(c.items.length,b.items.length);
    fs.writeFileSync(path.join(dir,'garage.json'),'{broken');const d=new ServiceBook(dir);assert.ok(d.saveError);assert.equal(d.km(),null);
});

test('fault replies: units, faults, active vs stored, refusals',()=>{
    const r=summarise(new Map([[0x12,[0x59,0x02,0xFF,0x12,0x34,0x56,0x09]],[0x40,[0x59,0x02,0xFF,0x80,0x3A,0x13,0x08]],[0x60,[0x7F,0x19,0x22]],[0x29,[0x59,0x02,0xFF]]]),{'12:123456':'Test text'});
    assert.equal(r.units.length,4);assert.equal(r.active,1);assert.equal(r.stored,1);
    assert.equal(r.faults[0].code,'123456');assert.equal(r.faults[0].text,'Test text');assert.equal(r.faults[0].unit,'DME engine');
    assert.equal(r.units.find((u)=>u.address===0x60).refused,'conditions not correct');
});
test('the fault scan sends exactly one request: 19 02 to all units (nothing cleared or written)',async()=>{
    const sent=[];let onFrame=null;
    const signals={proxy:async()=>({}),on:async(p,name,fn)=>{onFrame=fn;},onAvailable:async(p,fn)=>fn(true),
        call:async(p,method,params)=>{sent.push({method,target:params.targetAddress,sid:params.serviceID,data:Array.from(params.udsData)});
            setTimeout(()=>{const frame=(ecu,uds)=>({udsResponse:Buffer.from([0,0,0,0,0,0,ecu,0,0].concat(uds)),errorCode:'NO_ERROR'});
                onFrame(frame(0x12,[0x59,0x02,0xFF,0x12,0x34,0x56,0x08]));onFrame(frame(0x40,[0x59,0x02,0xFF]));},10);
            return {TasuErrorEnum:'NO_ERROR'};}};
    const sc=new FaultScanner({signals,log:{info(){},warn(){},error(){}}},{idleMs:50});
    const r=await sc.scan();
    assert.deepEqual(sent,[{method:'sendTasuRequest',target:0xDF,sid:0x19,data:REQUEST.slice()}]);
    assert.equal(r.units.length,2);assert.equal(r.stored,1);assert.equal(r.active,0);
});
test('vehicle health: headline follows active faults, then overdue service',async()=>{
    const a=await fixture();let h=H.evaluate(a.book,a.live,a.scanner);
    assert.equal(h.headline,'No active faults');assert.equal(h.checks.find((c)=>c.id==='faults').status,'ok');
    a.book.addDistance(6000);h=H.evaluate(a.book,a.live,a.scanner);assert.equal(h.headline,'Service overdue');assert.equal(h.status,'due');
    a.scanner.result.active=2;h=H.evaluate(a.book,a.live,a.scanner);assert.equal(h.headline,'2 active faults');
});
test('due texts',()=>{
    assert.equal(V.leftText({status:'ok',kmLeft:4800,daysLeft:167}),'in 4,800 km · 167 days');
    assert.equal(V.leftText({status:'due',kmLeft:-250,daysLeft:null}),'250 km over');
    assert.equal(V.leftText({status:'unknown'}),'Not set');
});
