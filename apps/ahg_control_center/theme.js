'use strict';
const C={bg:'#030405',panel:'#101214',edge:'#55595d',text:'#f3f4f5',muted:'#a3a7ab',red:'#d51e28',blue:'#3e94cf',green:'#65e172',amber:'#e4b15e'};
function text(cv,value,x,y,size,color,align) {cv.text(String(value),x,y,size,color||C.text,{font:'label',align:align||'left',literal:true});}
function bold(cv,value,x,y,size,color,align) {cv.text(String(value),x,y,size,color||C.text,{font:'bold',align:align||'left',literal:true});}
function card(cv,x,y,w,h) {cv.roundRect(x,y,w,h,11,C.edge);cv.card(x+1,y+1,w-2,h-2,10,[[0,'#141719'],[0.5,'#090b0c'],[1,'#050607']]);cv.line(x+14,y+1,x+w-14,y+1,1,'#b3b8bd55');}
function button(cv,label,x,y,w,h,action,key,selected,disabled) {
    card(cv,x,y,w,h);
    if(selected){cv.card(x+1,y+1,w-2,h-2,9,[[0,'#582129'],[1,'#23090d']]);cv.line(x+10,y+h-2,x+w-10,y+h-2,2,C.red);}
    bold(cv,label,x+w/2,y+h/2+7,18,disabled?'#6f7680':C.text,'center');
    if(action && !disabled)cv.target(x,y,w,h,action,key,10);
}
function lineIcon(cv,id,x,y,size,color) {
    const s=size/24,c=color||C.text;
    function line(points){cv.polyline(points.map((p)=>[x+p[0]*s,y+p[1]*s]),1.7*s,c);}
    if(id==='home'){line([[2,11],[12,2],[22,11]]);line([[5,9],[5,22],[10,22],[10,15],[15,15],[15,22],[20,22],[20,9]]);}
    else if(id==='controls'){[5,12,19].forEach((v,i)=>{line([[2,v],[22,v]]);cv.circle(x+[8,16,10][i]*s,y+v*s,2.5*s,C.bg);cv.arc(x+[8,16,10][i]*s,y+v*s,1.5*s,2.6*s,0,360,c);});}
    else if(id==='hybrid'){cv.roundRect(x+2*s,y+6*s,19*s,13*s,3*s,c);cv.roundRect(x+4*s,y+8*s,15*s,9*s,1*s,C.bg);line([[22,10],[23,10],[23,15],[22,15]]);line([[13,7],[9,13],[14,13],[11,18]]);}
    else {cv.arc(x+12*s,y+12*s,7*s,9*s,0,360,c);for(let i=0;i<8;i++){const a=i*Math.PI/4;cv.line(x+(12+8*Math.cos(a))*s,y+(12+8*Math.sin(a))*s,x+(12+12*Math.cos(a))*s,y+(12+12*Math.sin(a))*s,3*s,c);}cv.circle(x+12*s,y+12*s,3*s,C.bg);}
}
function wordmark(cv,x,y,scale) {
    const s=scale||0.72;
    const letters=[[[0,26],[22,0],[40,0],[23,26],[14,26],[19,20],[9,20],[5,26],[0,26]],
        [[34,26],[48,0],[58,0],[52,10],[67,10],[73,0],[83,0],[69,26],[59,26],[64,17],[49,17],[44,26]],
        [[79,26],[92,0],[128,0],[123,8],[99,8],[92,19],[110,19],[113,15],[103,15],[107,9],[126,9],[117,26]]];
    letters.forEach((points)=>cv.fill(points.map((p)=>[x+p[0]*s,y+(p[1]-26)*s]),'#eff0f1'));
    for(let i=0;i<3;i++)cv.fill([[x+(128+i*10)*s,y-21*s],[x+(136+i*10)*s,y-21*s],[x+(124+i*10)*s,y],[x+(116+i*10)*s,y]],C.red);
}
module.exports={C,text,bold,card,button,lineIcon,wordmark};
