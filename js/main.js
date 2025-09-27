/* ========= 主题切换 ========= */
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  const theme = localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
    reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; err.textContent = ''; };
    reader.readAsDataURL(f);
  });
}

/* ========= 工具 ========= */
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const debounce=(fn,wait=90)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}};
const fmtMoney=(num,currency='USD',locale=(navigator.language||'en-US'))=>{
  try{ return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(num); }
  catch{ return `$${num}`; }
};
async function fetchJSON(url){ try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); } catch{ return null; } }

/* ========= 价格加载（带兜底 & 全局缓存） ========= */
const FALLBACK_PRICES = {
  classic: [19,19,19,19,19,19,19],
  fashion: [25,26,27,28,29,30,31],
  business: {1:29,2:31,3:33,4:34,5:36,6:38,7:40}
};
async function loadPrices() {
  let prices = null;
  try {
    const r = await fetch('prices.json', { cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') || '').includes('application/json')) {
      prices = await r.json();
    } else {
      console.warn('[prices.json] status/type:', r.status, r.headers.get('content-type'));
    }
  } catch (e) {
    console.warn('[prices.json] fetch failed:', e);
  }
  if (!prices) prices = FALLBACK_PRICES;
  window.__prices__ = prices;
  return prices;
}

/* ========= 价格映射 ========= */
function priceFromMap(map,id,idx0){
  if(!map||!(id in map)) return null;
  const v = map[id];
  if(typeof v==='number') return v;
  if(Array.isArray(v)) return v[idx0] ?? v[v.length-1] ?? null;
  if(v && typeof v==='object'){
    const k1=String(idx0+1), k0=String(idx0);
    if(v[k1]!=null) return v[k1];
    if(v[k0]!=null) return v[k0];
    const keys=Object.keys(v).sort((a,b)=>+a-+b);
    return v[keys[0]] ?? null;
  }
  return null;
}

/* ========= 补丁版：初始化一个卡片的滑块（层级 & 结构修复） ========= */
function initCardSlider(card, prices, currency='USD'){
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  if(!vp || !track) return;

  /* —— 关键：确保箭头 & 进度条是 viewport 的直接子元素，且层级最高 —— */
  // 进度条
  let progress = card.querySelector('.progress');
  if(!progress){
    progress = document.createElement('div');
    progress.className = 'progress';
    progress.innerHTML = '<i></i>';
    vp.appendChild(progress);
  } else if (progress.parentElement !== vp) {
    // 如果误放到了别处，移动到 vp 下
    vp.appendChild(progress);
  }
  const fill = progress.querySelector('i');

  // 箭头
  let left  = card.querySelector('.nav-arrow.left');
  let right = card.querySelector('.nav-arrow.right');
  if(!left){
    left = document.createElement('button');
    left.className = 'nav-arrow left';
    left.setAttribute('aria-label','Previous');
    left.innerHTML = '&#8249;';
    vp.appendChild(left);
  } else if (left.parentElement !== vp) {
    vp.appendChild(left);
  }
  if(!right){
    right = document.createElement('button');
    right.className = 'nav-arrow right';
    right.setAttribute('aria-label','Next');
    right.innerHTML = '&#8250;';
    vp.appendChild(right);
  } else if (right.parentElement !== vp) {
    vp.appendChild(right);
  }

  // 再保险：viewport 创建堆叠上下文，图片层压到底
  if (getComputedStyle(vp).position === 'static') vp.style.position = 'relative';
  track.style.position = track.style.position || 'relative';
  card.querySelectorAll('.slide, .slide .cover').forEach(el=>{
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.zIndex = 0; // 图片层置底
  });

  const slides  = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const pid     = card.dataset.product;
  const getIndex = ()=> Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

  function update(i=getIndex()){
    left.classList.toggle('is-disabled', i<=0);
    right.classList.toggle('is-disabled', i>=slides.length-1);
    fill.style.width = `${((i+1)/slides.length)*100}%`;

    if(priceEl){
      const p = priceFromMap(prices, pid, i);
      priceEl.textContent = p==null ? '—' : fmtMoney(p, currency);
      priceEl.classList.toggle('is-na', p==null);
    }
  }
  function goTo(i){
    i = clamp(i, 0, slides.length-1);
    vp.scrollTo({ left: i*vp.clientWidth, behavior: 'smooth' });
    update(i);
  }

  left.addEventListener('click', ()=> goTo(getIndex()-1));
  right.addEventListener('click',()=> goTo(getIndex()+1));
  vp.addEventListener('keydown', e=>{
    if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
    if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
    if(e.key==='Home'){ e.preventDefault(); goTo(0); }
    if(e.key==='End'){ e.preventDefault(); goTo(slides.length-1); }
  });
  vp.addEventListener('scroll', debounce(()=>update(getIndex()),80), {passive:true});
  window.addEventListener('resize', debounce(()=>update(getIndex()),120));

  update(0);
}

/* ========= 启动 ========= */
(async function boot(){
  const prices = await loadPrices();          // 持久加载价格
  const currency = 'USD';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    // 如果 track 为空，提供兜底：自动拼 1~7.jpg
    const track = card.querySelector('.main-track');
    if(track && track.children.length===0){
      const pid = card.dataset.product;
      track.innerHTML = Array.from({length:7},(_,i)=>(
        `<div class="slide"><img class="cover" src="assets/images/${pid}/${i+1}.jpg" alt="${pid} ${i+1}" draggable="false" /></div>`
      )).join('');
    }
    initCardSlider(card, prices, currency);
  });
})();