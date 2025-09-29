(function(){
  const track=document.getElementById('track');
  const prev=document.getElementById('prev');
  const next=document.getElementById('next');
  const dotsC=document.getElementById('dots');
  const bar=document.getElementById('bar');

  const AUTOPLAY_MS=3800, SWIPE_THRESH=0.18, SWIPE_VEL=0.25, EASE=0.12, LOOP=true;
  const MIN_DEADZONE=14, HORIZ_RATIO=1.2, TAP_MAX=24, FLICK_VEL=0.45, MIN_DWELL=1800, RESUME_DELAY=2500;

  let slides=Array.from(track.children), index=0, width=track.clientWidth;
  if(LOOP&&slides.length>1){
    track.insertBefore(slides[slides.length-1].cloneNode(true),slides[0]);
    track.appendChild(slides[0].cloneNode(true));
    slides=Array.from(track.children); index=1; instant(index);
  }
  const realCount=LOOP?slides.length-2:slides.length;
  for(let i=0;i<realCount;i++){let b=document.createElement('button');b.type="button";b.setAttribute('aria-label',`第${i+1}张`);if(i===0)b.setAttribute('aria-selected','true');b.onclick=()=>{stop(); if(canAdvance()) move(real2track(i)); resume();};dotsC.appendChild(b);}
  function real2track(r){return LOOP?r+1:r}
  function track2real(t){if(!LOOP)return t; if(t===0)return realCount-1;if(t===slides.length-1)return 0;return t-1;}

  let timer=null,progressRAF=null,lastChange=performance.now();
  function start(){stop();progressStart=performance.now();progress();timer=setTimeout(()=>{move(index+1);start();},AUTOPLAY_MS);}
  function stop(){if(timer){clearTimeout(timer);timer=null;}if(progressRAF){cancelAnimationFrame(progressRAF);progressRAF=null;}bar.style.width="0%";}
  function progress(){progressRAF=requestAnimationFrame(t=>{const pct=Math.min(1,(t-progressStart)/AUTOPLAY_MS);bar.style.width=(pct*100)+"%";if(pct<1)progress();});}
  let resumeT=null;function resume(){if(resumeT)clearTimeout(resumeT);resumeT=setTimeout(()=>start(),RESUME_DELAY);}
  document.addEventListener('visibilitychange',()=>{document.hidden?stop():start();});
  prev.onclick=()=>{stop();if(canAdvance())move(index-1);resume();}
  next.onclick=()=>{stop();if(canAdvance())move(index+1);resume();}
  track.tabIndex=0;track.onkeydown=e=>{if(e.key==="ArrowRight"){stop();if(canAdvance())move(index+1);resume();}if(e.key==="ArrowLeft"){stop();if(canAdvance())move(index-1);resume();}}

  let sx=0,sy=0,dx=0,dy=0,startT=0,drag=false,baseX=0,intent=false;
  track.addEventListener('touchstart',s,{passive:true});track.addEventListener('mousedown',s);
  window.addEventListener('touchmove',m,{passive:false});window.addEventListener('mousemove',m);
  window.addEventListener('touchend',e);window.addEventListener('mouseup',e);
  window.addEventListener('resize',()=>{width=track.clientWidth;instant(index);});
  function s(ev){const p='touches'in ev?ev.touches[0]:ev;sx=p.clientX;sy=p.clientY;dx=dy=0;drag=true;startT=performance.now();baseX=-index*width;intent=false;stop();}
  function m(ev){if(!drag)return;const p='touches'in ev?ev.touches[0]:ev;dx=p.clientX-sx;dy=p.clientY-sy;if(!intent){if(Math.abs(dx)<MIN_DEADZONE)return;if(Math.abs(dx)<Math.abs(dy)*HORIZ_RATIO)return;intent=true;}ev.preventDefault();translate(baseX+dx);}
  function e(){if(!drag)return;drag=false;const dt=Math.max(1,performance.now()-startT);const v=dx/dt;const travel=Math.abs(dx)/width;let target=index;if(Math.abs(dx)<TAP_MAX){target=index;}else if(Math.abs(v)>FLICK_VEL||travel>SWIPE_THRESH||Math.abs(v)>SWIPE_VEL){target=dx<0?index+1:index-1;}move(target);resume();}

  let anim=null,raf=null;
  function move(t,smooth=true){if(LOOP){if(t<=0){if(t===-1)t=0;}if(t>=slides.length-1){if(t===slides.length)t=slides.length-1;}}else{t=Math.max(0,Math.min(slides.length-1,t));}
    if(t!==index&&!canAdvance())return;index=t;setDots(track2real(index));
    if(smooth){cancel();const from=getX(),to=-index*width;anim={x:from,to};step();}else{instant(index);}lastChange=performance.now();}
  function step(){if(!anim)return;anim.x+=(anim.to-anim.x)*EASE;if(Math.abs(anim.to-anim.x)<.5){anim.x=anim.to;cancel();}else{raf=requestAnimationFrame(step);}translate(anim.x);if(LOOP){if(index===slides.length-1&&Math.abs(anim.to-anim.x)<.6){index=1;instant(index);}else if(index===0&&Math.abs(anim.to-anim.x)<.6){index=slides.length-2;instant(index);}}}
  function cancel(){if(raf){cancelAnimationFrame(raf);raf=null;}anim=null;}
  function instant(i){translate(-i*width);setDots(track2real(i));}
  function translate(x){track.style.transform=`translate3d(${x}px,0,0)`;}
  function getX(){const tf=getComputedStyle(track).transform;if(!tf||tf==="none")return 0;const m=new WebKitCSSMatrix(tf);return m.m41||0;}
  function setDots(r){dotsC.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-selected',i===r?'true':'false'));}
  function canAdvance(){return performance.now()-lastChange>MIN_DWELL;}

  instant(index);start();
})();