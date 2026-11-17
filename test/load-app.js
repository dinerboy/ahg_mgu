'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/ahg_control_center'),loaded={};
function loadApp(name){
    if(loaded[name])return loaded[name].exports;
    const module={exports:{}};loaded[name]=module;
    const local=(request)=>request.indexOf('./kit/')===0?require(path.join(root,'kit/runtime',request.slice(6))):request.indexOf('./')===0?loadApp(request.slice(2)):require(request);
    new Function('require','module','exports','__dirname',fs.readFileSync(path.join(app,name+'.js'),'utf8'))(local,module,module.exports,app);
    return module.exports;
}
module.exports=loadApp;
