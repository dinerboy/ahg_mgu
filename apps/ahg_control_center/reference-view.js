'use strict';
const T=require('./theme'),M=require('./model'),Art=require('./art');
const {C,text,bold,card,button,lineIcon,wordmark}=T;
const PAGES=['Home','Controls','Hybrid','System'];
function field(a,k,d){return M.format(a.store.get(k),d);}
function icon(cv,name,x,y,size,color){lineIcon(cv,name,x,y,size,color);}
function header(cv,a){
    cv.fillRect(12,38,1576,482,C.bg);
    // Subtle swept highlights are independent of instruments and data.
    for(let i=0;i<7;i++)cv.polyline([[184,415-i*9],[690,300-i*8],[1570,215-i*8]],1,'#ffffff05');
    wordmark(cv,30,77,0.72);text(cv,'CONTROL CENTER',29,98,10,C.muted);
    cv.line(158,48,158,470,1,'#333538');
    PAGES.forEach((label,i)=>{
        const y=111+i*87,on=i===a.page;
        if(on){cv.card(16,y-8,132,78,5,[[0,'#070708'],[0.45,'#2b0306'],[1,'#740006']]);cv.line(16,y-7,16,y+68,2,C.red);cv.line(18,y+68,146,y+68,1,C.red);}
        icon(cv,label.toLowerCase(),69,y+3,27,on?C.text:'#c9cccf');text(cv,label,82,y+52,16,C.text,'center');
        cv.target(16,y-8,132,78,()=>a.navigate(i),'nav-'+i,6);
    });
    text(cv,'BMW 530e',880,63,17,C.text,'center');
    text(cv,a.demo?'DEMO · SYNTHETIC':a.emulator?'EMULATOR · NO CAR':'READ-ONLY',1565,63,12,a.demo||a.emulator?C.amber:C.muted,'right');
    cv.line(174,477,1587,477,1,'#717477');
    const entries=[['Flap','Unavailable'],['Mode',field(a,'drive_mode')],['Hybrid',field(a,'drive_source')],['HV',field(a,'hv_soc',0)+(a.demo?'%':'')],['EV range',field(a,'ev_range',0)+(a.demo?' km':'')],['Faults','Not scanned']];
    entries.forEach((e,i)=>{const x=187+i*232;text(cv,e[0]+':',x,505,13,C.muted);text(cv,e[1],x+68,505,14,C.text);if(i<5)cv.line(x+218,487,x+218,510,1,'#53565a');});
}
function home(cv,a,dt){
    const p=[[650,218,160],[1070,218,160],[407,375,85],[1314,375,85]];
    ['gauge1','gauge2','gauge3','gauge4'].forEach((slot,i)=>{
        const key=a.ctx.settings.get(slot),s=Object.assign({},M.DEFINITIONS[key]||M.DEFINITIONS.oil);
        if(key==='boost')s.max=a.ctx.settings.get('boostMax')||2;
        if(key==='oil')s.label='Oil Temp';if(key==='coolant')s.label='Coolant Temp';if(key==='voltage')s.label='Voltage (12 V)';
        a.gauges.draw(cv,slot+'-'+key,s,a.store.get(key),p[i][0],p[i][1],p[i][2],dt);
    });
    wordmark(cv,716,431,1.8);text(cv,'AFTER HOURS GARAGE',858,451,13,C.text,'center');
}
function exhaustIcon(cv,x,y){
    cv.roundRect(x+4,y+5,34,34,9,'#e0e4e7');cv.roundRect(x+7,y+8,28,28,7,'#080a0b');
    cv.polyline([[x+28,y+5],[x+54,y+5],[x+65,y+15],[x+71,y+15]],2,C.text);
    cv.polyline([[x+28,y+39],[x+54,y+39],[x+65,y+30],[x+71,y+30]],2,C.text);
    cv.arc(x+75,y+23,9,11,0,360,C.text);cv.arc(x+97,y+23,9,11,0,360,C.text);
}
function controls(cv,a){
    card(cv,184,85,1386,121);
    cv.clip(185,86,1384,119);Art.draw(cv,'exhaust',1120,78,450,150);cv.noclip();
    exhaustIcon(cv,215,121);bold(cv,'Exhaust Flap',357,117,23);
    ['Auto','Open','Closed'].forEach((s,i)=>button(cv,s,357+i*231,134,231,39,null,'flap-'+s,false,true));
    text(cv,'Engine Config integration not enabled in V1 · Actual position: Unknown',357,191,12,C.amber);
    card(cv,184,221,680,78);card(cv,882,221,688,78);
    icon(cv,'controls',207,244,30,C.text);bold(cv,'ASD',256,250,20);text(cv,'Active Sound · unavailable',256,278,13,C.muted);
    cv.roundRect(755,244,76,31,15,'#292b2d');cv.circle(771,259,12,'#898c90');
    cv.arc(921,259,18,21,0,360,C.text);text(cv,'A',921,266,19,C.text,'center');bold(cv,'Start-Stop Memory',962,250,20);
    text(cv,'UI placeholder · no ECU coding',962,278,13,C.muted);
    card(cv,184,315,1386,91);icon(cv,'system',208,341,29,C.text);bold(cv,'Ambient Lighting',255,345,20);text(cv,'Local app preset',255,375,14,C.muted);
    ['comfort','sport','night','custom'].forEach((p,i)=>{
        const x=611+i*235,on=a.ctx.settings.get('profile')===p;
        button(cv,'',x,330,219,61,()=>a.setProfile(p),'profile-'+p,on);
        icon(cv,p==='night'?'hybrid':p==='custom'?'system':'controls',x+98,338,20,[C.blue,C.red,'#ce8de6',C.text][i]);
        text(cv,p[0].toUpperCase()+p.slice(1),x+109,381,14,C.text,'center');
    });
    const actions=[['Refresh Data',()=>a.refresh()],['Open Logs',()=>{a.systemMode='logs';a.navigate(3);}],['Reset Session',()=>a.resetTrip()],['Display Mode: '+a.ctx.settings.get('displayMode'),()=>a.toggleDisplay()]];
    actions.forEach((entry,i)=>{const x=184+i*350;button(cv,'',x,424,336,45,entry[1],'controls-'+i);text(cv,entry[0],x+168,453,16,C.text,'center');});
}
function metric(cv,label,value,unit,x,y,w,h,color){
    card(cv,x,y,w,h);text(cv,label,x+22,y+25,16,C.text);bold(cv,value,x+22,y+h-16,25,color||C.text);text(cv,unit,x+w-18,y+h-17,13,C.muted,'right');
}
function hybrid(cv,a){
    const soc=a.store.get('hv_soc'),live=soc.quality==='live',cx=347,cy=188,r=95;
    card(cv,184,85,329,218);cv.circle(cx,cy,r+6,'#060708');cv.arc(cx,cy,r+3,r+6,0,360,'#a6acb1');
    cv.arc(cx,cy,r-13,r,0,360,'#414445');if(live)cv.arc(cx,cy,r-13,r,0,M.clamp(soc.value,0,100)*3.6,'#4bff41');
    bold(cv,live?M.format(soc,0)+'%':'--',cx,cy+4,40,C.text,'center');text(cv,'HV Battery',cx,cy+32,14,C.text,'center');text(cv,live?'DEMO':'Unavailable',cx,cy+58,11,C.amber,'center');
    metric(cv,'Drive Source',field(a,'drive_source'),'',530,85,348,86,C.blue);
    metric(cv,'EV Range',field(a,'ev_range',0),'km',894,85,294,86);
    metric(cv,'Electric Power',field(a,'electric_kw',1),'kW signed',530,187,319,76);
    metric(cv,'Recuperation',field(a,'regen_kw',1),'kW negative',865,187,323,76,C.green);
    Art.draw(cv,'car',240,220,620,207);
    if(a.demo){
        cv.line(395,396,760,396,2,C.blue);
        for(let i=0;i<6;i++)cv.card(550+i*18,384,16,25,2,[[0,'#8eeaff'],[0.45,'#258cd1'],[1,'#0b478d']]);
        for(let i=0;i<4;i++){const x=400+((a.elapsed*38+i*78)%320);cv.fill([[x,392],[x+8,396],[x,400]],'#5cc7fa');}
    }
    text(cv,'Illustration only',1020,417,11,C.muted,'center');
    card(cv,1204,85,366,93);bold(cv,'Trip (This App Session)',1223,113,19);
    text(cv,a.demo?'DEMO readings':'Measured sources only',1223,148,13,C.muted);
    card(cv,1204,191,366,218);
    const rows=[['Distance',a.trip.known?a.trip.km.toFixed(1)+' km':'--'],['Consumption',field(a,'fuel',1)+(a.demo?' L/100 km':'')],['Electric share',field(a,'electric_share',0)+(a.demo?'%':'')],['Energy used',field(a,'energy_used',1)+(a.demo?' kWh':'')]];
    rows.forEach((row,i)=>{text(cv,row[0],1223,224+i*49,14,C.text);text(cv,row[1],1550,224+i*49,15,C.text,'right');if(i<3)cv.line(1219,239+i*49,1555,239+i*49,1,'#36393d');});
    card(cv,184,429,1386,40);icon(cv,'hybrid',200,439,19,C.text);
    text(cv,'Charging',237,454,13,C.text);text(cv,field(a,'charging'),355,454,13,C.text);
    text(cv,'Energy added',890,454,12,C.muted);text(cv,field(a,'charge_energy',1)+(a.demo?' kWh (demo)':''),1060,454,14,C.text);
    text(cv,a.trip.partial?'Session coverage: partial':'No verified charge timing',1539,454,12,C.muted,'right');
}
function progress(cv,label,value,x,y,w){
    text(cv,label,x,y+16,15,C.text);cv.roundRect(x+100,y+4,w-185,12,6,'#343638');
    if(M.finite(value))cv.roundRect(x+100,y+4,Math.max(1,(w-185)*M.clamp(value,0,100)/100),12,6,'#45ed43');
    text(cv,M.finite(value)?Math.round(value)+'%':'--',x+w,y+16,15,C.text,'right');
}
function system(cv,a){
    const stats=a.diagnostics.update();card(cv,184,85,680,114);card(cv,882,85,688,114);
    cv.arc(229,141,23,26,0,360,C.amber);text(cv,'?',229,150,27,C.amber,'center');
    bold(cv,'Vehicle Status',280,125,22);text(cv,'Faults not scanned',280,159,18,C.amber);
    bold(cv,a.emulator?'Host system (emulator)':'MGU System',905,110,18);
    progress(cv,'CPU',stats.cpu,905,122,633);progress(cv,'RAM',stats.ram,905,146,633);progress(cv,'Storage',stats.storage,905,170,633);
    card(cv,184,215,680,199);card(cv,882,215,688,199);
    if(a.systemMode==='signals'||a.systemMode==='logs'){
        bold(cv,a.systemMode==='signals'?'Signal Viewer':'App Logs',205,244,20);
        const lines=a.systemMode==='signals'?a.store.rows().slice(a.signalOffset,a.signalOffset+5).map((r)=>r.key+'   '+M.format(r,1)+' '+r.unit+'   '+r.quality):a.diagnostics.entries.slice(-5);
        lines.forEach((s,i)=>text(cv,String(s).slice(0,67),205,274+i*25,13,C.text));
        button(cv,'Overview',727,224,116,28,()=>{a.systemMode='overview';},'overview');
        if(a.systemMode==='signals')cv.target(203,260,641,143,()=>{a.signalOffset=(a.signalOffset+5)%a.store.rows().length;},'more-signals',4);
    }else{
        bold(cv,'Service Status',205,245,19);
        const live=a.store.rows().filter((r)=>r.quality==='live'&&r.source==='mgu').length;
        const rows=[['Vehicle signals',a.demo||a.emulator?'Demo':live?'Receiving':'Waiting'],['Hybrid data',a.demo?'Demo':'Unavailable'],['Control interface','Not armed'],['App runtime','Running'],['Network / Internet','Not checked']];
        rows.forEach((r,i)=>{const y=276+i*27;cv.circle(212,y-5,4,i===3?C.green:C.muted);text(cv,r[0],232,y,14,C.text);text(cv,r[1],841,y,14,i===3?C.green:C.muted,'right');});
    }
    const rows=[['App Version','1.0.0'],['SDK Build','bf4b190f'],['Last Launch',new Date(a.diagnostics.started).toISOString().slice(11,19)+' UTC'],['App Uptime',Math.floor((Date.now()-a.diagnostics.started)/1000)+' sec']];
    rows.forEach((r,i)=>{const y=252+i*45;icon(cv,i===0?'system':'controls',903,y-16,18,C.text);text(cv,r[0],943,y,15,C.text);text(cv,r[1],1548,y,15,C.text,'right');if(i<3)cv.line(901,y+15,1551,y+15,1,'#35383b');});
    const actions=[['View Logs',()=>{a.systemMode='logs';}],['Signal Viewer',()=>{a.systemMode='signals';}],['Export Diagnostics',()=>a.exportReport()],['Settings',()=>a.settings()]];
    actions.forEach((r,i)=>button(cv,r[0],184+i*350,429,336,40,r[1],'system-'+i));
}
function draw(cv,a,dt){header(cv,a);[home,controls,hybrid,system][a.page](cv,a,dt);
    if(a.toast&&Date.now()<a.toastUntil){cv.roundRect(530,38,660,34,5,'#1e2328');text(cv,a.toast,860,61,13,C.text,'center');}}
module.exports={draw,PAGES};
