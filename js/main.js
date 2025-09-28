/* ========= Theme toggle ========= */
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

/* ========= Mobile menu ========= */
const menuToggle = document.querySelector('.menu-toggle');
const headerEl = document.querySelector('header');
if (menuToggle && headerEl) {
  menuToggle.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', headerEl.classList.contains('open'));
  });
}

/* ========= Build products from config.json + slider ========= */
document.addEventListener('DOMContentLoaded', async () => {
  // 1) 读取配置
  let cfg;
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    cfg = await res.json();
  } catch (e) {
    console.error('Failed to load config.json', e);
    return;
  }

  const currency = (cfg.settings && cfg.settings.currency) || 'USD';
  const fmt = (v) => (typeof v === 'number' ? (currency === 'USD' ? `$${v}` : `${v} ${currency}`) : '$—');

  // 2) 为每个卡片填充图片并初始化滑块
  cfg.products.forEach(p => {
    const card = document.querySelector(`.card.product[data-product="${p.id}"]`);
    if (!card) return;

    const vp = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    const progressBar = card.querySelector('.progress i');
    const priceEl = card.querySelector('.price');

    // 构建 slides
    track.innerHTML = '';
    (p.images || []).forEach((src, idx) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      const img = document.createElement('img');
      img.className = 'cover';
      img.alt = `${p.name} — ${idx + 1}`;
      img.src = src;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 箭头（每张都显示）
    let left = vp.querySelector('.nav-arrow.left');
    let right = vp.querySelector('.nav-arrow.right');
    if (!left) {
      left = document.createElement('button');
      left.className = 'nav-arrow left';
      left.setAttribute('aria-label','Previous');
      left.textContent = '‹';
      vp.appendChild(left);
    }
    if (!right) {
      right = document.createElement('button');
      right.className = 'nav-arrow right';
      right.setAttribute('aria-label','Next');
      right.textContent = '›';
      vp.appendChild(right);
    }

    const slides = track.querySelectorAll('.slide');
    const prices = Array.isArray(p.price) ? p.price : [p.price];

    // 设置初始价格
    priceEl.textContent = fmt(prices[0]);

    // 工具函数
    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const goTo = (i) => {
      const idx = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: idx * vp.clientWidth, behavior: 'smooth' });
      update(idx);
    };

    // 更新 UI（进度条 + 价格 + 箭头可用状态）
    const update = (i = getIndex()) => {
      const total = slides.length || 1;
      const pct = ((i + 1) / total) * 100;
      if (progressBar) progressBar.style.width = pct + '%';

      const priceIdx = Math.min(i, prices.length - 1);
      priceEl.textContent = fmt(prices[priceIdx]);

      left.classList.toggle('is-disabled', i <= 0);
      right.classList.toggle('is-disabled', i >= total - 1);
    };

    // 监听滚动/尺寸
    let st;
    vp.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => update(getIndex()), 60);
    }, { passive: true });

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => goTo(getIndex()), 120);
    });

    // 按钮
    left.addEventListener('click', () => goTo(getIndex() - 1));
    right.addEventListener('click', () => goTo(getIndex() + 1));

    // 初始
    update(0);
  });
});

/* ========= Upload preview ========= */
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