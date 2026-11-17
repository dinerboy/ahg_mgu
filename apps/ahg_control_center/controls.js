'use strict';
class UnsupportedControls {
    capabilities() { return {exhaust:false,asd:false,startStop:false,ambientHardware:false}; }
    getState(id) { return {id:id,supported:false,desired:null,pending:false,acknowledged:null,actual:null,error:'Not supported — no verified vehicle provider'}; }
    request(id,desired) { return Promise.reject(new Error(this.getState(id).error)); }
}
// Engine Config is an existing upstream implementation, not an absent SDK
// feature. V1 keeps its actuator modules and diagnostic permissions unloaded.
const engineConfigReference={appId:'live_adjustments',title:'Engine Config',version:'0.9.8',
    commit:'bf4b190f64fe50740657d926b5592070665d2408',
    files:['controller.js','real_adapters.js','adapters.js','diaglink.js','auto.js'],
    validation:'Upstream reports MG1/B48 testing; this G30 530e and DME configuration are unverified',active:false};
module.exports={UnsupportedControls,engineConfigReference};
