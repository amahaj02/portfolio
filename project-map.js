// Adapted from the user-supplied portfolio-map-v2.html. Its custom point shaders
// and folded cloud/flow motion are retained, with a feathered particle envelope.
(() => {
 const root=document.querySelector('.project-map');if(!root)return;
 const stage=root.querySelector('.map-stage'),cv=root.querySelector('canvas');
 const sources=[...root.querySelectorAll('.map-project-link')];
 const small=matchMedia('(max-width: 760px)');
 let started=false,failed=false,engine;
 function loadThree(){
  if(window.THREE)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
   script.onload=resolve;script.onerror=reject;document.head.append(script);
  });
 }
 function start(){
  if(started||small.matches||failed)return;
  started=true;
  Promise.all([
   loadThree(),
   document.fonts.load('400 168px "Instrument Serif"'),
   document.fonts.load('400 52px "Instrument Serif"')
  ]).then(()=>{engine=initialize();}).catch(()=>{
   failed=true;root.dataset.mapState='fallback';
  });
 }
 small.addEventListener('change',()=>{if(engine)engine.resize();else start();});
 start();
 function initialize(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let reduceMotion=reduced.matches;
 var cs=getComputedStyle(root);
 function col(name){return new THREE.Color(cs.getPropertyValue(name).trim());}
 var cFg=col('--paper'),cA=col('--map-warm'),cB=col('--map-cool');
 var BL=THREE.AdditiveBlending;
 var R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true}),px=Math.min(devicePixelRatio||1,1.75);
 R.setPixelRatio(px);
 var S=new THREE.Scene(),C=new THREE.PerspectiveCamera(50,1,.1,80),G=new THREE.Group();S.add(G);G.rotation.x=.2;
var W=5.6,H=4.2,MATS=[];
function f(u,v,t,ph){return .8*Math.sin(.95*u+ph+t*.5)*Math.cos(.8*v+ph)+.35*Math.sin(1.7*v+t*.4+ph*2)+.08*(u*u-v*v)}
function gauss(){return(Math.random()+Math.random()+Math.random()-1.5)*.9}
function dens(u,v,ph){return .5+.5*Math.sin(.9*u+ph*1.3+1)*Math.cos(.8*v+ph)+.25*Math.sin(1.9*u-1.4*v+ph)}

var GLSLF='float f(float u,float v,float t,float ph){return .8*sin(.95*u+ph+t*.5)*cos(.8*v+ph)+.35*sin(1.7*v+t*.4+ph*2.)+.08*(u*u-v*v);}';
var FRAG='uniform vec3 uC;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c)*4.;float a=exp(-d*3.5)*vA;gl_FragColor=vec4(min(uC*(1.+.7*exp(-d*10.)),vec3(1.)),a);}';
function mat(vs,extra){var u={uT:{value:0},uPx:{value:px}};for(var k in extra)u[k]={value:extra[k]};
  var m=new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:FRAG,transparent:true,depthWrite:false,blending:BL});MATS.push(m);return m}

