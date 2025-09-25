/* ========= 主题切换 ========= */
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  let theme = localStorage.getItem('theme') ||
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.classList.toggle('dark', theme === 'dark');
  themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

/* ========= 移动端菜单 ========= */
const menuToggle = document.querySelector('.menu-toggle');
const headerEl = document.querySelector('header');
if (menuToggle && headerEl) {
  menuToggle.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', headerEl.classList.contains('open'));
  });
}

/* ========= 上传预览 ========= */
const uForm = document.getElementById('uForm');
if (uForm) {
  const fileInput = document.getElementById('file');
  const nameEl = document.getElementById('fileName');
  const err = document.getElementById('uErr');
  const preview = document.getElementById('preview');
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) { nameEl.textContent = 'PNG/JPEG · < 10MB'; return; }
    const f = fileInput.files[0];
    nameEl.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });

  uForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files[0];
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) { err.textContent = 'Only PNG/JPEG supported.'; return; }
    if (f.size > MAX_SIZE) { err.textContent = 'File too large (max 10MB).'; return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
      err.textContent = '';
    };
    reader.readAsDataURL(f);
  });
}

/* ========= 首屏门控 + U3 轮播 ========= */
let firstScreenGate = true;
const productsSection = document.getElementById('products');
const FIRST_GATE_OFFSET = 120;
function refreshFirstScreenGate() {
  if (!productsSection) { firstScreenGate = false; return; }
  const triggerY = productsSection.offsetTop - FIRST_GATE_OFFSET;
  firstScreenGate = window.scrollY < triggerY;
  document.querySelectorAll('.card.product.u3').forEach(c => c._sliderAPI && c._sliderAPI.syncAutoplay());
}
window.addEventListener('scroll', refreshFirstScreenGate, { passive:true });
window.addEventListener('resize', refreshFirstScreenGate);
document.addEventListener('DOMContentLoaded', refreshFirstScreenGate);

/* ========= U3：更稳的箭头/进度条/自动轮播 ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
  const AUTOPLAY_DELAY = 3000;      // 自动轮播间隔
  const RESUME_AFTER   = 5000;      // 用户交互后恢复时间
  const OBS_THRESHOLD  = 0.6;       // 进入视口阈值
  const EPS            = 0.001;     // 浮点误差修正

  // 可见性观察：卡片可见才允许自动播放
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          const card = entry.target;
          const api = card._sliderAPI; if(!api) return;
          api.visible = entry.isIntersecting && entry.intersectionRatio >= OBS_THRESHOLD;
          api.syncAutoplay();
        });
      }, { threshold:[OBS_THRESHOLD] })
    : null;

  // 辅助：更稳的 index 计算（修正分辨率/缩放下的取整误差）
  const getIndexBy = (vp)=> {
    const idx = (vp.scrollLeft + EPS) / Math.max(1, vp.clientWidth);
    return Math.round(idx);
  };

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp     = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    const fill   = card.querySelector('.progress i');

    if (!vp || !slides.length || !fill) return;

    // 生成左右箭头（一次性）
    const left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;';
    const right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next');     right.innerHTML='&#8250;';
    vp.append(left,right);

    // 初始“闪现”一下，解决“有时看不见”的第一印象问题
    requestAnimationFrame(()=>{ [left,right].forEach(a=>a.classList.add('is-visible')); setTimeout(()=>[left,right].forEach(a=>a.classList.remove('is-visible')),1200); });

    // 状态与方法
    const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));
    const len   = slides.length;

    const update = (i=getIndexBy(vp))=>{
      left.classList.toggle('is-disabled',  i<=0);
      right.classList.toggle('is-disabled', i>=len-1);
      fill.style.width = `${((i+1)/len)*100}%`;
    };

    const goTo = (i)=>{
      i = clamp(i, 0, len-1);
      // 为了避免 iOS 上 scrollTo 的累积误差，先计算目标 left
      const target = i * vp.clientWidth;
      vp.scrollTo({ left: target, behavior: scrollBehavior });
      update(i);
      showArrows();
    };

    // 箭头显隐逻辑（触摸/键盘/滚动都触发）
    let hideTimer;
    const showArrows = ()=>{
      [left,right].forEach(a=>a.classList.add('is-visible'));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(()=>[left,right].forEach(a=>a.classList.remove('is-visible')), 1500);
    };
    ['mousemove','click','keydown','scroll','touchstart','touchmove'].forEach(evt=>{
      vp.addEventListener(evt, showArrows, {passive:true});
    });

    // 用户交互时暂停自动播放，若 5s 无交互再恢复
    const api = {
      timer:null, resumeTimer:null, pausedByUser:false, visible:true,
      start(){ if (prefersReduced) return; if (this.timer) return;
        this.timer = setInterval(()=>{
          const i = getIndexBy(vp);
          goTo(i+1 >= len ? 0 : i+1);
        }, AUTOPLAY_DELAY);
      },
      stop(){ if (this.timer){ clearInterval(this.timer); this.timer=null; } },
      allow(){ if (window.firstScreenGate) return false; if (document.hidden) return false; if (!this.visible) return false; if (this.pausedByUser) return false; return true; },
      syncAutoplay(){ this.stop(); if (this.allow()) this.start(); }
    };
    card._sliderAPI = api;

    const pauseTemporarily = ()=>{
      api.pausedByUser = true; api.stop();
      clearTimeout(api.resumeTimer);
      api.resumeTimer = setTimeout(()=>{ api.pausedByUser = false; api.syncAutoplay(); }, RESUME_AFTER);
    };

    left.addEventListener('click',  ()=>{ pauseTemporarily(); goTo(getIndexBy(vp)-1); });
    right.addEventListener('click', ()=>{ pauseTemporarily(); goTo(getIndexBy(vp)+1); });

    // 键盘可用（确保 viewport 有 tabindex="0"）
    vp.setAttribute('tabindex','0');
    vp.addEventListener('keydown', e=>{
      if (e.key === 'ArrowLeft'){ e.preventDefault(); pauseTemporarily(); goTo(getIndexBy(vp)-1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); pauseTemporarily(); goTo(getIndexBy(vp)+1); }
      if (e.key === 'Home'){ e.preventDefault(); pauseTemporarily(); goTo(0); }
      if (e.key === 'End'){ e.preventDefault(); pauseTemporarily(); goTo(len-1); }
    });

    // 滚动/尺寸变化：去抖并强制刷新状态
    let st; vp.addEventListener('scroll', ()=>{ clearTimeout(st); st=setTimeout(()=>update(getIndexBy(vp)), 80); }, {passive:true});
    let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ goTo(getIndexBy(vp)); }, 120); });

    if (io) io.observe(card);
    document.addEventListener('visibilitychange', ()=> api.syncAutoplay());

    // 初始同步
    update(0); api.syncAutoplay();
  });
})();