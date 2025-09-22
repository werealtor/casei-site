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
    // 回退到 /js/sw.js（如果你把 sw 放到 js 目录）
    navigator.serviceWorker.register('/js/sw.js').catch(() => {});
  });
})();