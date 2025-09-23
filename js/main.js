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




// 主题切换
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    themeBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  });
}

// 移动端菜单
const menuToggle = document.querySelector('.menu-toggle');
const headerEl = document.querySelector('header');
if (menuToggle && headerEl) {
  menuToggle.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', headerEl.classList.contains('open'));
  });
}

// 上传预览
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

// 产品缩略图切换（支持键盘左右）
document.querySelectorAll('.card.product').forEach((card) => {
  const main = card.querySelector('.main-img');
  const thumbs = card.querySelectorAll('.thumb');
  thumbs.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      thumbs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const img = btn.querySelector('img');
      if (img && main) {
        main.src = img.src;
        main.alt = img.alt.replace(/thumb|thumbnail/i,'main').trim();
      }
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = thumbs[(i + dir + thumbs.length) % thumbs.length];
        next.focus(); next.click();
      }
    });
  });
});