/* =========================================
 * Case&i main.js — 支持 prices.json + config.price(数组/数字) 的价格联动
 * ========================================= */

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
    if (!fileInput.files.length) { nameEl.textContent = 'PNG/JPEG · < 10 MB'; return; }
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

/* ========= 工具 ========= */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const debounce = (fn, wait = 90) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
const fmtMoney = (num, currency = 'USD', locale = (navigator.language || 'en-US')) => {
  try { return new Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits:0 }).format(num); }
  catch { return `$${num}`; }
};
const fmtOrNA = (val, currency, locale) => (val == null || Number.isNaN(val)) ? '暂无报价' : fmtMoney(val, currency, locale);

async function fetchJSON(url){
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`fetch ${url} failed`);
    return await res.json();
  } catch { return null; }
}

/* ========= 价格来源优先级：prices.json > config.price(数组/数字) ========= */
function getPriceFromPricesJSON(pricesMap, productId, slideIndexZero) {
  if (!pricesMap || !(productId in pricesMap)) return null;
  const val = pricesMap[productId];
  if (typeof val === 'number') return val;                         // 统一价
  if (Array.isArray(val)) return val[slideIndexZero] ?? null;      // 数组
  if (val && typeof val === 'object') {                            // 对象：{"1":19,"2":20}
    const k1 = String(slideIndexZero + 1);
    const k0 = String(slideIndexZero);
    return (val[k1] ?? val[k0] ?? null);
  }
  return null;
}
function getPriceFromConfig(prod, slideIndexZero) {
  const p = prod?.price;
  if (typeof p === 'number') return p;                              // 单价
  if (Array.isArray(p)) return p[slideIndexZero] ?? null;           // 数组
  return null;
}
function getPriceForSlide({pricesMap, prod, slideIndexZero}) {
  // 1) prices.json 优先
  const v1 = getPriceFromPricesJSON(pricesMap, prod.id, slideIndexZero);
  if (v1 != null) return v1;
  // 2) config.json 的 price（数字/数组）
  const v2 = getPriceFromConfig(prod, slideIndexZero);
  if (v2 != null) return v2;
  // 3) 缺价
  return null;
}

/* ========= 构建卡片：按 config.images 渲染 slides，并写入 data-price ========= */
async function buildFromConfigAndPrices() {
  const cfg = await fetchJSON('config.json');
  const prices = await fetchJSON('prices.json'); // 可不存在
  const currency = cfg?.settings?.currency || 'USD';
  const locale = (navigator.language || 'en-US');

  if (!cfg || !Array.isArray(cfg.products)) return;

  cfg.products.forEach(prod => {
    const card = document.querySelector(`.card.product[data-product="${prod.id}"]`);
    if (!card) return;

    const vp = card.querySelector('.main-viewport');
    let track  = card.querySelector('.main-track');
    let progress = card.querySelector('.progress');
    if (!vp) return;
    if (!track)   { track = document.createElement('div'); track.className = 'main-track'; vp.appendChild(track); }
    if (!progress){ progress = document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }

    // 渲染 slides（以 config.images 为准）
    if (Array.isArray(prod.images) && prod.images.length) {
      track.innerHTML = '';
      prod.images.forEach((src, idx) => {
        const priceNum = getPriceForSlide({ pricesMap: prices, prod, slideIndexZero: idx });
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.dataset.price = fmtOrNA(priceNum, currency, locale);
        slide.dataset.na = (priceNum == null) ? '1' : '';
        const img = document.createElement('img');
        img.className = 'cover';
        img.src = src;
        img.alt = `${prod.name || prod.id} — ${idx+1}`;
        img.draggable = false;
        slide.appendChild(img);
        track.appendChild(slide);
      });
    } else {
      // 没有 images 就保持原有 DOM，不额外处理
    }

    // 初始价格（第一张）
    const priceEl = card.querySelector('.price');
    if (priceEl) {
      const firstSlide = card.querySelector('.slide');
      const txt = firstSlide?.dataset?.price || fmtOrNA(getPriceForSlide({ pricesMap: prices, prod, slideIndexZero: 0 }), currency, locale);
      priceEl.textContent = txt;
      priceEl.classList.toggle('is-na', (firstSlide?.dataset?.na === '1') || txt === '暂无报价');
    }
  });
}

/* ========= 初始化滑块（箭头/进度条/价格联动） ========= */
function initSliders() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card => {
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    if (!vp || !slides.length) return;

    let progress = card.querySelector('.progress');
    if (!progress) { progress = document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }
    let fill = progress.querySelector('i'); if (!fill) { fill = document.createElement('i'); progress.appendChild(fill); }

    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if (!left)  { left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;'; vp.appendChild(left); }
    if (!right) { right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next');     right.innerHTML='&#8250;'; vp.appendChild(right); }

    const priceEl = card.querySelector('.price');
    const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

    function goTo(i){
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior });
      update(i);
    }

    function update(i = getIndex()){
      left.classList.toggle('is-disabled',  i <= 0);
      right.classList.toggle('is-disabled', i >= slides.length - 1);

      // 价格跟随当前 slide 的 data-price
      if (priceEl) {
        const p = slides[i]?.dataset?.price || '暂无报价';
        priceEl.textContent = p;
        priceEl.classList.toggle('is-na', (slides[i]?.dataset?.na === '1') || p === '暂无报价');
      }
      fill.style.width = `${((i + 1) / slides.length) * 100}%`;
    }

    left.addEventListener('click',  () => goTo(getIndex() - 1));
    right.addEventListener('click', () => goTo(getIndex() + 1));
    vp.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(getIndex() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(getIndex() + 1); }
      if (e.key === 'Home')       { e.preventDefault(); goTo(0); }
      if (e.key === 'End')        { e.preventDefault(); goTo(slides.length - 1); }
    });

    vp.addEventListener('scroll', debounce(() => update(getIndex()), 80), { passive: true });
    window.addEventListener('resize', debounce(() => update(getIndex()), 120));

    update(0);
  });
}

/* ========= 启动 ========= */
(async function boot(){
  await buildFromConfigAndPrices(); // 先渲染 slides + 写入价格
  initSliders();                    // 再挂载轮播/进度条/联动
})();
