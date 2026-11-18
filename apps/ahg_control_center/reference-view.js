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
    if(toast){const msg=fit(a.toast,74),w=Math.min(620,msg.length*7.6+36);cv.roundRect(1570-w,44,w,30,15,'#3a3f45');cv.roundRect(1571-w,45,w-2,28,14,'#1b1f23');text(cv,msg,1552,64,14,C.text,'right');}
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
// Segmented control: one rounded track, the chosen segment filled in AHG red.
function segmented(cv,items,x,y,w,h){
    cv.roundRect(x,y,w,h,12,'#3b3f44');cv.roundRect(x+1,y+1,w-2,h-2,11,'#0b0d0f');
    const sw=(w-8)/items.length;
    items.forEach((it,i)=>{const sx=x+4+i*sw;
        if(it.selected){cv.card(sx,y+4,sw,h-8,9,[[0,'#b3141f'],[1,'#5c070d']]);cv.line(sx+14,y+5,sx+sw-14,y+5,1,'#ff8a8a66');}
        else if(it.pending){cv.roundRect(sx,y+4,sw,h-8,9,'#5c070d');cv.roundRect(sx+2,y+6,sw-4,h-12,8,'#0b0d0f');}
        else if(i>0&&!items[i-1].selected)cv.line(sx,y+14,sx,y+h-14,1,'#2e3236');
        bold(cv,it.label,sx+sw/2,y+h/2+7,19,it.selected?C.text:'#c9cdd1','center');
        cv.target(sx,y+4,sw,h-8,it.action,it.key,9);});
}
function chip(cv,label,x,y,color){
    const w=label.length*8.6+34;
    cv.roundRect(x,y,w,26,13,color+'55');cv.roundRect(x+1,y+1,w-2,24,12,'#0b0d0f');
    cv.circle(x+14,y+13,4,color);bold(cv,label,x+24,y+18,13,color);return w;
}
function toggle(cv,x,y,on,enabled){
    cv.roundRect(x,y,76,31,15,!enabled?'#1a1b1d':on?'#ae101b':'#292b2d');cv.circle(on?x+60:x+16,y+15,12,enabled?C.text:'#55595d');
}
// Exhaust smoke from a tailpipe of the hero photo: puffs that billow out, rise, grow and fade.
// A function of time only, so every frame moves it on. amt 0..1. Stays inside the hero card.
function alphaHex(c,al){return c+('0'+Math.round(M.clamp(al,0,1)*255).toString(16)).slice(-2);}
function rnd(n){const x=Math.sin(n*78.233+12.9898)*43758.5453;return x-Math.floor(x);}
function smoke(cv,ox,oy,dir,reach,amt,ts,seed){
    if(amt<0.03)return;
    const N=18,period=2.8;
    for(let i=0;i<N;i++){
        const cyc=ts/period+i/N+seed,p=((cyc%1)+1)%1,k=Math.floor(cyc)*31+i; // k: a new random path every cycle
        const x=ox+dir*(6+p*reach)+(rnd(k)-0.5)*34*p+Math.sin(ts*1.3+i*1.7)*7*p;
        const y=oy-4+p*8-p*p*80+(rnd(k+7)-0.5)*22*p;
        const r=7+p*(34+rnd(k+3)*14);
        const al=amt*0.62*(1-p)*Math.min(1,p*6);
        if(al<0.01)continue;
        cv.circle(x,y,r,alphaHex('#c4c9cf',al*0.3));
        cv.circle(x-r*0.12,y-r*0.1,r*0.7,alphaHex('#d9dde2',al*0.42));
        cv.circle(x-r*0.2,y-r*0.18,r*0.4,alphaHex('#eff1f4',al*0.5));
    }
}
function controls(cv,a,dt){
    const control=a.controls,sim=control.simulated,flap=control.getState('exhaust'),asd=control.getState('asd'),ss=control.getState('startStop'),ambient=control.getState('ambientHardware');
    // Exhaust flap hero: the photo fills the right of a black card, controls sit on the dark left.
    cv.roundRect(184,85,1386,215,12,'#2f3337');cv.roundRect(185,86,1384,213,11,'#000000'); // photo edge is pure black: no seam
    Art.draw(cv,'exhaust',748,86,820,213); // pre-cropped to exactly this box (art/exhaust-crop.png)
    // Round the photo's right corners to match the card.
    [[1558,97,0,90],[1558,288,90,180]].forEach((k)=>{cv.arc(k[0],k[1],11,18,k[2],k[3],C.bg);cv.arc(k[0],k[1],11,12,k[2],k[3],'#2f3337');});
    cv.line(1569,97,1569,288,1,'#2f3337');cv.line(748,86,1558,86,1,'#2f3337');cv.line(748,299,1558,299,1,'#2f3337');
    // Smoke follows the flap: Open -> right pipe, Closed -> left pipe, Auto -> a light wisp from both.
    // On the car it follows the DME read-back, so it only shows what the DME reports.
    const fstate=sim?flap.actual:flap.readback;
    const target={l:fstate==='CLOSED'?1:fstate==='OPEN'?0:0.3,r:fstate==='OPEN'?1:fstate==='CLOSED'?0:0.3};
    a.smoke=a.smoke||{l:target.l,r:target.r};
    a.smoke.l=M.damp(a.smoke.l,target.l,(dt||0)*0.25);a.smoke.r=M.damp(a.smoke.r,target.r,(dt||0)*0.25);
    const ts=Date.now()/1000;
    smoke(cv,1343,236,-1,150,a.smoke.l,ts,0);smoke(cv,1431,236,0.45,70,a.smoke.r,ts,0.37);
    cv.line(198,86,1556,86,1,'#b3b8bd44');
    text(cv,'EXHAUST',212,122,13,C.muted);bold(cv,'Exhaust Flap',212,154,28);
    chip(cv,sim?'SIMULATION':control.armed?'ARMED':'DISARMED',420,132,sim?C.amber:control.armed?C.red:'#9aa0a6');
    const modes=[['Auto','OEM'],['Open','OPEN'],['Closed','CLOSED']].map((s)=>({label:s[0],key:'flap-'+s[1],action:()=>a.control('exhaust',s[1]),
        selected:flap.desired===s[1]&&flap.acknowledged===true,pending:flap.desired===s[1]&&flap.pending}));
    segmented(cv,modes,212,178,540,54);
    const flapLine=flap.error||(sim?'Simulation · flap '+(flap.actual==='OEM'?'auto':flap.actual?flap.actual.toLowerCase():'not set')+'. Choose Vehicle mode in Settings to drive the real flap.':
        !control.armed?'Arm the session, then pick a mode.':flap.pending?'Sending request...':flap.acknowledged==null?'Armed - tap a mode or use the controller.':
        'DME '+(flap.acknowledged?'accepted':'did not accept')+' · ECU read-back: '+(flap.readback||'Unknown'));
    wrap(flapLine,92,2).forEach((l,i)=>text(cv,l,212,259+i*19,15,flap.error?C.amber:'#c9cdd1'));
    button(cv,sim?'Change mode':control.busy?'Detecting...':control.armed?'Disarm':'Arm session',1388,100,168,40,sim?()=>a.settings():()=>a.armControls(),'arm-session',control.armed);
    if(!sim&&control.armed)button(cv,'Recheck',1388,148,168,40,()=>a.recheckControls(),'recheck-link');
    // ASD + start-stop: only switchable in simulation; on a stock car they are shown as unavailable.
    card(cv,184,312,680,60);card(cv,882,312,688,60);
    for(let i=0;i<7;i++){const h=[8,16,26,18,30,14,8][i];cv.line(212+i*6,342-h/2*0.8,212+i*6,342+h/2*0.8,3,C.text);}
    bold(cv,'Active Sound',268,337,20);
    text(cv,sim?'Simulation: '+(asd.actual?'On':'Off'):'Not available on stock software',268,361,14,C.muted);
    toggle(cv,755,327,sim&&asd.actual,sim);if(sim)cv.target(744,314,100,56,()=>a.control('asd',!asd.desired),'asd-toggle',10);
    cv.arc(925,342,15,18,0,360,C.text);bold(cv,'A',925,348,16,C.text,'center');bold(cv,'Start-Stop Memory',966,337,20);
    text(cv,sim?'Simulation: '+(ss.actual?'Remember':'Off'):'Not available on stock software',966,361,14,C.muted);
    toggle(cv,1467,327,sim&&ss.actual,sim);if(sim)cv.target(1456,314,100,56,()=>a.control('startStop',!ss.desired),'startstop-toggle',10);
    // Ambient lighting: on the car the highlighted preset is the one the car confirmed.
    card(cv,184,383,1386,86);icon(cv,'system',208,411,29,C.text);bold(cv,'Ambient Lighting',258,418,21);
    const ambientLine=sim?'Simulation · slot '+(ambient.actual||'--'):ambient.error?ambient.error:ambient.pending?'Sending slot '+ambient.desired+'...':ambient.actual?'Car reports slot '+ambient.actual:control.armed?'Waiting for car colour status':'Arm session to change colour';
    text(cv,fit(ambientLine,36),258,446,15,ambient.error?C.amber:C.muted);
    const swatch={comfort:C.blue,sport:C.red,night:'#a77be0',custom:'#e3b55c'};
    ['comfort','sport','night','custom'].forEach((p,i)=>{
        const x=611+i*237,slot=Number(a.ctx.settings.get('slot_'+p))||i+1;
        const on=sim?a.ctx.settings.get('profile')===p:ambient.actual===slot;
        button(cv,'',x,395,221,62,()=>a.setProfile(p),'profile-'+p,on);
        cv.circle(x+30,426,11,swatch[p]);cv.arc(x+30,426,13,15,0,360,swatch[p]+'66');
        bold(cv,p[0].toUpperCase()+p.slice(1),x+54,424,18,C.text);text(cv,'Slot '+slot,x+54,445,13,C.muted);
    });
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
    button(cv,'Refresh',716,121,128,42,()=>a.refresh(),'refresh-data');
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