function cloud(color,ph,x,ry,N){
  var P=new Float32Array(N*3),Rr=new Float32Array(N*2),fade=new Float32Array(N),n=0;
  while(n<N){var u=(Math.random()-.5)*W*1.45,v=(Math.random()-.5)*H*1.55,d=Math.max(0,Math.min(1,dens(u,v,ph))),out=Math.random()<.05;
    // Broad, irregular falloff removes the rectangular sampling boundary.
    var envelope=Math.exp(-Math.pow(Math.abs(u)/(W*.44),4)-Math.pow(Math.abs(v)/(H*.44),4));
    envelope*=.78+.22*Math.sin(u*1.3+v*.8+ph);
    if(Math.random()<(Math.pow(d,2.2)+.05)*envelope){fade[n]=envelope;P[n*3]=u;P[n*3+1]=v;P[n*3+2]=gauss()*(out?.9:.3*(1.15-d));Rr[n*2]=Math.random();Rr[n*2+1]=Math.random()*d+.15;n++}}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
  g.setAttribute('aP',new THREE.BufferAttribute(P,3));g.setAttribute('aR',new THREE.BufferAttribute(Rr,2));g.setAttribute('aFade',new THREE.BufferAttribute(fade,1));
  var m=mat('uniform float uT,uPh,uPx;attribute vec3 aP;attribute vec2 aR;attribute float aFade;varying float vA;'+GLSLF+
   'void main(){float t=uT;vec3 p=vec3(aP.x,aP.y,f(aP.x,aP.y,t,uPh)+aP.z);'+
   'p+=.09*vec3(sin(t*.7+aR.x*40.),cos(t*.6+aR.x*30.),sin(t*.5+aR.y*50.));'+
   'vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float big=step(.94,aR.x);'+
   'gl_PointSize=mix(1.1+aR.y*2.4,26.+aR.y*30.,big)*uPx*(9./-mv.z);vA=mix(.3+.7*aR.y,.05,big)*aFade;}',{uPh:ph,uC:color});
  var pts=new THREE.Points(g,m);pts.frustumCulled=false;
  var gr=new THREE.Group();gr.position.x=x;gr.rotation.y=ry;gr.add(pts);G.add(gr);return{g:gr,ph:ph,pts:[]};
}
function flow(N){
  var S1=new Float32Array(N),O=new Float32Array(N*3);for(var i=0;i<N;i++){S1[i]=Math.random();O[i*3]=gauss();O[i*3+1]=gauss();O[i*3+2]=gauss()}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
  g.setAttribute('aS',new THREE.BufferAttribute(S1,1));g.setAttribute('aO',new THREE.BufferAttribute(O,3));
  var m=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uPx:{value:px},uA:{value:cA},uB:{value:cB}},transparent:true,depthWrite:false,blending:BL,
   vertexShader:'uniform float uT,uPx;attribute float aS;attribute vec3 aO;varying float vA;varying float vS;'+
   'void main(){float s=fract(aS+uT*.035);float e=sin(3.14159*s);vec3 p=mix(vec3(-3.4,0.,.3),vec3(3.4,0.,.3),s)+vec3(0.,1.5*e-.1,.8*sin(6.28318*s+aS*6.));'+
   'p+=aO*(.12+.45*e);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.+aS*1.8)*uPx*(9./-mv.z);vA=pow(e,.6)*.9;vS=s;}',
   fragmentShader:'uniform vec3 uA,uB;varying float vA;varying float vS;void main(){vec2 c=gl_PointCoord-.5;float d=dot(c,c)*4.;gl_FragColor=vec4(mix(uA,uB,vS),exp(-d*3.5)*vA);}'});
  MATS.push(m);var p=new THREE.Points(g,m);p.frustumCulled=false;G.add(p);
}
function title(txt,color,y){
  var c=document.createElement('canvas');c.width=1024;c.height=256;var x=c.getContext('2d');
  x.font='400 168px "Instrument Serif"';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(txt,512,134);
  var tx=new THREE.CanvasTexture(c);tx.anisotropy=4;var g=new THREE.Group();
  for(var s=0;s<2;s++){var side=new THREE.Group();
    for(var i=0;i<2;i++){var m=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1.1),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,side:THREE.FrontSide,color:i?color.clone().multiplyScalar(.4):color.clone()}));m.position.z=-i*.012;side.add(m);}
    if(s)side.rotation.y=Math.PI;g.add(side);}
  g.position.y=y;return g;
}
function label(txt,color){
  var c=document.createElement('canvas');c.height=112;var x=c.getContext('2d');
  x.font='400 52px "Instrument Serif"';c.width=Math.ceil(x.measureText(txt).width)+20;
  x.font='400 52px "Instrument Serif"';x.textAlign='left';x.textBaseline='middle';x.fillStyle='#fff';x.strokeStyle='#0c0b10';x.lineWidth=3;x.lineJoin='round';x.strokeText(txt,10,56);x.fillText(txt,10,56);
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false,depthWrite:false,color:color.clone()}));
  s.renderOrder=20;s.scale.set(c.width/112*.58,.58,1);s.center.set(-.65/s.scale.x,.5);return s;
}
var gc=document.createElement('canvas');gc.width=gc.height=64;var gx=gc.getContext('2d'),gg=gx.createRadialGradient(32,32,0,32,32,32);
gg.addColorStop(0,'rgba(255,255,255,1)');gg.addColorStop(.25,'rgba(255,255,255,.45)');gg.addColorStop(1,'rgba(255,255,255,0)');gx.fillStyle=gg;gx.fillRect(0,0,64,64);
var glowTex=new THREE.CanvasTexture(gc);

var L=cloud(cA,0,-3.7,.45,11000),Rt=cloud(cB,2.1,3.7,-.45,11000);flow(5000);
L.g.add(title('ML & Data',cA,2.9));Rt.g.add(title('Cloud & Infra',cB,2.9));

