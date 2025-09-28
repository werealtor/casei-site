/* =========================
   Case&i — main.js (full)
   ========================= */

/* ========= 主题切换 ========= */
(function () {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  let theme =
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.body.classList.toggle('dark', theme === 'dark');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.textContent = isDark ? '☀️' : '🌙';
  });
})();

/* ========= 移动端菜单 ========= */
(function () {
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('header');
  if (!toggle || !header) return;
  toggle.addEventListener('click', () => {
    header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', header.classList.contains('open'));
  });
})();

/* ========= 上传预览 ========= */
(function () {
  const form = document.getElementById('uForm');
  if (!form) return;
  const fileInput = document.getElementById('file');
  const nameEl = document.getElementById('fileName');
  const err = document.getElementById('uErr');
  const preview = document.getElementById('preview');
  const MAX = 10 * 1024 * 1024;

  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) {
      nameEl.textContent = 'PNG/JPEG · < 10MB';
      return;
    }
    const f = fileInput.files[0];
    nameEl.textContent = `${f.name} · ${(f.size / 1024 / 1024).toFixed(1)}MB`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files[0];
    if (!f) return (err.textContent = 'Please choose an image.');
    if (!/^image\/(png|jpe?g)$/i.test(f.type))
      return (err.textContent = 'Only PNG/JPEG supported.');
    if (f.size > MAX) return (err.textContent = 'File too large (max 10MB).');

    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
      err.textContent = '';
    };
    reader.readAsDataURL(f);
  });
})();

