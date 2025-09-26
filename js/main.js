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
  const MAX_SIZE = 10 * 1024 * 1024;

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

/* ========= 首屏门控 ========= */
let firstScreenGate = true;
const productsSection = document.getElementById('products');
const FIRST_GATE_OFFSET = 120;
function refreshFirstScreenGate() {
  if (!productsSection) { firstScreenGate = false; return; }
  const triggerY = productsSection.offsetTop - FIRST_GATE_OFFSET;
  firstScreenGate = window.scrollY < triggerY;
  document.querySelectorAll('.card.product.u3').forEach(c => c._u3 && c._u3.syncAutoplay());
}
addEventListener('scroll', refreshFirstScreenGate, { passive:true });
addEventListener('resize', refreshFirstScreenGate);
document.addEventListener('DOMContentLoaded', refreshFirstScreenGate);

/* ========= U3：箭头 + 进度条 + 自动轮播 ========= */
(function onReady(fn){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
  else fn();
})(function initU3(){

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
  const AUTOPLAY_DELAY = 3000, RESUME_AFTER = 5000, OBS_THRESHOLD = 0.6, EPS = 0.001;
  const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));
  const getIndex = (vp)=> Math.round((vp.scrollLeft + EPS) / Math.max(1, vp.clientWidth));

  function ensureControls(card){
    const vp = card.querySelector('.main-viewport'); if (!vp) return null;
    vp.style.position = vp.style.position || 'relative';

    let prog = card.querySelector('.progress');
    if (!prog){ prog = document.createElement('div'); prog.className='progress'; prog.innerHTML='<i></i>'; vp.appendChild(prog); }
    const fill = prog.querySelector('i');

    let left = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if (!left || !right) {
      left  = document.createElement('button'); right = document.createElement('button');
      left.className='nav-arrow left'; right.className='nav-arrow right';
      left.setAttribute('aria-label','Previous'); right.setAttribute('aria-label','Next');
      left.innerHTML='&#8249;'; right.innerHTML='&#8250;';
      vp.append(left,right);
    }

    // 图片放底层 & 不拦点击
    card.querySelectorAll('.slide .cover').forEach(img=>{
      img.style.zIndex='0'; img.style.pointerEvents='none';
      img.style.position = img.style.position || 'absolute';
      img.style.inset = img.style.inset || '0';
      img.style.objectFit = img.style.objectFit || 'cover';
      img.style.width = img.style.width || '100%';
      img.style.height = img.style.height || '100%';
    });

    [prog,left,right].forEach(el=>{
      el.style.position = el.style.position || 'absolute';
      el.style.zIndex = el.style.zIndex || '99';
    });

    return { vp, fill, left, right };
  }

  function initCard(card){
    if (card._u3Inited) return;
    const refs = ensureControls(card); if (!refs) return;
    const { vp, fill, left, right } = refs;
    const slides = card.querySelectorAll('.slide');
    const len = slides.length || 1;

    const update = (i=getIndex(vp))=>{
      left.classList.toggle('is-disabled',  i<=0);
      right.classList.toggle('is-disabled', i>=len-1);
      fill.style.width = `${((i+1)/len)*100}%`;
    };

    const goTo = (i)=>{
      i = clamp(i, 0, len-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
    };

    const api = {
      timer:null, resumeTimer:null, pausedByUser:false, visible:true,
      start(){ if (prefersReduced) return; if (this.timer) return;
        this.timer = setInterval(()=>{ const i=getIndex(vp); goTo(i+1>=len?0:i+1); }, AUTOPLAY_DELAY); },
      stop(){ if (this.timer){ clearInterval(this.timer); this.timer=null; } },
      allow(){ if (firstScreenGate) return false; if (document.hidden) return false; if (!this.visible) return false; if (this.pausedByUser) return false; return true; },
      syncAutoplay(){ this.stop(); if (this.allow()) this.start(); }
    };
    card._u3 = api;

    const pause = ()=>{
      api.pausedByUser = true; api.stop();
      clearTimeout(api.resumeTimer);
      api.resumeTimer = setTimeout(()=>{ api.pausedByUser=false; api.syncAutoplay(); }, RESUME_AFTER);
    };

    left.addEventListener('click',  ()=>{ pause(); goTo(getIndex(vp)-1); });
    right.addEventListener('click', ()=>{ pause(); goTo(getIndex(vp)+1); });

    vp.setAttribute('tabindex','0');
    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); pause(); goTo(getIndex(vp)-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); pause(); goTo(getIndex(vp)+1); }
      if(e.key==='Home'){ e.preventDefault(); pause(); goTo(0); }
      if(e.key==='End'){ e.preventDefault(); pause(); goTo(len-1); }
    });

    let st; vp.addEventListener('scroll', ()=>{ clearTimeout(st); st=setTimeout(()=>update(getIndex(vp)),90); }, {passive:true});
    let rt; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>goTo(getIndex(vp)),120); });

    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(es=>{
        es.forEach(e=>{ api.visible = e.isIntersecting && e.intersectionRatio>=0.6; api.syncAutoplay(); });
      }, { threshold:[0.6] });
      io.observe(card);
    }

    document.addEventListener('visibilitychange', ()=> api.syncAutoplay());

    update(0);
    api.syncAutoplay();

    card._u3Inited = true;
  }

  document.querySelectorAll('.card.product.u3').forEach(initCard);

  const mo = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes && m.addedNodes.forEach(n=>{
        if (!(n instanceof HTMLElement)) return;
        if (n.matches && n.matches('.card.product.u3')) initCard(n);
        n.querySelectorAll && n.querySelectorAll('.card.product.u3').forEach(initCard);
      });
    });
  });
  mo.observe(document.body, { childList:true, subtree:true });
});