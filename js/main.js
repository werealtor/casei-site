/* =========================
   Case&i — Main JS
   ========================= */

// 1) 上传预览 + 错误提示
(function () {
  const form   = document.getElementById('uForm');
  const file   = document.getElementById('file');
  const preview= document.getElementById('preview');
  const err    = document.getElementById('uErr');

  if (!form || !file || !preview) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (err) err.textContent = '';

    const f = file.files && file.files[0];
    if (!f) { if (err) err.textContent = 'Please choose an image.'; return; }

    const okType = /image\/(png|jpe?g)/.test(f.type);
    const okSize = f.size <= 5 * 1024 * 1024;
    if (!okType || !okSize) {
      if (err) err.textContent = 'Upload PNG/JPG under 5MB.';
      return;
    }

    const r = new FileReader();
    r.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    };
    r.readAsDataURL(f);
  });
})();

// 2) 极简汉堡菜单（移动端）
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;

  const btn = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#primary-nav');
  if (!btn || !nav) return;

  const close = () => {
    header.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
  };

  btn.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // 点击导航链接时自动收起
  nav.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.tagName === 'A' && header.classList.contains('open')) {
      close();
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('open')) close();
  });
})();

// 3) 可选：动态美元价格（根目录存在 prices.json 时覆盖）
(function () {
  const nodes = document.querySelectorAll('.price[data-id]');
  if (!nodes.length) return;

  fetch('prices.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((prices) => {
      if (!prices) return;
      const fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      });
      nodes.forEach((el) => {
        const id = el.getAttribute('data-id');
        if (id && prices[id] != null) {
          el.textContent = fmt.format(prices[id]);
        }
      });
    })
    .catch(() => {/* 静默失败 */});
})();

// 4) 注册 Service Worker（优先根目录 /sw.js）
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // 回退到 /js/sw.js（如果你把 sw 放到 js 里）
    navigator.serviceWorker.register('/js/sw.js').catch(() => {});
  });
})();




/* ========= 主题切换 ========= */
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  // 初始化（跟随上次选择或系统）
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  let theme = localStorage.getItem('theme') || (prefersDark.matches ? 'dark' : 'light');
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
  uForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file');
    const err = document.getElementById('uErr');
    const preview = document.getElementById('preview');
    const f = fileInput.files[0];
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!f.type.startsWith('image/')) { err.textContent = 'Invalid file type.'; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
      err.textContent = '';
    };
    reader.readAsDataURL(f);
  });
}

/* ========= U3：极简箭头 + 进度条 ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    if (!vp) return;

    // 包裹 edge-mask（渐隐边缘提示，可删）
    if (!card.querySelector('.edge-mask')) {
      const wrap = document.createElement('div');
      wrap.className = 'edge-mask';
      vp.parentNode.insertBefore(wrap, vp);
      wrap.appendChild(vp);
    }

    vp.setAttribute('tabindex','0');
    vp.setAttribute('aria-label','Product gallery');

    // 箭头
    const left = document.createElement('button');
    const right = document.createElement('button');
    left.className = 'nav-arrow left';  left.setAttribute('aria-label','Previous'); left.textContent = '‹';
    right.className = 'nav-arrow right'; right.setAttribute('aria-label','Next');     right.textContent = '›';
    vp.appendChild(left); vp.appendChild(right);

    // 进度条
    if (!card.querySelector('.progress')) {
      const bar = document.createElement('div');
      bar.className='progress';
      bar.innerHTML = '<i></i>';
      vp.appendChild(bar);
    }
    const fill = card.querySelector('.progress i');

    const slides = card.querySelectorAll('.slide');
    if (!slides.length) return;

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const goTo = (i) => {
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior: scrollBehavior });
      update(i);
      showArrows(); // 交互时显示一下
    };

    const update = (i = getIndex()) => {
      const atStart = i <= 0;
      const atEnd   = i >= slides.length - 1;
      left.classList.toggle('is-disabled', atStart);
      right.classList.toggle('is-disabled', atEnd);
      // 进度
      fill.style.width = `${((i + 1) / slides.length) * 100}%`;
    };

    // 点击箭头
    left.addEventListener('click', () => goTo(getIndex() - 1));
    right.addEventListener('click', () => goTo(getIndex() + 1));

    // 键盘
    vp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(getIndex() - 1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); goTo(getIndex() + 1); }
      if (e.key === 'Home')      { e.preventDefault(); goTo(0); }
      if (e.key === 'End')       { e.preventDefault(); goTo(slides.length - 1); }
    });

    // 滚动吸附（兜底）+ 进度更新
    let t;
    vp.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => update(getIndex()), 90);
    }, { passive: true });

    // 尺寸变化时保持对齐
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => goTo(getIndex()), 120);
    });

    // 自动淡出箭头（桌面端）
    let hideTimer;
    const showArrows = () => {
      [left, right].forEach(a => a.classList.add('is-visible'));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => [left, right].forEach(a => a.classList.remove('is-visible')), 1500);
    };
    ['mousemove','keydown','click','scroll'].forEach(evt=>{
      vp.addEventListener(evt, showArrows, { passive:true });
    });
    showArrows(); // 初始显示

    // 初始状态
    update(0);
  });
})();