/* ========= 数据加载：config.json / prices.json ========= */
async function fetchJSON(url) {
  try {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function loadData() {
  const [cfg, prices] = await Promise.all([fetchJSON('/config.json'), fetchJSON('/prices.json')]);
  const map = {};
  if (prices && typeof prices === 'object') {
    Object.assign(map, prices);
  }
  // 将 config.products[].price 也并入（同名 id 优先用 config）
  if (cfg && Array.isArray(cfg.products)) {
    cfg.products.forEach((p) => {
      if (p && p.id) {
        if (p.price) map[p.id] = p.price;
      }
    });
  }
  return { config: cfg, priceMap: map };
}

/* ========= 构建/修复每个产品卡片 ========= */
function buildSlidesFromConfig(card, cfg) {
  if (!cfg || !cfg.products) return;
  const id = card.dataset.product;
  const prod = cfg.products.find((p) => p.id === id);
  if (!prod || !prod.images || !prod.images.length) return;

  const track = card.querySelector('.main-track');
  if (!track) return;

  // 如果 track 已经有 slide，就跳过（避免重复）
  if (track.querySelector('.slide')) return;

  const frag = document.createDocumentFragment();
  prod.images.forEach((src, idx) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const img = document.createElement('img');
    img.className = 'cover';
    img.src = src;
    img.alt = `${prod.name || id} — ${idx + 1}`;
    img.draggable = false;
    slide.appendChild(img);
    frag.appendChild(slide);
  });
  track.appendChild(frag);
}

function attachPriceBinding(card, prices) {
  const id = card.dataset.product;
  const val = prices[id];

  // 记录在卡片对象上，箭头/滚动时兜底可读
  if (Array.isArray(val)) {
    card.__priceArray = val.slice(); // [..]
  } else if (val && typeof val === 'object') {
    card.__priceMap = { ...val }; // { "1": 29, ... }
  }

  // 初始化价格（第 1 张）
  const priceEl = card.querySelector('.price');
  if (!priceEl) return;
  let first = null;
  if (card.__priceArray && card.__priceArray.length) first = card.__priceArray[0];
  if (!first && card.__priceMap) first = card.__priceMap['1'];
  if (typeof first === 'number') priceEl.textContent = `$${first}`;
}

/* ========= 为每张卡片注入箭头 & 进度条，并联动 ========= */
function wireSliderPerCard(card) {
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  if (!vp || !track) return;

  // progress（容器 + 条）
  let pWrap = vp.querySelector('.progress');
  if (!pWrap) {
    pWrap = document.createElement('div');
    pWrap.className = 'progress';
    pWrap.innerHTML = '<i></i>';
    vp.appendChild(pWrap);
  }
  const pBar = pWrap.querySelector('i');

  // arrows
  let left = vp.querySelector('.nav-arrow.left');
  let right = vp.querySelector('.nav-arrow.right');
  if (!left) {
    left = document.createElement('button');
    left.className = 'nav-arrow left';
    left.setAttribute('aria-label', 'Previous');
    left.textContent = '‹';
    vp.appendChild(left);
  }
  if (!right) {
    right = document.createElement('button');
    right.className = 'nav-arrow right';
    right.setAttribute('aria-label', 'Next');
    right.textContent = '›';
    vp.appendChild(right);
  }

  const slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = prefersReduced ? 'auto' : 'smooth';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
  const goTo = (i) => {
    i = clamp(i, 0, slides.length - 1);
    vp.scrollTo({ left: i * vp.clientWidth, behavior: smooth });
    update(i);
  };

  function update(i = getIndex()) {
    // 进度条
    if (pBar && slides.length) {
      pBar.style.width = ((i + 1) / slides.length) * 100 + '%';
    }
    // 箭头禁用
    left.classList.toggle('is-disabled', i <= 0);
    right.classList.toggle('is-disabled', i >= slides.length - 1);

    // 价格联动（兜底）
    if (priceEl) {
      let v = null;
      if (card.__priceArray && card.__priceArray.length) {
        v = card.__priceArray[Math.min(i, card.__priceArray.length - 1)];
      } else if (card.__priceMap) {
        const key = String(i + 1);
        v = card.__priceMap[key];
      }
      if (typeof v === 'number') priceEl.textContent = `$${v}`;
    }
  }

  // 交互
  left.onclick = () => goTo(getIndex() - 1);
  right.onclick = () => goTo(getIndex() + 1);

  vp.addEventListener(
    'scroll',
    () => {
      clearTimeout(vp.__st);
      vp.__st = setTimeout(() => update(getIndex()), 90);
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    clearTimeout(vp.__rt);
    vp.__rt = setTimeout(() => goTo(getIndex()), 120);
  });

  // 初始
  update(0);
}

/* ========= 启动：加载数据 → 渲染 → 绑定 ========= */
(async function initCaseI() {
  const { config, priceMap } = await loadData();

  document.querySelectorAll('.card.product.u3').forEach((card) => {
    // 若有 config.json，按配置填充图片
    buildSlidesFromConfig(card, config);
    // 绑定价格（优先使用 config 中的 price；否则用 prices.json）
    attachPriceBinding(card, priceMap);
    // 为该卡注入箭头 & 进度条，并联动
    wireSliderPerCard(document.querySelectorAll('.card.product').forEach(card => {
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  const slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');

  // 确保 main-viewport 有相对定位
  vp.style.position = 'relative';
  vp.style.zIndex = '0';

  // ---- 修复箭头 ----
  let left = card.querySelector('.nav-arrow.left');
  let right = card.querySelector('.nav-arrow.right');

  if (!left) {
    left = document.createElement('button');
    left.className = 'nav-arrow left';
    left.textContent = '<';
    vp.appendChild(left);
  }
  if (!right) {
    right = document.createElement('button');
    right.className = 'nav-arrow right';
    right.textContent = '>';
    vp.appendChild(right);
  }

  // ---- 修复进度条 ----
  let prog = card.querySelector('.progress');
  if (!prog) {
    prog = document.createElement('div');
    prog.className = 'progress';
    const bar = document.createElement('i');
    prog.appendChild(bar);
    vp.appendChild(prog);
  }

  // 关键：确保层级高于图片
  prog.style.position = 'absolute';
  prog.style.left = '0';
  prog.style.right = '0';
  prog.style.bottom = '0';
  prog.style.zIndex = '20';

  left.style.zIndex = '30';
  right.style.zIndex = '30';

  slides.forEach(slide => {
    const cover = slide.querySelector('.cover');
    if (cover) cover.style.zIndex = '0'; // 避免盖住箭头和进度条
  });

  // 绑定切换逻辑
  const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
  const goto = i => vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });

  left.onclick = () => goto(Math.max(0, getIndex() - 1));
  right.onclick = () => goto(Math.min(slides.length - 1, getIndex() + 1));

  // 更新进度条 & 价格
  function update() {
    const idx = getIndex();
    const bar = prog.querySelector('i');
    bar.style.width = ((idx + 1) / slides.length) * 100 + '%';

    const pid = card.dataset.product;
    if (window.priceData && window.priceData[pid]) {
      const prices = window.priceData[pid];
      if (Array.isArray(prices)) {
        priceEl.textContent = `$${prices[idx] || prices[0]}`;
      }
    }
  }

  vp.addEventListener('scroll', () => setTimeout(update, 80));
  update();
});


