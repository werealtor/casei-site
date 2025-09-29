// Case&i 轮播（加强版）
// 特性：自动播放、顺滑划动、防误触、无缝循环、视频优化、可配置 data-*、悬停暂停、A11y、RTL 兼容
(function(){
  const root = document.documentElement;
  const carousel = document.querySelector('.carousel');
  const track = document.getElementById('track');
  const prev  = document.getElementById('prev');
  const next  = document.getElementById('next');
  const dotsC = document.getElementById('dots');
  const bar   = document.getElementById('bar');
  const live  = document.getElementById('live');

  // —— 从 data-* 读取配置（无则使用默认）——
  const cfg = {
    autoplay:     readBool(carousel.dataset.autoplay, true),
    interval:     readNum(carousel.dataset.interval, 3800),
    loop:         readBool(carousel.dataset.loop, true),
    dwell:        readNum(carousel.dataset.dwell, 1800),
    resumeDelay:  readNum(carousel.dataset.resumeDelay, 2500),
    deadzone:     readNum(carousel.dataset.deadzone, 14),
    horizRatio:   readNum(carousel.dataset.horizRatio, 1.2),
    tapMax:       readNum(carousel.dataset.tapMax, 24),
    flickVel:     readNum(carousel.dataset.flickVel, 0.45),
    hoverPause:   readBool(carousel.dataset.hoverPause, true),
    ease:         0.12,
    swipeThresh:  0.18,
    swipeVel:     0.25,
  };
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // —— 状态 —— 
  let slides = Array.from(track.children);
  let index = 0;                    // 当前 track 索引（含克隆）
  let width = track.clientWidth;
  let raf = null;
  let lastChangeAt = performance.now();

  // —— 无缝循环：首尾克隆 —— 
  if (cfg.loop && slides.length > 1){
    track.insertBefore(slides[slides.length-1].cloneNode(true), slides[0]);
    track.appendChild(slides[0].cloneNode(true));
    slides = Array.from(track.children);
    index = 1;
    instantTo(index);
  }
  const realCount = cfg.loop ? slides.length - 2 : slides.length;

  // —— 圆点生成 —— 
  for(let i=0;i<realCount;i++){
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role','tab');
    b.setAttribute('aria-label', `跳到第 ${i+1} 张`);
    if(i===0) b.setAttribute('aria-selected','true');
    b.addEventListener('click', ()=>{
      stopAutoplay();
      if (canAdvance()) goTo(realToTrack(i));
      queueAutoplay();
    });
    dotsC.appendChild(b);
  }

  // —— 自动播放与进度条 —— 
  let timer = null, progressStart = 0, progressRAF = null, resumeTimer = null;
  function startAutoplay(){
    if (!cfg.autoplay || REDUCED) return;
    stopAutoplay();
    progressStart = performance.now();
    progressLoop();
    timer = setTimeout(()=> { moveTo(index+1); startAutoplay(); }, cfg.interval);
  }
  function stopAutoplay(){
    if (timer){ clearTimeout(timer); timer=null; }
    if (progressRAF){ cancelAnimationFrame(progressRAF); progressRAF=null; }
    bar.style.width = '0%';
  }
  function progressLoop(){
    progressRAF = requestAnimationFrame((t)=>{
      const pct = Math.min(1,(t - progressStart)/cfg.interval);
      bar.style.width = (pct*100)+'%';
      if(pct<1){ progressLoop(); }
    });
  }
  function queueAutoplay(){
    if (!cfg.autoplay || REDUCED) return;
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(()=> startAutoplay(), cfg.resumeDelay);
  }

  // —— 可见性/在视口内才播放 —— 
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) stopAutoplay(); else startAutoplay();
  });
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=> e.isIntersecting ? startAutoplay() : stopAutoplay());
  }, {threshold: .5});
  io.observe(track);

  // —— 悬停暂停（桌面） —— 
  if (cfg.hoverPause){
    track.addEventListener('mouseenter', stopAutoplay);
    track.addEventListener('mouseleave', queueAutoplay);
  }

  // —— 按钮与键盘 —— 
  prev.addEventListener('click', ()=>{ stopAutoplay(); if (canAdvance()) moveTo(index-1); queueAutoplay(); });
  next.addEventListener('click', ()=>{ stopAutoplay(); if (canAdvance()) moveTo(index+1); queueAutoplay(); });

  track.tabIndex = 0;
  track.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowRight'){ e.preventDefault(); stopAutoplay(); if (canAdvance()) moveTo(index+1); queueAutoplay(); }
    if(e.key==='ArrowLeft'){  e.preventDefault(); stopAutoplay(); if (canAdvance()) moveTo(index-1); queueAutoplay(); }
  });

  // —— 触摸/拖拽 —— 
  let sx=0, sy=0, dx=0, dy=0, startT=0, dragging=false, baseX=0, currentX=0, intentLocked=false;
  track.addEventListener('touchstart', onStart, {passive:true});
  track.addEventListener('mousedown', onStart);
  window.addEventListener('touchmove', onMove, {passive:false});
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchend', onEnd);
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('resize', onResize);

  function onStart(e){
    const pt = 'touches' in e ? e.touches[0] : e;
    sx = pt.clientX; sy = pt.clientY; dx = dy = 0;
    dragging = true; startT = performance.now();
    baseX = -index*width; intentLocked = false;
    stopAutoplay(); cancelAnim();
  }
  function onMove(e){
    if(!dragging) return;
    const pt = 'touches' in e ? e.touches[0] : e;
    dx = pt.clientX - sx; dy = pt.clientY - sy;

    // 防误触：死区 + 水平意图
    if (!intentLocked){
      if (Math.abs(dx) < cfg.deadzone) return;
      if (Math.abs(dx) < Math.abs(dy) * cfg.horizRatio) return;
      intentLocked = true;
    }
    if (intentLocked){
      e.preventDefault();
      currentX = baseX + dx;
      translateX(currentX);
    }
  }
  function onEnd(){
    if(!dragging) return; dragging=false;
    const dt = Math.max(1, performance.now()-startT);
    const velocity = dx / dt; // px/ms
    const travel = Math.abs(dx)/width;
    let target = index;

    if (Math.abs(dx) < cfg.tapMax){
      target = index; // 视为轻扫/点击
    } else if (Math.abs(velocity) > cfg.flickVel || travel > cfg.swipeThresh || Math.abs(velocity) > cfg.swipeVel){
      target = dx < 0 ? index+1 : index-1; // 甩动或明确位移
    }
    glideTo(target);
    queueAutoplay();
  }

  // —— 动画与切换 —— 
  let anim=null;
  function glideTo(target){ moveTo(clampIndex(target), true); }
  function clampIndex(i){ return cfg.loop ? i : Math.max(0, Math.min(slides.length-1, i)); }
  function canAdvance(){ return (performance.now() - lastChangeAt) > cfg.dwell; }

  function moveTo(target, smooth=true){
    // 循环边界的“软限制”（动画完成后做无缝瞬移）
    if(cfg.loop){
      if(target<=0){ if(target===-1) target=0; }
      if(target>=slides.length-1){ if(target===slides.length) target=slides.length-1; }
    }else{
      target = Math.max(0, Math.min(slides.length-1, target));
    }
    if (target !== index && !canAdvance()) return;

    index = target;
    setDots(trackToReal(index));
    playIfVideo(index);
    announce(); // 读屏播报当前页

    if(smooth && !REDUCED){
      cancelAnim();
      const from = getTranslateX();
      const to = -index*width;
      anim = {x: from, to};
      step();
    }else{
      instantTo(index);
    }
    lastChangeAt = performance.now();
  }

  function step(){
    if(!anim) return;
    anim.x += (anim.to - anim.x) * cfg.ease;
    if(Math.abs(anim.to - anim.x) < .5){
      anim.x = anim.to; cancelAnim();
    }else{
      raf = requestAnimationFrame(step);
    }
    translateX(anim.x);

    // 无缝瞬移（到克隆端时）
    if(cfg.loop){
      if(index===slides.length-1 && Math.abs(anim.to - anim.x) < .6){
        index = 1; instantTo(index);
      }else if(index===0 && Math.abs(anim.to - anim.x) < .6){
        index = slides.length-2; instantTo(index);
      }
    }
  }

  function cancelAnim(){ if(raf){ cancelAnimationFrame(raf); raf=null; } anim=null; }
  function instantTo(i){ translateX(-i*width); setDots(trackToReal(i)); playIfVideo(i); }
  function translateX(x){ track.style.transform = `translate3d(${x}px,0,0)`; }

  function getTranslateX(){
    const tf = getComputedStyle(track).transform;
    if(!tf || tf === 'none') return 0;
    try{ const m = new WebKitCSSMatrix(tf); return m.m41 || 0; }
    catch{
      const m = tf.match(/matrix(3d)?\((.+)\)/);
      if(m){
        const nums = m[2].split(',').map(parseFloat);
        return m[1] ? nums[12] : nums[4];
      }
      return 0;
    }
  }

  function setDots(realIdx){
    const btns = dotsC.querySelectorAll('button');
    btns.forEach((b,i)=> b.setAttribute('aria-selected', i===realIdx ? 'true':'false'));
  }

  // 仅当前页视频播放，其它暂停
  function playIfVideo(i){
    const allV = track.querySelectorAll('video');
    allV.forEach(v=>{ try{ v.pause(); }catch{} });
    const v = slides[i]?.querySelector?.('video');
    if(v){ v.muted = true; v.playsInline = true; v.loop = true; v.play().catch(()=>{}); }
  }

  // 读屏播报当前页（A11y）
  function announce(){
    const real = trackToReal(index) + 1;
    live.textContent = `第 ${real} 张，共 ${realCount} 张`;
  }

  function onResize(){
    width = track.clientWidth;
    instantTo(index);
  }

  // 工具
  function realToTrack(real){ return cfg.loop ? real+1 : real; }
  function trackToReal(trackIdx){
    if(!cfg.loop) return trackIdx;
    if(trackIdx===0) return realCount-1;
    if(trackIdx===slides.length-1) return 0;
    return trackIdx-1;
  }
  function readNum(v, d){ const n = Number(v); return Number.isFinite(n)? n : d; }
  function readBool(v, d){ if(v===undefined) return d; return v === 'true' || v === true; }

  // 初始化
  instantTo(index);
  if (cfg.autoplay) startAutoplay();

})();