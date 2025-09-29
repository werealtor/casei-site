// Case&i 轮播（自动播放 + 顺滑划动 + 防误触 + 无缝循环 + 视频优化 + 资源 fallback）
(function(){
  const carousel = document.querySelector('.carousel');
  const track = document.getElementById('track');
  const prev  = document.getElementById('prev');
  const next  = document.getElementById('next');
  const dotsC = document.getElementById('dots');
  const bar   = document.getElementById('bar');
  const live  = document.getElementById('live');

  // ==== 可调参数 ====
  const AUTOPLAY_MS = 3800;
  const EASE = 0.12;
  const LOOP = true;

  // 防误触
  const SWIPE_THRESH = 0.18;   // 相对位移
  const SWIPE_VEL    = 0.25;   // 兼容旧阈值
  const MIN_DEADZONE = 14;     // 起滑死区（px）
  const HORIZ_RATIO  = 1.2;    // 水平意图
  const TAP_MAX      = 24;     // 轻扫/点击位移（px）
  const FLICK_VEL    = 0.45;   // 甩动速度（px/ms）
  const MIN_DWELL    = 1800;   // 阅读停顿（ms）
  const RESUME_DELAY = 2500;   // 交互后恢复自动播放延时（ms）

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==== 资源 fallback：剔除无效 slide ====
  let slides = Array.from(track.children);

  function loadCheck(el){
    return new Promise(res=>{
      if(!el) return res(false);
      if(el.tagName === 'IMG'){
        const src = el.getAttribute('src');
        if(!src) return res(false);
        if(el.complete) return res(el.naturalWidth > 0);
        el.addEventListener('load', ()=>res(true), {once:true});
        el.addEventListener('error', ()=>res(false), {once:true});
      }else if(el.tagName === 'VIDEO'){
        const hasSrc = !!(el.querySelector('source')?.getAttribute('src') || el.getAttribute('src'));
        if(!hasSrc){
          // 没视频源，用 poster 顶上
          return res(!!el.getAttribute('poster'));
        }
        let settled=false;
        const done=(ok)=>{ if(!settled){ settled=true; res(ok); } };
        el.addEventListener('loadedmetadata', ()=>done(true), {once:true});
        el.addEventListener('error', ()=>done(false), {once:true});
        // 某些浏览器可能阻止事件，2s 后兜底认为可用（后续 play() 再兜底）
        setTimeout(()=>done(true), 2000);
        try{ el.load(); }catch{ done(true); }
      }else{
        res(true);
      }
    });
  }

  (async function sanitizeSlides(){
    // 检测每张可用性
    const keep = [];
    for(const s of slides){
      const media = s.querySelector('img,video');
      const ok = await loadCheck(media);
      if(ok){ keep.push(s); } else { s.remove(); }
    }
    slides = keep;
    if(slides.length === 0){
      // 没有内容，塞一个占位避免布局崩
      const ph = document.createElement('article');
      ph.className = 'slide';
      ph.innerHTML = '<img src="assets/images/og-cover.jpg" alt="placeholder" />';
      track.appendChild(ph);
      slides = [ph];
    }
    initCarousel();
  })();

  // ==== 轮播主逻辑 ====
  function initCarousel(){
    let index = 0;                 // 当前 track 索引（含克隆）
    let width = track.clientWidth; // 容器宽度
    let raf = null;
    let lastChangeAt = performance.now();

    // 少于 2 张：关闭自动播放与循环
    const canLoop = LOOP && slides.length > 1;
    const canAutoplay = !REDUCED && slides.length > 1;

    // 无缝循环：首尾克隆
    if (canLoop){
      track.insertBefore(slides[slides.length-1].cloneNode(true), slides[0]);
      track.appendChild(slides[0].cloneNode(true));
      slides = Array.from(track.children);
      index = 1; // 从真实第0张开始
      instantTo(index);
    }

    const realCount = canLoop ? slides.length - 2 : slides.length;

    // —— 生成圆点 —— 
    dotsC.innerHTML = '';
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

    function realToTrack(real){ return canLoop ? real+1 : real; }
    function trackToReal(trackIdx){
      if(!canLoop) return trackIdx;
      if(trackIdx===0) return realCount-1;
      if(trackIdx===slides.length-1) return 0;
      return trackIdx-1;
    }

    // —— 自动播放与进度条 —— 
    let timer=null, progressStart=0, progressRAF=null, resumeTimer=null;

    function startAutoplay(){
      if (!canAutoplay) return;
      stopAutoplay();
      progressStart = performance.now();
      progressLoop();
      timer = setTimeout(()=>{ moveTo(index+1); startAutoplay(); }, AUTOPLAY_MS);
    }
    function stopAutoplay(){
      if (timer){ clearTimeout(timer); timer=null; }
      if (progressRAF){ cancelAnimationFrame(progressRAF); progressRAF=null; }
      bar.style.width = '0%';
    }
    function progressLoop(){
      progressRAF = requestAnimationFrame((t)=>{
        const pct = Math.min(1,(t - progressStart)/AUTOPLAY_MS);
        bar.style.width = (pct*100)+'%';
        if(pct<1){ progressLoop(); }
      });
    }
    function queueAutoplay(){
      if (!canAutoplay) return;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(()=> startAutoplay(), RESUME_DELAY);
    }

    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden) stopAutoplay(); else startAutoplay();
    });
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=> e.isIntersecting ? startAutoplay() : stopAutoplay());
    }, {threshold: .5});
    io.observe(track);

    // —— 按钮/键盘 —— 
    prev.addEventListener('click', ()=>{ stopAutoplay(); if (canAdvance()) moveTo(index-1); queueAutoplay(); });
    next.addEventListener('click', ()=>{ stopAutoplay(); if (canAdvance()) moveTo(index+1); queueAutoplay(); });

    track.tabIndex = 0;
    track.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowRight'){ e.preventDefault(); stopAutoplay(); if (canAdvance()) moveTo(index+1); queueAutoplay(); }
      if(e.key==='ArrowLeft'){  e.preventDefault(); stopAutoplay(); if (canAdvance()) moveTo(index-1); queueAutoplay(); }
    });

    // —— 触摸/拖拽 —— 
    let sx=0, sy=0, dx=0, dy=0, startT=0, dragging=false, baseX=0, intent=false;
    track.addEventListener('touchstart', onStart, {passive:true});
    track.addEventListener('mousedown', onStart);
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('resize', ()=>{ width = track.clientWidth; instantTo(index); });

    function onStart(e){
      const p = 'touches' in e ? e.touches[0] : e;
      sx=p.clientX; sy=p.clientY; dx=dy=0;
      dragging=true; startT=performance.now();
      baseX = -index*width;
      intent=false;
      stopAutoplay();
      cancelAnim();
    }
    function onMove(e){
      if(!dragging) return;
      const p = 'touches' in e ? e.touches[0] : e;
      dx = p.clientX - sx; dy = p.clientY - sy;

      if(!intent){
        if(Math.abs(dx) < MIN_DEADZONE) return;
        if(Math.abs(dx) < Math.abs(dy)*HORIZ_RATIO) return;
        intent = true;
      }
      e.preventDefault();
      translateX(baseX + dx);
    }
    function onEnd(){
      if(!dragging) return; dragging=false;
      const dt = Math.max(1, performance.now()-startT);
      const velocity = dx / dt;
      const travel = Math.abs(dx)/width;
      let target = index;

      if(Math.abs(dx) < TAP_MAX){
        target = index; // 轻扫/点击
      }else if(Math.abs(velocity) > FLICK_VEL || travel > SWIPE_THRESH || Math.abs(velocity) > SWIPE_VEL){
        target = dx < 0 ? index+1 : index-1;
      }
      glideTo(target);
      queueAutoplay();
    }

    // —— 动画切换 —— 
    let anim=null, rafId=null;

    function canAdvance(){ return (performance.now() - lastChangeAt) > MIN_DWELL; }

    function moveTo(target, smooth=true){
      if (canLoop){
        if(target<=0){ if(target===-1) target=0; }
        if(target>=slides.length-1){ if(target===slides.length) target=slides.length-1; }
      }else{
        target = Math.max(0, Math.min(slides.length-1, target));
      }

      if(target !== index && !canAdvance()) return;

      index = target;
      setDots(trackToReal(index));
      playIfVideo(index);
      announce();

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

    function glideTo(target){ moveTo(target, true); }

    function step(){
      if(!anim) return;
      anim.x += (anim.to - anim.x) * EASE;
      if(Math.abs(anim.to - anim.x) < .5){
        anim.x = anim.to; cancelAnim();
      }else{
        rafId = requestAnimationFrame(step);
      }
      translateX(anim.x);

      if(canLoop){
        if(index===slides.length-1 && Math.abs(anim.to - anim.x) < .6){
          index = 1; instantTo(index);
        }else if(index===0 && Math.abs(anim.to - anim.x) < .6){
          index = slides.length-2; instantTo(index);
        }
      }
    }

    function cancelAnim(){ if(rafId){ cancelAnimationFrame(rafId); rafId=null; } anim=null; }
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

    // 当前页视频播放，其他暂停；失败则仅显示 poster
    function playIfVideo(i){
      const allV = track.querySelectorAll('video');
      allV.forEach(v=>{ try{ v.pause(); }catch{} });
      const v = slides[i]?.querySelector?.('video');
      if(v){
        v.muted = true; v.playsInline = true; v.loop = true;
        v.play().catch(()=>{/* 自动播放被阻止时，保持 poster 即可 */});
      }
    }

    function announce(){
      if(!live) return;
      const real = trackToReal(index) + 1;
      live.textContent = `第 ${real} 张，共 ${realCount} 张`;
    }

    // 初始化
    instantTo(index);
    if (canAutoplay) startAutoplay();
  }
})();