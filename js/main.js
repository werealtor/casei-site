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

/* ========= 上传预览（显示文件名 & 大小限制） ========= */
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

/* ========= 首屏自动暂停（滚到产品区再启播） ========= */
let firstScreenGate = true;
const productsSection = document.getElementById('products');
const FIRST_GATE_OFFSET = 120; // 提前阈值
function refreshFirstScreenGate() {
  if (!productsSection) { firstScreenGate = false; return; }
  const triggerY = productsSection.offsetTop - FIRST_GATE_OFFSET;
  firstScreenGate = window.scrollY < triggerY;
  document.querySelectorAll('.card.product.u3').forEach(c => c._sliderAPI && c._sliderAPI.syncAutoplay());
}
window.addEventListener('scroll', refreshFirstScreenGate, { passive:true });
window.addEventListener('resize', refreshFirstScreenGate);
document.addEventListener('DOMContentLoaded', refreshFirstScreenGate);

/* ========= U3：箭头 + 进度条 + 自动轮播（稳健版） ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
  const AUTOPLAY_DELAY = 3000;
  const RESUME_AFTER   = 5000;
  const OBS_THRESHOLD  = 0.6;
  const EPS            = 0.001;

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

  const getIndexBy = (vp)=> Math.round((vp.scrollLeft + EPS) / Math.max(1, vp.clientWidth));
  const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    const fill = card.querySelector('.progress i');
    if (!vp || !slides.length || !fill) return;

    // 箭头
    const left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;';
    const right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next');     right.innerHTML='&#8250;';
    vp.append(left,right);

    // 初始短暂显现，确保可见
    requestAnimationFrame(()=>{ [left,right].forEach(a=>a.classList.add('is-visible')); setTimeout(()=>[left,right].forEach(a=>a.classList.remove('is-visible')),1200); });

    const len = slides.length;

    const update = (i=getIndexBy(vp))=>{
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=len-1);
      fill.style.width = `${((i+1)/len)*100}%`;
    };

    const goTo = (i)=>{
      i = clamp(i, 0, len-1);
      const target = i * vp.clientWidth; // iOS 浮点误差规避
      vp.scrollTo({ left: target, behavior: scrollBehavior });
      update(i);
      showArrows();
    };

    // 箭头显隐（交互时短显）
    let hideTimer;
    const showArrows = ()=>{
      [left,right].forEach(a=>a.classList.add('is-visible'));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(()=>[left,right].forEach(a=>a.classList.remove('is-visible')),1500);
    };
    ['mousemove','click','keydown','scroll','touchstart','touchmove'].forEach(evt=>{
      vp.addEventListener(evt, showArrows, {passive:true});
    });

    // 自动轮播 API
    const api = {
      timer:null, resumeTimer:null, pausedByUser:false, visible:true,
      start(){ if (prefersReduced) return; if (this.timer) return;
        this.timer=setInterval(()=>{ const i=getIndexBy(vp); goTo(i+1>=len?0:i+1); }, AUTOPLAY_DELAY); },
      stop(){ if (this.timer){ clearInterval(this.timer); this.timer=null; } },
      allow(){ if (firstScreenGate) return false; if (document.hidden) return false; if (!this.visible) return false; if (this.pausedByUser) return false; return true; },
      syncAutoplay(){ this.stop(); if (this.allow()) this.start(); }
    };
    card._sliderAPI = api;

    // 交互 → 暂停，5s 无交互恢复
    const pauseTemporarily = ()=>{
      api.pausedByUser = true; api.stop();
      clearTimeout(api.resumeTimer);
      api.resumeTimer = setTimeout(()=>{ api.pausedByUser=false; api.syncAutoplay(); }, RESUME_AFTER);
    };
    left.addEventListener('click', ()=>{ pauseTemporarily(); goTo(getIndexBy(vp)-1); });
    right.addEventListener('click',()=>{ pauseTemporarily(); goTo(getIndexBy(vp)+1); });

    // 键盘可用
    vp.setAttribute('tabindex','0');
    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); pauseTemporarily(); goTo(getIndexBy(vp)-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); pauseTemporarily(); goTo(getIndexBy(vp)+1); }
      if(e.key==='Home'){ e.preventDefault(); pauseTemporarily(); goTo(0); }
      if(e.key==='End'){ e.preventDefault(); pauseTemporarily(); goTo(len-1); }
    });

    // 滚动/尺寸
    let st; vp.addEventListener('scroll', ()=>{ clearTimeout(st); st=setTimeout(()=>update(getIndexBy(vp)),90); }, {passive:true});
    let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>goTo(getIndexBy(vp)),120); });

    if (io) io.observe(card);
    document.addEventListener('visibilitychange', ()=> api.syncAutoplay());

    // 初始
    update(0); showArrows(); api.syncAutoplay();
  });
})();