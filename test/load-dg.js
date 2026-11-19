'use strict';
// Load an AHG Digital Garage module the way the car does (./kit/x -> kit/runtime/x), without a build.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/ahg_digital_garage'),loaded={};
function load(name){
    if(loaded[name])return loaded[name].exports;
    const module={exports:{}};loaded[name]=module;
    const local=(request)=>request.indexOf('./kit/')===0?require(path.join(root,'kit/runtime',request.slice(6))):request.indexOf('./')===0?load(request.slice(2)):require(request);
    new Function('require','module','exports','__dirname',fs.readFileSync(path.join(app,name+'.js'),'utf8'))(local,module,module.exports,app);
    return module.exports;
}
/** a demo app state for drawing pages without the car (tests, screenshots) */
function fixtureModule(){
    return {fixture:async(opts)=>{
        opts=opts||{};
        const {ServiceBook}=load('book'),{LiveData}=load('live'),{FaultScanner}=load('faults');
        const values={page:'garage',accent:'red',demo:'on',autoScan:'off'};
        const ctx={log:{info(){},warn(){},error(){}},spec:{version:'0.1.0'},settings:{get:(k)=>values[k],set:(k,v)=>{values[k]=v;}}};
        const book=new ServiceBook(null);if(!opts.empty)book.seedDemo();
        const live=new LiveData(ctx,{demo:true});if(!opts.empty)live.sampleDemo();
        const scanner=new FaultScanner(ctx,{demo:true,demoMs:0});if(!opts.empty)await scanner.scan();
        const a={ctx,book,live,scanner,page:0,selected:'oil',faultPage:0,recordPage:0,odoEdit:null,toast:null,toastUntil:0,demo:true,
            navigate(i){a.page=i;},settings(){},markDone(id){book.markDone(id);},toggleMod(id){book.toggleMod(id);},saveOdometer(){book.setManualKm(a.odoEdit);},scan(){}};
        return a;
    }};
}
load.fixtureModule=fixtureModule;
module.exports=load;
