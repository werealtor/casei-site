// js/main.js
(() => {
  /**
   * 期望的 config.json 结构（根目录）：
   * {
   *   "settings": { "currency": "USD" },
   *   "products": [
   *     { "id":"classic", "name":"Classic", "images":[...7张], "price":[...,7个] },
   *     { "id":"fashion", "name":"Fashion", "images":[...7张], "price":[...,7个] },
   *     { "id":"business","name":"Business","images":[...7张], "price":[...,7个] }
   *   ]
   * }
   */
  const CURRENCY_SIGN = { USD: '$', CNY: '¥', JPY: '¥', EUR: '€' };

  async function loadConfig() {
    try {
      const res = await fetch('/config.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const cfg = await res.json();
      window.__CONFIG__ = cfg;
      return cfg;
    } catch (e) {
      console.error('[config] load failed:', e);
      return null;
    }
  }

  function findProductConfig(cfg, id) {
    if (!cfg || !cfg.products) return null;
    return cfg.products.find(p => p.id === id) || null;
  }

  function ensureSlidesFromConfig(cardEl, productCfg) {
    const track = cardEl.querySelector('.main-track');
    if (!track) return;

    // 如果已经有 slide，就不重复塞
    if (track.querySelector('.slide')) return;

    if (productCfg && Array.isArray(productCfg.images)) {
      productCfg.images.forEach((src, i) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.dataset.index = String(i);
        const img = document.createElement('img');
        img.className = 'cover';
        img.src = src;
        img.alt = `${productCfg.name || productCfg.id} — ${i + 1}`;
        img.draggable = false;
        slide.appendChild(img);
        track.appendChild(slide);
      });
    }
  }

  function mountU3ForCard(cardEl, productCfg, currency) {
    const vp = cardEl.querySelector('.main-viewport');
    const track = cardEl.querySelector('.main-track');
    if (!vp || !track) return;

    // —— 每张卡片独立：确保箭头与进度条存在（在卡片 viewport 内）——
    let left = vp.querySelector('.nav-arrow.left');
    let right = vp.querySelector('.nav-arrow.right');
    let progress = vp.querySelector('.progress');
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
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'progress';
      progress.innerHTML = '<i></i>';
      vp.appendChild(progress);
    }
    const progInner = progress.querySelector('i');

    // 安全层级：箭头与进度条在最上层；图片不可挡点击
    Array.from(vp.querySelectorAll('.slide .cover')).forEach(img => {
      img.style.zIndex = '0';
      img.style.pointerEvents = 'none';
    });
    left.style.zIndex = '9998';
    right.style.zIndex = '9998';
    progress.style.zIndex = '9997';

    const slides = track.querySelectorAll('.slide');
    const priceEl = cardEl.querySelector('.price');
    const prices = Array.isArray(productCfg?.price) ? productCfg.price : null;
    const currencySign = CURRENCY_SIGN[currency] || '$';

    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    function getIndex() {
      return Math.round(vp.scrollLeft / vp.clientWidth);
    }
    function goTo(i) {
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
      update(i);
    }
    function update(i) {
      // 进度条
      if (progInner && slides.length) {
        progInner.style.width = ((i + 1) / slides.length) * 100 + '%';
      }
      // 价格联动
      if (priceEl && prices && prices[i] != null) {
        priceEl.textContent = `${currencySign}${prices[i]}`;
      }
      // 箭头状态
      left.classList.toggle('is-disabled', i <= 0);
      right.classList.toggle('is-disabled', i >= slides.length - 1);
    }

    left.onclick = () => goTo(getIndex() - 1);
    right.onclick = () => goTo(getIndex() + 1);

    // 滚动更新
    let st;
    vp.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => update(getIndex()), 120);
    }, { passive: true });

    // 初始化
    update(0);
  }

  // ========== 启动 ==========
  document.addEventListener('DOMContentLoaded', async () => {
    const cfg = await loadConfig();
    const currency = cfg?.settings?.currency || 'USD';

    // 菜单开关（如果有）
    const header = document.getElementById('site-header');
    const menuBtn = header ? header.querySelector('.menu-toggle') : null;
    if (header && menuBtn) {
      menuBtn.addEventListener('click', () => header.classList.toggle('open'));
    }

    // 主题按钮（如果有）
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark');
        themeBtn.textContent = dark ? '☀️' : '🌙';
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      });
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        document.body.classList.add('dark');
        themeBtn.textContent = '☀️';
      }
    }

    // 为每个产品卡片挂载 U3
    document.querySelectorAll('.card.product').forEach(card => {
      const id = card.dataset.product;
      const pCfg = findProductConfig(cfg, id);

      // 若 main-track 为空，则按 config.json 自动插入 7 张图
      ensureSlidesFromConfig(card, pCfg);

      // 挂载滑块&联动
      mountU3ForCard(card, pCfg, currency);
    });
  });
})();