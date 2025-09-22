// ==== 菜单（汉堡）====
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;
  const btn = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#primary-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // 点击链接后自动收起（移动端）
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && header.classList.contains('open')) {
      header.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open menu');
    }
  });
})();

// ==== 上传预览 ====
(function () {
  const form = document.getElementById('uForm');
  const file = document.getElementById('file');
  const preview = document.getElementById('preview');
  const err = document.getElementById('uErr');
  if (!form || !file || !preview) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (err) err.textContent = '';
    const f = file.files && file.files[0];
    if (!f) { if (err) err.textContent = 'Please choose an image.'; return; }
    if (!/image\/(png|jpe?g)/.test(f.type) || f.size > 5 * 1024 * 1024) {
      if (err) err.textContent = 'Upload PNG/JPG under 5MB.'; return;
    }
    const r = new FileReader();
    r.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; };
    r.readAsDataURL(f);
  });
})();

// ==== 动态美元价（可选，有 prices.json 才生效）====
(function () {
  const nodes = document.querySelectorAll('.price[data-id]');
  if (!nodes.length) return;
  fetch('prices.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(prices => {
      if (!prices) return;
      const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
      nodes.forEach(el => {
        const id = el.getAttribute('data-id');
        if (id && prices[id] != null) el.textContent = fmt.format(prices[id]);
      });
    })
    .catch(() => {});
})();

// ==== 注册 Service Worker（优先 /sw.js，兜底 /js/sw.js）====
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js')
    .catch(() => navigator.serviceWorker.register('/js/sw.js').catch(() => {}));
})();