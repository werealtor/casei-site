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

/* ========= 价格加载 ========= */
const fmtUSD = (n) => {
  try { return new Intl.NumberFormat(navigator.language || 'en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n); }
  catch { return `$${n}`; }
};
let PRICE_MAP = null;

async function loadPrices() {
  if (PRICE_MAP) return PRICE_MAP;
  try {
    const res = await fetch('/prices.json', { cache: 'no-store' });
    PRICE_MAP = await res.json();
  } catch {
    PRICE_MAP = { classic: 19, fashion: 25, business: 29 };
  }
  return PRICE_MAP;
}
function pickPrice(map, id, i) {
  if (!map || !(id in map)) return null;
  const v = map[id];
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v[i] ?? v[v.length-1];
  if (v && typeof v === 'object') {
    const k = String(i+1);
    return v[k] ?? v[Object.keys(v).sort((a,b)=>+a-+b)[0]];
  }
  return null;
}

/* ========= U3 Slider（箭头 + 进度条 + 价格联动） ========= */
function setupSliders() {
  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const pid = card.dataset.product;
    const totalSlides = parseInt(card.dataset.slides || '7', 10);

    const vp    = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    if (!vp || !track) return;

    // 如无 slide，自动注入 1..N
    if (track.children.length === 0) {
      const html = Array.from({length: totalSlides}, (_,i)=>(
        `<div class="slide"><img class="cover" src="assets/images/${pid}/${i+1}.jpg" alt="${pid} ${i+1}" draggable="false"></div>`
      )).join('');
      track.innerHTML = html;
    }

    // 确保必要的层级
    if (getComputedStyle(vp).position === 'static') vp.style.position = 'relative';
    track.style.position = track.style.position || 'relative';
    card.querySelectorAll('.slide,.slide .cover').forEach(el=>{
      if (getComputedStyle(el).position === 'static') el.style.position='relative';
      el.style.zIndex = '0';
    });

    // 统一清除旧箭头/进度条再创建
    vp.querySelectorAll('.nav-arrow,.progress').forEach(el=>el.remove());

    const left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;';
    const right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next');     right.innerHTML='&#8250;';
    const progress = document.createElement('div'); progress.className='progress'; progress.innerHTML = '<i></i>';

    vp.append(left, right, progress);
    const fill = progress.querySelector('i');

    const slides = track.querySelectorAll('.slide');
    const priceEl = card.querySelector('.price');

    const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));
    const goTo = (i)=>{
      i = Math.max(0, Math.min(i, slides.length-1));
      vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
      update(i);
    };
    const update = (i=getIndex())=>{
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
      fill.style.width = `${((i+1)/slides.length)*100}%`;
      if (PRICE_MAP && priceEl) {
        const p = pickPrice(PRICE_MAP, pid, i);
        if (p != null) priceEl.textContent = fmtUSD(p);
      }
    };

    left.addEventListener('click', ()=> goTo(getIndex()-1));
    right.addEventListener('click',()=> goTo(getIndex()+1));
    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
    });
    vp.addEventListener('scroll', (()=>{let t; return ()=>{ clearTimeout(t); t=setTimeout(()=>update(getIndex()), 80); };})(), {passive:true});
    window.addEventListener('resize', (()=>{let t; return ()=>{ clearTimeout(t); t=setTimeout(()=>update(getIndex()), 120); };})());

    update(0);
  });
}

// 初始化顺序：先拉价格，再装配滑块
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadPrices();
  setupSliders();

  // 注册 SW（可选）
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('/sw.js'); } catch {}
  }
});