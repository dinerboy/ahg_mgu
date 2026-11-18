'use strict';
const T=require('./theme'),M=require('./model'),Art=require('./art');
const {C,text,bold,card,button,lineIcon,wordmark}=T;
const PAGES=['Home','Controls','Drive','System'];
function pageLabel(a,i){return i===2&&a.demo?'Hybrid':PAGES[i];}
function field(a,k,d){return M.format(a.store.get(k),d);}
function withUnit(a,k,d,unit){const v=field(a,k,d);return v==='--'?v:v+' '+unit;}
function fit(s,n){s=String(s);return s.length>n?s.slice(0,n-3)+'...':s;}
// Split a sentence over at most `lines` lines of `n` characters.
function wrap(s,n,lines){
    const words=String(s).split(' '),out=[''];
    words.forEach((w)=>{const cur=out[out.length-1];if(cur&&(cur+' '+w).length>n)out.push(w);else out[out.length-1]=cur?cur+' '+w:w;});
    if(out.length>lines){out.length=lines;out[lines-1]=fit(out[lines-1]+' ...',n);}
    return out;
}
function icon(cv,name,x,y,size,color){lineIcon(cv,name,x,y,size,color);}
function duration(sec){if(!M.finite(sec))return '--';sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
    return h?h+' h '+(m<10?'0':'')+m+' min':m?m+' min '+(s<10?'0':'')+s+' s':s+' s';}
