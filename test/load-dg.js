'use strict';
// Load an AHG Digital Garage module the way the car does (./kit/x -> kit/runtime/x), without a build.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/ahg_digital_garage'),loaded={};
function load(name){
    if(loaded[name])return loaded[name].exports;
    const module={exports:{}};loaded[name]=module;
    const local=(request)=>request==='./kit/mgu'?{run(){throw new Error('Tests must not launch a vehicle app');}}:request.indexOf('./kit/')===0?require(path.join(root,'kit/runtime',request.slice(6))):request.indexOf('./')===0?load(request.slice(2)):require(request);
    new Function('require','module','exports','__dirname',fs.readFileSync(path.join(app,name+'.js'),'utf8'))(local,module,module.exports,app);
    return module.exports;
}
/** Test-only fixtures, never packaged with the app. */
function fixtureModule(){
    return {fixture:async(opts)=>{
        opts=opts||{};
        const {ServiceBook}=load('book'),{LiveData}=load('live'),{FaultScanner}=load('faults');
        const values={page:'garage',accent:'red',autoScan:'off'};
        const ctx={log:{info(){},warn(){},error(){}},spec:{version:'0.1.1'},settings:{get:(k)=>values[k],set:(k,v)=>{values[k]=v;}}};
        const book=new ServiceBook(null);if(!opts.empty)seedBook(book);
        const live=new LiveData(ctx);if(!opts.empty)Object.entries({speed:0,oil:88,coolant:90,v12:14.3,soc:84,fuel:73}).forEach(([k,v])=>live.put(k,v,'test fixture'));
        const scanner=new FaultScanner(ctx);if(!opts.empty){scanner.result=load('faults').summarise(fixtureReplies());scanner.result.at=Date.now();scanner.at=scanner.result.at;scanner.state='done';}
        const a={ctx,book,live,scanner,page:0,selected:'oil',faultPage:0,recordPage:0,odoEdit:null,toast:null,toastUntil:0,
            navigate(i){a.page=i;},settings(){},markDone(id){book.markDone(id);},toggleMod(id){book.toggleMod(id);},saveOdometer(){book.setManualKm(a.odoEdit);},scan(){}};
        return a;
    }};
}
function seedBook(book){
        const now=book.now(),odo=72418;book.data=book.fresh();const o=book.data.odometer;o.km=odo;o.at=now;o.source='car';
        const set=(id,kmAgo,daysAgo)=>{const i=book.item(id);i.lastKm=kmAgo==null?null:odo-kmAgo;i.lastAt=daysAgo==null?null:now-daysAgo*86400000;};
        set('oil',10200,198);set('brakes',22000,600);set('brake_fluid',null,500);set('air_filter',40200,900);set('cabin_filter',10200,198);
        set('spark_plugs',42000,1300);set('vehicle_check',10200,198);set('battery_12v',null,700);
        book.data.vehicle.vin='WBAJA91070C123400';
        ['exhaust','coding','tint'].forEach((id,k)=>{const m=book.data.mods.find((x)=>x.id===id);m.fitted=true;m.at=now-(300-k*90)*86400000;m.km=odo-12000+k*4000;});
        book.data.records=[{at:now-198*86400000,km:odo-10200,type:'service',text:'Engine Oil done',item:'oil'},
            {at:now-198*86400000,km:odo-10200,type:'service',text:'Cabin Filter done',item:'cabin_filter'},
            {at:now-210*86400000,km:odo-11000,type:'mod',text:'Coding fitted',mod:'coding'},
            {at:now-300*86400000,km:odo-12000,type:'mod',text:'Exhaust fitted',mod:'exhaust'}];
        book.dirty=false;
}
const fixtureReplies=()=>new Map([
    [0x12,[0x59,0x02,0xFF]],[0x40,[0x59,0x02,0xFF,0x80,0x3A,0x13,0x08]],[0x60,[0x59,0x02,0xFF]],
    [0x29,[0x59,0x02,0xFF]],[0x07,[0x59,0x02,0xFF]],[0x18,[0x59,0x02,0xFF]],[0x63,[0x59,0x02,0xFF,0xB7,0xF8,0x84,0x08]],
    [0x30,[0x59,0x02,0xFF]],[0x01,[0x59,0x02,0xFF]],[0x78,[0x59,0x02,0xFF]],[0x14,[0x59,0x02,0xFF]],[0x3A,[0x59,0x02,0xFF]]]);
load.seedBook=seedBook;
load.fixtureModule=fixtureModule;
module.exports=load;
