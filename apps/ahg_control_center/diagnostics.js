'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
class Diagnostics {
    constructor(dataDir) {this.dataDir=dataDir;this.started=Date.now();this.entries=[];this.stats={cpu:null,ram:null,storage:null};this.last=0;this.cpu=null;}
    log(message) {this.entries.push(new Date().toISOString()+' '+String(message).replace(/[A-HJ-NPR-Z0-9]{17}/g,'[identifier]'));if(this.entries.length>100)this.entries.shift();}
    update() {
        if(Date.now()-this.last<2000)return this.stats;this.last=Date.now();
        try { const n=os.cpus().reduce((a,c)=>{Object.keys(c.times).forEach((k)=>{a.total+=c.times[k];});a.idle+=c.times.idle;return a;},{total:0,idle:0});
            if(this.cpu && n.total>this.cpu.total)this.stats.cpu=100*(1-(n.idle-this.cpu.idle)/(n.total-this.cpu.total));this.cpu=n;
            this.stats.ram=100*(1-os.freemem()/os.totalmem()); }catch(e){}
        try {if(typeof fs.statfsSync==='function'){const s=fs.statfsSync(this.dataDir);this.stats.storage=s.blocks?100*(1-s.bavail/s.blocks):null;}}catch(e){}
        return this.stats;
    }
    export(store) {
        const name='ahg-diagnostics.json';
        const report={app:'AHG Control Center',version:'1.0.0',created:new Date().toISOString(),emulator:process.env.AHG_EMULATOR==='1',
            node:process.version,uptimeSeconds:Math.floor((Date.now()-this.started)/1000),localSystem:this.update(),
            vehicleControls:'unsupported',faults:'Not scanned',signals:store.rows(),logs:this.entries};
        const target=path.join(this.dataDir,name);fs.writeFileSync(target+'.tmp',JSON.stringify(report,null,2));fs.renameSync(target+'.tmp',target);
        this.log('Diagnostic report saved locally');return name;
    }
}
module.exports={Diagnostics};