function clock(ms){const d=new Date(ms),p=(n)=>(n<10?'0':'')+n;return p(d.getDate())+'/'+p(d.getMonth()+1)+' '+p(d.getHours())+':'+p(d.getMinutes());}
function modeText(a){return a.controls.simulated?'SIMULATION · NO CAR WRITES':a.controls.armed?'VEHICLE CONTROLS · ARMED':'VEHICLE CONTROLS · DISARMED';}
function logState(a){return a.driveLog?a.driveLog.status():{state:'off',text:'Logging off'};}
function header(cv,a){
    cv.fillRect(12,38,1576,482,C.bg);
    for(let i=0;i<7;i++)cv.polyline([[184,415-i*9],[690,300-i*8],[1570,215-i*8]],1,'#ffffff05');
    wordmark(cv,30,77,0.72);text(cv,'CONTROL CENTER',29,98,11,C.muted);
    cv.line(158,48,158,470,1,'#333538');
    PAGES.forEach((label,i)=>{
        const y=111+i*87,on=i===a.page;
        if(on){cv.card(16,y-8,132,78,5,[[0,'#070708'],[0.45,'#2b0306'],[1,'#740006']]);cv.line(16,y-7,16,y+68,2,C.red);cv.line(18,y+68,146,y+68,1,C.red);}
        icon(cv,i===2?'hybrid':label.toLowerCase(),69,y+3,27,on?C.text:'#c9cccf');text(cv,pageLabel(a,i),82,y+54,18,C.text,'center');
        cv.target(16,y-8,132,78,()=>a.navigate(i),'nav-'+i,6);
    });
    bold(cv,'BMW 530e',870,65,19,C.text,'center');
    const toast=a.toast&&Date.now()<a.toastUntil;
    if(toast){cv.roundRect(950,44,620,30,6,'#2a2f35');text(cv,fit(a.toast,74),1560,65,14,C.text,'right');}
    else text(cv,modeText(a),1565,65,14,a.controls.armed?C.red:C.amber,'right');
    cv.line(174,477,1587,477,1,'#717477');
    const flap=a.controls.getState('exhaust'),log=logState(a);
    const entries=[
        ['Flap',flap.source==='simulation'?(flap.actual||'--')+' (sim)':!a.controls.armed?'Not armed':flap.readback||'Unknown'],
        ['Mode',field(a,'drive_mode')],
        ['Speed',withUnit(a,'speed',0,'km/h')],
        ['Oil',withUnit(a,'oil',0,'°C')],
        ['Trip',a.trip.known?a.trip.km.toFixed(1)+' km':'--'],
        ['Log',log.state==='rec'?'REC':log.state==='waiting'?'Ready':log.state==='off'?'Off':'Error']];
    entries.forEach((e,i)=>{const x=187+i*232;text(cv,e[0],x,505,14,C.muted);
        const color=i===5&&log.state==='rec'?C.red:i===5&&log.state==='error'?C.amber:C.text;
        if(i===5&&log.state==='rec')cv.circle(x+62,500,5,C.red);
        bold(cv,e[1],x+(i===5&&log.state==='rec'?74:62),505,16,color);if(i<5)cv.line(x+218,487,x+218,510,1,'#53565a');});
}
function home(cv,a,dt){
    const p=[[650,218,160],[1070,218,160],[407,375,85],[1314,375,85]];
    ['gauge1','gauge2','gauge3','gauge4'].forEach((slot,i)=>{
        const key=a.ctx.settings.get(slot),s=Object.assign({},M.DEFINITIONS[key]||M.DEFINITIONS.oil);
        if(key==='boost')s.max=a.ctx.settings.get('boostMax')||2;
        if(key==='oil')s.label='Oil Temp';if(key==='coolant')s.label='Coolant Temp';if(key==='voltage')s.label='Voltage (12 V)';
        if(key==='rpm')s.label='Engine';if(key==='speed')s.label='Speed';
        a.gauges.draw(cv,slot+'-'+key,s,a.store.get(key),p[i][0],p[i][1],p[i][2],dt);
    });
    wordmark(cv,716,431,1.8);text(cv,'AFTER HOURS GARAGE',858,453,15,C.text,'center');
}
function exhaustIcon(cv,x,y){
    cv.roundRect(x+4,y+5,34,34,9,'#e0e4e7');cv.roundRect(x+7,y+8,28,28,7,'#080a0b');
    cv.polyline([[x+28,y+5],[x+54,y+5],[x+65,y+15],[x+71,y+15]],2,C.text);
    cv.polyline([[x+28,y+39],[x+54,y+39],[x+65,y+30],[x+71,y+30]],2,C.text);
    cv.arc(x+75,y+23,9,11,0,360,C.text);cv.arc(x+97,y+23,9,11,0,360,C.text);
}
function toggle(cv,x,y,on,enabled){
    cv.roundRect(x,y,76,31,15,!enabled?'#1a1b1d':on?'#ae101b':'#292b2d');cv.circle(on?x+60:x+16,y+15,12,enabled?C.text:'#55595d');
}
function controls(cv,a){
    const control=a.controls,sim=control.simulated,flap=control.getState('exhaust'),asd=control.getState('asd'),ss=control.getState('startStop'),ambient=control.getState('ambientHardware');
    // Exhaust flap
    card(cv,184,85,1386,135);
    cv.clip(185,86,1384,133);Art.draw(cv,'exhaust',1120,78,450,150);cv.noclip();
    exhaustIcon(cv,215,118);bold(cv,'Exhaust Flap',357,117,24);
    [['Auto','OEM'],['Open','OPEN'],['Closed','CLOSED']].forEach((s,i)=>button(cv,s[0],357+i*262,130,250,46,()=>a.control('exhaust',s[1]),'flap-'+s[1],flap.desired===s[1]&&flap.acknowledged===true));
    button(cv,sim?'Simulation mode':control.busy?'Detecting...':control.armed?'Disarm / OEM':'Arm session',1180,98,372,42,sim?()=>a.settings():()=>a.armControls(),'arm-session',control.armed);
    if(!sim&&control.armed)button(cv,'Recheck DME',1180,150,372,42,()=>a.recheckControls(),'recheck-link');
    const flapLine=flap.error||(sim?'Simulation - state: '+(flap.actual||'not set')+'. Switch Control testing mode to Vehicle in Settings to use the car.':
        !control.armed?'Disarmed. Press Arm session, then pick a mode.':flap.pending?'Sending request...':flap.acknowledged==null?'Armed. Tap a mode or press the controller to send it.':
        'DME '+(flap.acknowledged?'accepted':'did not accept')+' · ECU read-back: '+(flap.readback||'Unknown'));
    wrap(flapLine,104,2).forEach((l,i)=>text(cv,l,357,195+i*19,15,flap.error?C.amber:C.text));
    // ASD + start-stop: only switchable in simulation; on a stock car they are shown as unavailable.
    card(cv,184,234,680,74);card(cv,882,234,688,74);
    icon(cv,'controls',207,256,30,C.text);bold(cv,'ASD',256,264,21);
    text(cv,sim?'Simulation: '+(asd.actual?'On':'Off'):'Not available on stock software',256,292,15,C.muted);
    toggle(cv,755,255,sim&&asd.actual,sim);if(sim)cv.target(744,244,100,57,()=>a.control('asd',!asd.desired),'asd-toggle',10);
    cv.arc(921,271,18,21,0,360,C.text);text(cv,'A',921,278,19,C.text,'center');bold(cv,'Start-Stop Memory',962,264,21);
    text(cv,sim?'Simulation: '+(ss.actual?'Remember':'Off'):'Not available on stock software',962,292,15,C.muted);
    toggle(cv,1467,255,sim&&ss.actual,sim);if(sim)cv.target(1456,244,100,57,()=>a.control('startStop',!ss.desired),'startstop-toggle',10);
    // Ambient lighting: on the car the highlighted preset is the one the car confirmed.
    card(cv,184,322,1386,86);icon(cv,'system',208,348,29,C.text);bold(cv,'Ambient Lighting',255,354,21);
    const ambientLine=sim?'Simulation · slot '+(ambient.actual||'--'):ambient.error?ambient.error:ambient.pending?'Sending slot '+ambient.desired+'...':ambient.actual?'Car reports slot '+ambient.actual:control.armed?'Waiting for car colour status':'Arm session to change colour';
    text(cv,fit(ambientLine,38),255,384,15,ambient.error?C.amber:C.muted);
    ['comfort','sport','night','custom'].forEach((p,i)=>{
        const x=611+i*235,slot=Number(a.ctx.settings.get('slot_'+p))||i+1;
        const on=sim?a.ctx.settings.get('profile')===p:ambient.actual===slot;
        button(cv,'',x,334,219,62,()=>a.setProfile(p),'profile-'+p,on);
        icon(cv,p==='night'?'hybrid':p==='custom'?'system':'controls',x+98,341,20,[C.blue,C.red,'#ce8de6',C.text][i]);
        text(cv,p[0].toUpperCase()+p.slice(1)+'  ·  '+slot,x+109,386,16,C.text,'center');
    });
    const logging=a.ctx.settings.get('logging')!=='off';
    const actions=[['Refresh Data',()=>a.refresh()],['View Logs',()=>{a.systemMode='logs';a.navigate(3);}],['Reset Trip',()=>a.resetTrip()],['Drive Logging: '+(logging?'On':'Off'),()=>a.toggleLogging()]];
    actions.forEach((entry,i)=>button(cv,entry[0],184+i*350,420,336,49,entry[1],'controls-'+i,i===3&&logging));
}
function metric(cv,label,value,unit,x,y,w,h,color){
    card(cv,x,y,w,h);text(cv,label,x+22,y+27,16,C.muted);bold(cv,value,x+22,y+h-16,28,color||C.text);text(cv,unit,x+w-18,y+h-18,15,C.muted,'right');
}
function hybrid(cv,a){
    const soc=a.store.get('hv_soc'),live=soc.quality==='live',cx=347,cy=188,r=95;
    card(cv,184,85,329,218);cv.circle(cx,cy,r+6,'#060708');cv.arc(cx,cy,r+3,r+6,0,360,'#a6acb1');
    cv.arc(cx,cy,r-13,r,0,360,'#414445');if(live)cv.arc(cx,cy,r-13,r,0,M.clamp(soc.value,0,100)*3.6,'#4bff41');
    bold(cv,live?M.format(soc,0)+'%':'--',cx,cy+4,40,C.text,'center');text(cv,'HV Battery',cx,cy+32,15,C.text,'center');text(cv,'DEMO',cx,cy+58,13,C.amber,'center');
    metric(cv,'Drive Source',field(a,'drive_source'),'',530,85,348,86,C.blue);
    metric(cv,'EV Range',field(a,'ev_range',0),'km',894,85,294,86);
    metric(cv,'Electric Power',field(a,'electric_kw',1),'kW',530,187,319,76);
    metric(cv,'Recuperation',field(a,'regen_kw',1),'kW',865,187,323,76,C.green);
    Art.draw(cv,'car',240,220,620,207);
    cv.line(395,396,760,396,2,C.blue);
    for(let i=0;i<6;i++)cv.card(550+i*18,384,16,25,2,[[0,'#8eeaff'],[0.45,'#258cd1'],[1,'#0b478d']]);
    for(let i=0;i<4;i++){const x=400+((a.elapsed*38+i*78)%320);cv.fill([[x,392],[x+8,396],[x,400]],'#5cc7fa');}
    text(cv,'Demo data - no hybrid signal source on the car yet',1188,425,14,C.amber,'right');
    card(cv,1204,85,366,93);bold(cv,'Trip (This App Session)',1223,115,20);text(cv,'DEMO readings',1223,150,15,C.muted);
    card(cv,1204,191,366,218);
    const rows=[['Distance',a.trip.known?a.trip.km.toFixed(1)+' km':'--'],['Consumption',field(a,'fuel',1)+' L/100 km'],['Electric share',field(a,'electric_share',0)+'%'],['Energy used',field(a,'energy_used',1)+' kWh']];
    rows.forEach((row,i)=>{text(cv,row[0],1223,226+i*49,16,C.text);bold(cv,row[1],1550,226+i*49,16,C.text,'right');if(i<3)cv.line(1219,241+i*49,1555,241+i*49,1,'#36393d');});
    card(cv,184,429,1386,40);icon(cv,'hybrid',200,439,19,C.text);
    text(cv,'Charging',237,455,15,C.text);text(cv,field(a,'charging'),355,455,15,C.text);
    text(cv,'Energy added',890,455,15,C.muted);text(cv,field(a,'charge_energy',1)+' kWh (demo)',1040,455,15,C.text);
}
// Real-data page: what the car actually provides plus the drive log.
function drive(cv,a){
    const log=a.driveLog,cur=log&&log.current?log.summary():null,st=logState(a);
    card(cv,184,85,560,384);bold(cv,'This Drive',207,120,22);
    const dot=st.state==='rec'?C.red:st.state==='error'||st.state==='full'?C.amber:C.muted;
    cv.circle(214,145,6,dot);text(cv,fit(st.text,52),228,151,15,dot===C.muted?C.muted:dot);
    const rows=[['Distance',a.trip.known?a.trip.km.toFixed(1)+' km'+(a.trip.partial?' (gaps)':''):'--'],
        ['Drive time',cur?duration(cur.durationS):'--'],['Top speed',cur&&cur.maxSpeed!=null?cur.maxSpeed+' km/h':'--'],
        ['Max RPM',cur&&cur.maxRpm?cur.maxRpm+' rpm':'--'],['Max oil temp',cur&&cur.maxOil!=null?cur.maxOil+' °C':'--'],
        ['Max coolant',cur&&cur.maxCoolant!=null?cur.maxCoolant+' °C':'--']];
    rows.forEach((r,i)=>{const y=192+i*35;text(cv,r[0],207,y,17,C.text);bold(cv,r[1],720,y,17,C.text,'right');if(i<5)cv.line(205,y+12,723,y+12,1,'#36393d');});
    const logging=a.ctx.settings.get('logging')!=='off';
    button(cv,'Save & New Drive',203,407,255,48,()=>a.newDrive(),'drive-new');
    button(cv,'Logging: '+(logging?'On':'Off'),470,407,255,48,()=>a.toggleLogging(),'drive-logging',logging);
    metric(cv,'Speed',field(a,'speed',0),'km/h',762,85,396,92);
    metric(cv,'Engine',field(a,'rpm',0),'rpm',1174,85,396,92);
    metric(cv,'Oil',field(a,'oil',0),'°C',762,190,396,92,a.store.get('oil').value>=125?C.red:null);
    metric(cv,'Coolant',field(a,'coolant',0),'°C',1174,190,396,92,a.store.get('coolant').value>=110?C.red:null);
    card(cv,762,296,808,173);bold(cv,'Recent Drives',785,328,20);
    const list=log?log.summaries.slice(0,3):[];
    if(!list.length)text(cv,'No saved drives yet. A drive is saved when you press Save & New Drive, or 10 min after live data stops.',785,365,15,C.muted);
    list.forEach((d,i)=>{const y=365+i*36;
        text(cv,clock(d.startedAt),785,y,16,C.text);text(cv,duration(d.durationS),925,y,16,C.text);
        text(cv,d.km.toFixed(1)+' km',1080,y,16,C.text);text(cv,'top '+(d.maxSpeed!=null?d.maxSpeed:'--')+' km/h',1180,y,16,C.muted);
        text(cv,'oil '+(d.maxOil!=null?d.maxOil:'--')+' °C',1550,y,16,C.muted,'right');if(i<2)cv.line(783,y+12,1550,y+12,1,'#36393d');});
}
function progress(cv,label,value,x,y,w){
    text(cv,label,x,y+16,16,C.text);cv.roundRect(x+100,y+4,w-185,12,6,'#343638');
    if(M.finite(value))cv.roundRect(x+100,y+4,Math.max(1,(w-185)*M.clamp(value,0,100)/100),12,6,'#45ed43');
    text(cv,M.finite(value)?Math.round(value)+'%':'--',x+w,y+16,16,C.text,'right');
}
function system(cv,a){
    const stats=a.diagnostics.update();card(cv,184,85,680,114);card(cv,882,85,688,114);
    const live=a.store.rows().filter((r)=>r.quality==='live'&&r.source==='mgu').length;
    const ok=live>0;
    cv.arc(229,141,23,26,0,360,ok?C.green:C.amber);text(cv,ok?'OK':'?',229,149,ok?18:27,ok?C.green:C.amber,'center');
    bold(cv,'Vehicle Data',280,127,22);text(cv,a.demo?'Demo data (synthetic)':ok?live+' live car signals':'No live car signals yet',280,162,18,ok?C.green:C.amber);
    bold(cv,a.emulator?'Host system (emulator)':'MGU System',905,112,19);
    progress(cv,'CPU',stats.cpu,905,122,633);progress(cv,'RAM',stats.ram,905,146,633);progress(cv,'Storage',stats.storage,905,170,633);
    card(cv,184,215,680,199);card(cv,882,215,688,199);
    if(a.systemMode==='signals'||a.systemMode==='logs'){
        const signals=a.systemMode==='signals',per=6;
        bold(cv,signals?'Signal Viewer':'App Log',205,246,20);
        const all=signals?a.store.rows().filter((r)=>r.quality!=='unsupported').map((r)=>fit(r.key,14)+'   '+M.format(r,1)+' '+r.unit+'   '+r.quality+(r.ageMs!=null?' · '+(r.ageMs/1000).toFixed(1)+' s':'')):a.diagnostics.entries.slice().reverse().map((s)=>s.slice(11,19)+' '+s.slice(25));
        const pages=Math.max(1,Math.ceil(all.length/per)),off=M.clamp(a.logOffset||0,0,pages-1);
        const lines=all.slice(off*per,off*per+per);
        if(!lines.length)text(cv,signals?'No signals received yet':'Log is empty',205,280,15,C.muted);
        lines.forEach((s,i)=>text(cv,fit(s,80),205,280+i*22,14,C.text));
        text(cv,(off+1)+' / '+pages,600,246,14,C.muted,'right');
        button(cv,'Newer',617,224,110,32,()=>{a.logOffset=Math.max(0,off-1);},'log-newer',false,off===0);
        button(cv,'Older',737,224,110,32,()=>{a.logOffset=Math.min(pages-1,off+1);},'log-older',false,off>=pages-1);
        button(cv,'Close',727,372,120,32,()=>{a.systemMode='overview';a.logOffset=0;},'overview');
    }else{
        bold(cv,'Service Status',205,247,20);
        const lst=logState(a);
        const rows=[['Vehicle signals',a.demo||a.emulator?'Demo':live?'Receiving':'Waiting',!!live],['Drive logging',lst.state==='rec'?'Recording':lst.state==='waiting'?'Ready':lst.state==='off'?'Off':'Error',lst.state==='rec'],
            ['Control interface',a.controls.simulated?'Simulation':a.controls.armed?'Armed':'Disarmed',a.controls.armed],['Hybrid data','No car source (demo only)',false],['App runtime','Running',true]];
        rows.forEach((r,i)=>{const y=282+i*27;cv.circle(212,y-5,5,r[2]?C.green:C.muted);text(cv,r[0],232,y,16,C.text);text(cv,r[1],841,y,16,r[2]?C.green:C.muted,'right');});
    }
    const storage=a.driveLog?a.driveLog.storage():{count:0,mb:0};
    const rows=[['App Version',a.ctx.spec&&a.ctx.spec.version?a.ctx.spec.version:'--'],['Saved drive logs',storage.count+(storage.count===1?' file · ':' files · ')+storage.mb.toFixed(1)+' MB'],['Last Launch',new Date(a.diagnostics.started).toISOString().slice(11,19)+' UTC'],['App Uptime',duration((Date.now()-a.diagnostics.started)/1000)]];
    rows.forEach((r,i)=>{const y=254+i*45;icon(cv,i===0?'system':'controls',903,y-16,18,C.text);text(cv,r[0],943,y,17,C.text);text(cv,r[1],1548,y,17,C.text,'right');if(i<3)cv.line(901,y+15,1551,y+15,1,'#35383b');});
    const actions=[['App Log',()=>{a.systemMode='logs';a.logOffset=0;}],['Signal Viewer',()=>{a.systemMode='signals';a.logOffset=0;}],['Export Diagnostics',()=>a.exportReport()],['Settings',()=>a.settings()]];
    actions.forEach((r,i)=>button(cv,r[0],184+i*350,425,336,44,r[1],'system-'+i));
}
function draw(cv,a,dt){header(cv,a);[home,controls,a.demo?hybrid:drive,system][a.page](cv,a,dt);}
module.exports={draw,PAGES,wrap,fit};