var ALL=[],picks=[],vec=new THREE.Vector3();
function add(sh,name,kind,blurb,u,v,color,bridge,by,bz,source){
  if(sh){u*=1.65;v*=1.6}
  var m=new THREE.Mesh(new THREE.SphereGeometry(.1,18,14),new THREE.MeshBasicMaterial({color:color}));
  var gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:color,transparent:true,depthTest:false,depthWrite:false,blending:BL,opacity:.9}));gl.scale.set(1.1,1.1,1);m.add(gl);
  var pk=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  var lb=label(name,color);lb.position.set(0,0,0);m.add(lb);m.add(pk);
  var q={name:name,kind:kind,blurb:blurb,m:m,l:lb,sh:sh,u:u,v:v,s:1,labelSize:lb.scale.clone(),bridge:bridge,by:by,bz:bz,source:source,id:source.dataset.mapId};pk.userData.q=q;
  (sh?sh.g:G).add(m);if(!sh)m.position.set(0,by,bz);if(sh)sh.pts.push(q);ALL.push(q);picks.push(pk);
}
sources.forEach(function(source){
 var group=source.dataset.mapGroup,sh=group==='ml'?L:group==='infra'?Rt:null;
 add(sh,source.querySelector('strong').textContent,group,source.querySelector('span').textContent,
 Number(source.dataset.u),Number(source.dataset.v),group==='ml'?cA:group==='infra'?cB:cFg,!sh,Number(source.dataset.by),Number(source.dataset.bz),source);
});

 var info=root.querySelector('.map-info'),iN=info.querySelector('h2'),iB=info.querySelector('.map-info-summary');
 var motionButton=root.querySelector('.map-motion');
 var hov=null,pinned=null,overInfo=false,closeTimer;
 var mouse=new THREE.Vector2(0,0),pm=new THREE.Vector2(0,0),rc=new THREE.Raycaster();
 var drag=false,moved=false,lx=0,startX=0,pointerInside=false;
 var paused=false,visible=false,lost=false,last=0,T=0,fr=0,raf=0;
 function show(q){
  clearTimeout(closeTimer);closeTimer=null;hov=q;info.hidden=!q;
  sources.forEach(source=>source.setAttribute('aria-expanded',String(q?.id===source.dataset.mapId)));
  if(!q)return;
  q.m.getWorldPosition(vec);var me=vec.clone();
  var neighbors=ALL.filter(o=>o!==q).map(o=>{o.m.getWorldPosition(vec);return {o,d:vec.distanceTo(me)};}).sort((a,b)=>a.d-b.d).slice(0,2);
  iN.textContent=q.name;iB.textContent=q.blurb;
  info.querySelector('.preview-stack').replaceChildren(...q.source.dataset.stack.split('|').map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  const nearest=info.querySelector('.map-nearest div');
  nearest.replaceChildren(...neighbors.map(({o})=>{const button=document.createElement('button');button.type='button';button.textContent=o.name;button.addEventListener('click',()=>select(o,true));return button;}));
  const more=info.querySelector('.map-more');more.href=q.source.hash;
  if(q.source.hash.startsWith('#project-'))more.dataset.openProject=q.source.hash.slice(9);else delete more.dataset.openProject;
  const github=info.querySelector('.map-github');github.hidden=!q.source.dataset.github;
  if(q.source.dataset.github)github.href=q.source.dataset.github;else github.removeAttribute('href');
 }
 function select(q,pin=false){pinned=pin?q:null;show(q);render();}
 function dismiss(){pinned=null;show(null);render();}
 function canRun(){return visible&&!document.hidden&&!small.matches&&!lost;}
 function animates(){return canRun()&&!paused&&!reduceMotion;}
 function render(){
  if(lost||small.matches)return;
  if(reduceMotion){pm.set(0,0);}else pm.lerp(mouse,.05);
  C.position.x=pm.x*.6;C.position.y=pm.y*.4;C.lookAt(0,0,0);C.updateMatrixWorld(true);
  MATS.forEach(m=>m.uniforms.uT.value=T);
  [L,Rt].forEach(sh=>sh.pts.forEach(q=>q.m.position.set(q.u,q.v,f(q.u,q.v,T,sh.ph)+.02)));
  ALL.forEach(q=>{
   if(q.bridge)q.m.position.y=q.by+Math.sin(T*.8+q.bz*5)*.1;
   const target=q===hov?1.25:1;
   q.s=animates()?q.s+(target-q.s)*.15:target;q.m.scale.setScalar(q.s);
   q.l.scale.copy(q.labelSize).multiplyScalar(1/q.s);
   q.l.material.color.copy(q===hov?cFg:q.m.material.color);
   q.m.getWorldPosition(vec);var distance=vec.distanceTo(C.position);
   const gap=.65/q.l.scale.x;
   q.l.center.set(vec.clone().project(C).x>.5?1+gap:-gap,.5);
   q.l.material.opacity=Math.max(.78,Math.min(1,1.35-(distance-4)*.17));
  });
  G.updateMatrixWorld(true);C.updateMatrixWorld(true);
  if(pointerInside&&!drag&&!pinned&&!overInfo&&(!animates()||fr++%2===0)){
   rc.setFromCamera(mouse,C);const hit=rc.intersectObjects(picks,false)[0];const next=hit?.object.userData.q||null;
   if(next!==hov){if(next)show(next);else if(hov&&!closeTimer)closeTimer=setTimeout(()=>{closeTimer=null;if(!overInfo&&!pinned)show(null);},180);}
   cv.style.cursor=next?'pointer':'grab';
  }
  R.render(S,C);root.dataset.rotation=G.rotation.y.toFixed(4);root.dataset.time=T.toFixed(3);
 }
 function tick(now){
  const dt=last?Math.min((now-last)/1000,.05):.016;last=now;
  if(animates()){T+=dt;if(!drag)G.rotation.y+=dt*(hov?.056:.208);}
  render();raf=animates()?requestAnimationFrame(tick):0;
 }
 function sync(){
  cancelAnimationFrame(raf);raf=0;last=0;
  root.dataset.motion=!canRun()?'offscreen':reduceMotion?'reduced':paused?'paused':'running';
  motionButton.textContent=paused?'Resume motion':'Pause motion';
  motionButton.disabled=reduceMotion;motionButton.setAttribute('aria-pressed',String(paused||reduceMotion));
  if(canRun()){render();if(animates())raf=requestAnimationFrame(tick);}
 }
 function size(){
  if(small.matches){info.hidden=true;sync();return;}
  const w=stage.clientWidth,h=stage.clientHeight;
  R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();C.position.z=Math.max(9.8,8/(C.aspect*Math.tan(25*Math.PI/180)));
  sync();render();
 }
 root.dataset.mapState='ready';cv.hidden=false;cv.tabIndex=0;
 root.querySelector('.map-hint').hidden=false;motionButton.hidden=false;
 sources.forEach(source=>{
  source.setAttribute('aria-controls','map-info');source.setAttribute('aria-expanded','false');
  source.addEventListener('focus',()=>{if(!small.matches&&!lost)select(ALL.find(q=>q.source===source),true);});
  source.addEventListener('click',event=>{
   if(small.matches||lost||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();select(ALL.find(q=>q.source===source),true);info.focus({preventScroll:true});
  });
 });
 motionButton.addEventListener('click',()=>{paused=!paused;sync();});
 info.addEventListener('pointerenter',()=>{overInfo=true;clearTimeout(closeTimer);closeTimer=null;});
 info.addEventListener('pointerleave',()=>{overInfo=false;if(!pinned){closeTimer=setTimeout(()=>{closeTimer=null;if(!pinned&&!overInfo){show(null);render();}},180);}});
 info.querySelector('.map-close').addEventListener('click',()=>{dismiss();cv.focus({preventScroll:true});});
 cv.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const current=ALL.indexOf(hov);select(ALL[(current+(event.key==='ArrowRight'?1:ALL.length-1)+ALL.length)%ALL.length],true);}
  if(event.key==='Enter'&&!info.hidden){event.preventDefault();info.querySelector('.map-more').focus({preventScroll:true});}
 });
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!info.hidden){event.preventDefault();dismiss();cv.focus({preventScroll:true});}});
 cv.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag=true;moved=false;lx=startX=event.clientX;cv.setPointerCapture(event.pointerId);cv.classList.add('drag');});
 cv.addEventListener('pointerup',event=>{
  if(!drag)return;drag=false;cv.classList.remove('drag');
  if(!moved){G.updateMatrixWorld(true);rc.setFromCamera(mouse,C);const q=rc.intersectObjects(picks,false)[0]?.object.userData.q; if(q)select(q,true);else dismiss();}
 });
 cv.addEventListener('pointercancel',()=>{drag=false;cv.classList.remove('drag');});
 cv.addEventListener('pointermove',event=>{
  const rect=cv.getBoundingClientRect();pointerInside=true;
  mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  if(drag){if(Math.abs(event.clientX-startX)>5)moved=true;G.rotation.y+=(event.clientX-lx)*.006;lx=event.clientX;}
  if(!animates())render();
 });
 cv.addEventListener('pointerleave',()=>{pointerInside=false;mouse.set(0,0);if(!pinned&&!overInfo){closeTimer=setTimeout(()=>{closeTimer=null;if(!overInfo&&!pinned)show(null);},180);}if(!animates())render();});
 new ResizeObserver(size).observe(stage);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:0}).observe(stage);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',event=>{reduceMotion=event.matches;sync();});
 cv.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;root.dataset.mapState='fallback';info.hidden=true;sync();});
 cv.addEventListener('webglcontextrestored',()=>{lost=false;root.dataset.mapState='ready';size();});
 size();return {resize:size};
 }
})();
