/* ===========================
 * Case&i main.js (7张/联动价格)
 * 优先级：prices.json > config.json(price 数字/数组) > “暂无报价”
 * =========================== */

/* 主题切换 */
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

/* 移动端菜单 */
const menuToggle = document.querySelector('.menu-toggle');
const headerEl = document.querySelector('header');
if (menuToggle && headerEl) {
  menuToggle.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', headerEl.classList.contains('open'));
  });
}

/* 上传预览 */
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

/* 工具 */
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const debounce=(fn,wait=90)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}
const fmtMoney=(num,currency='USD',locale=(navigator.language||'en-US'))=>{
  try{ return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(num); }
  catch{ return `$${num}`; }
};
const fmtOrNA=(v,c,loc)=> (v==null||Number.isNaN(v)) ? '暂无报价' : fmtMoney(v,c,loc);

async function fetchJSON(url){
  try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
  catch{ return null; }
}

/* 价格来源：prices.json > config.json */
function priceFromPricesJSON(map,id,idx0){
  if(!map||!(id in map)) return null;
  const v = map[id];
  if(typeof v==='number') return v;
  if(Array.isArray(v)) return v[idx0] ?? null;                      // 数组：按索引
  if(v && typeof v==='object'){                                     // 对象：{"1":19,"2":20}
    const k1=String(idx0+1), k0=String(idx0);
    return v[k1] ?? v[k0] ?? null;
  }
  return null;
}
function priceFromConfig(prod,idx0){
  const p=prod?.price;
  if(typeof p==='number') return p;                                  // 单价
  if(Array.isArray(p)) return p[idx0] ?? null;                       // 数组
  return null;
}
function getPrice({pricesMap,prod,idx0}){
  const v1 = priceFromPricesJSON(pricesMap, prod.id, idx0);
  if(v1!=null) return v1;
  const v2 = priceFromConfig(prod, idx0);
  if(v2!=null) return v2;
  return null;
}

/* 若 main-track 为空，则按 config.json 注入 slides；并为每张 slide 写入 data-price */
async function ensureSlidesAndSeedPrice(){
  const cfg = await fetchJSON('config.json');       // 可选；只用于补 slides 或基础价
  const prices = await fetchJSON('prices.json');    // 建议提供；用于精确定价
  const currency = cfg?.settings?.currency || 'USD';
  const locale = (navigator.language || 'en-US');

  // 构建一份以 data-product 为主的产品列表
  const domProducts = [...document.querySelectorAll('.card.product')].map(card => card.getAttribute('data-product'));
  const cfgMap = Object.fromEntries((cfg?.products||[]).map(p=>[p.id,p]));

  domProducts.forEach(pid=>{
    const card = document.querySelector(`.card.product[data-product="${pid}"]`);
    if(!card) return;
    const prod = cfgMap[pid] || { id: pid }; // 即使没有 config.json 也继续
    const vp = card.querySelector('.main-viewport');
    let track = card.querySelector('.main-track');
    if(!vp) return;
    if(!track){ track=document.createElement('div'); track.className='main-track'; vp.prepend(track); }

    // 若没有任何 slide，且 config.json 提供了 images，则注入
    if(track.children.length===0 && Array.isArray(prod.images)){
      prod.images.forEach((src,i)=>{
        const slide=document.createElement('div'); slide.className='slide';
        const img=document.createElement('img'); img.className='cover'; img.src=src; img.alt=`${prod.name||prod.id} — ${i+1}`; img.draggable=false;
        slide.appendChild(img); track.appendChild(slide);
      });
    }

    // 为每个 slide 写 data-price
    const slides = track.querySelectorAll('.slide');
    slides.forEach((sl,i)=>{
      const num = getPrice({pricesMap:prices, prod, idx0:i});
      sl.dataset.price = fmtOrNA(num, currency, locale);
      sl.dataset.na = (num==null) ? '1' : '';
    });

    // 进度条（缺则补）
    let progress = card.querySelector('.progress');
    if(!progress){ progress=document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }

    // 初始价格
    const priceEl = card.querySelector('.price');
    if(priceEl){
      const first = track.querySelector('.slide');
      const txt = first?.dataset?.price || fmtOrNA(getPrice({pricesMap:prices, prod, idx0:0}),currency,locale);
      priceEl.textContent = txt;
      priceEl.classList.toggle('is-na', (first?.dataset?.na==='1') || txt==='暂无报价');
    }
  });
}

/* 安装滑块：箭头/进度条/价格联动 */
function initSliders(){
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    let slides = card.querySelectorAll('.slide');
    if(!vp || !track || !slides.length) return;

    // 进度条、箭头
    let progress = card.querySelector('.progress'); if(!progress){ progress=document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }
    let fill = progress.querySelector('i');
    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if(!left){ left=document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;'; vp.appendChild(left); }
    if(!right){ right=document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.innerHTML='&#8250;'; vp.appendChild(right); }

    const priceEl = card.querySelector('.price');
    const getIndex = ()=> Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

    function update(i=getIndex()){
      slides = card.querySelectorAll('.slide');
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);

      // 价格联动：读当前 slide 的 data-price
      if(priceEl){
        const p = slides[i]?.dataset?.price || '暂无报价';
        priceEl.textContent = p;
        priceEl.classList.toggle('is-na', (slides[i]?.dataset?.na==='1') || p==='暂无报价');
      }
      // 进度条联动
      fill.style.width = `${((i+1)/slides.length)*100}%`;
    }

    function goTo(i){
      i = clamp(i,0,slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior });
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
  });
}

/* 启动 */
(async function boot(){
  await ensureSlidesAndSeedPrice(); // 补 slides + 写入 data-price
  initSliders();                    // 安装联动
})();