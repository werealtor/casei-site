/* =========================================
 * Case&i main.js — config驱动 + prices.json 自动定价 + 缺价→“暂无报价”
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

/* ========= 小工具 ========= */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const debounce = (fn, wait = 90) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
const fmtMoney = (num, currency = 'USD', locale = (navigator.language || 'en-US')) => {
  try { return new Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits:0 }).format(num); }
  catch { return `$${num}`; }
};
// 新增：根据数值/空值返回“金额”或“暂无报价”
const fmtOrNA = (val, currency, locale) => (val == null || Number.isNaN(val)) ? '暂无报价' : fmtMoney(val, currency, locale);

/* ========= 拉取 config.json / prices.json ========= */
async function fetchJSON(url){
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`fetch ${url} failed`);
    return await res.json();
  } catch { return null; }
}

/**
 * 从 prices.json 取单价或分图定价
 * 允许格式：
 * - number: 统一价格
 * - array:  [19,20,21] 与索引(0/1/2) 或 文件序号(1/2/3)对应
 * - object: {"1":19,"2":20,"3":21} 或 {"0":19,"1":20,"2":21}
 *
 * 返回：number | null（null 表示缺价）
 */
function getPriceForSlide(pricesMap, productId, slideIndexZero, fallbackNumber) {
  let result = null;
  if (pricesMap && (productId in pricesMap)) {
    const val = pricesMap[productId];
    if (typeof val === 'number') result = val;
    else if (Array.isArray(val)) result = (val[slideIndexZero] != null) ? val[slideIndexZero] : null;
    else if (val && typeof val === 'object') {
      const idx1 = String(slideIndexZero + 1);
      const idx0 = String(slideIndexZero);
      if (val[idx1] != null) result = val[idx1];
      else if (val[idx0] != null) result = val[idx0];
    }
  }
  if (result == null) {
    // 尝试 fallback
    if (typeof fallbackNumber === 'number' && !Number.isNaN(fallbackNumber)) return fallbackNumber;
    return null;
  }
  return result;
}

/* ========= 从 config + prices 生成/更新 DOM ========= */
async function buildFromConfigAndPrices() {
  const cfg = await fetchJSON('config.json');
  const prices = await fetchJSON('prices.json');
  const currency = cfg?.settings?.currency || 'USD';
  const locale = (navigator.language || 'en-US');

  if (!cfg || !Array.isArray(cfg.products)) {
    console.warn('config.json missing or invalid; will use existing DOM only.');
    return;
  }

  cfg.products.forEach(prod => {
    const card = document.querySelector(`.card.product[data-product="${prod.id}"]`);
    if (!card) return;
    const vp = card.querySelector('.main-viewport');
    if (!vp) return;

    // 主轨道
    let track = card.querySelector('.main-track');
    if (!track) { track = document.createElement('div'); track.className='main-track'; vp.appendChild(track); }

    // 渲染 slides（优先用 config.images）
    if (Array.isArray(prod.images) && prod.images.length) {
      track.innerHTML = '';
      const perSlide = Array.isArray(prod.perSlidePrices) ? prod.perSlidePrices : null;

      prod.images.forEach((src, idx) => {
        const priceNumber = getPriceForSlide(
          prices,
          prod.id,
          idx,
          (perSlide ? perSlide[idx] : prod.price)
        );

        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.dataset.price = fmtOrNA(priceNumber, currency, locale);
        slide.dataset.na = (priceNumber == null) ? '1' : '';

        const img = document.createElement('img');
        img.className = 'cover';
        img.src = src;
        img.alt = `${prod.name || prod.id} — ${idx+1}`;
        img.draggable = false;

        slide.appendChild(img);
        track.appendChild(slide);
      });
    } else {
      // 没有 cfg.images 则为已有 slide 补价格
      const slides = card.querySelectorAll('.slide');
      slides.forEach((s, idx) => {
        const priceNumber = getPriceForSlide(prices, prod.id, idx, prod.price);
        s.dataset.price = fmtOrNA(priceNumber, currency, locale);
        s.dataset.na = (priceNumber == null) ? '1' : '';
      });
    }

    // 初始价格
    const priceEl = card.querySelector('.price');
    if (priceEl) {
      const firstSlide = card.querySelector('.slide');
      const firstTxt = firstSlide?.dataset?.price || fmtOrNA(prod.price, currency, locale);
      priceEl.textContent = firstTxt;
      priceEl.classList.toggle('is-na', firstSlide?.dataset?.na === '1' || firstTxt === '暂无报价');
    }

    // 进度条缺则补
    let progress = card.querySelector('.progress');
    if (!progress) { progress = document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }
  });
}

/* ========= 初始化滑块 ========= */
function initSliders() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card => {
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    if (!vp || !slides.length) return;

    let progress = card.querySelector('.progress');
    if (!progress) { progress = document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }
    let fill = progress.querySelector('i');
    if (!fill) { fill = document.createElement('i'); progress.appendChild(fill); }

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

      if (priceEl) {
        const p = slides[i]?.dataset?.price || '暂无报价';
        priceEl.textContent = p;
        priceEl.classList.toggle('is-na', slides[i]?.dataset?.na === '1' || p === '暂无报价');
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
  await buildFromConfigAndPrices();
  initSliders();
})();