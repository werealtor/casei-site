/* ========= 主题切换 ========= */
(function () {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  let theme = localStorage.getItem('theme') ||
              (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.classList.toggle('dark', theme === 'dark');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    btn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();

/* ========= 移动端菜单 ========= */
(function () {
  const t = document.querySelector('.menu-toggle');
  const header = document.querySelector('header');
  if (!t || !header) return;
  t.addEventListener('click', () => {
    header.classList.toggle('open');
    t.setAttribute('aria-expanded', header.classList.contains('open'));
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
    if (!fileInput.files.length) { nameEl.textContent = 'PNG/JPEG · < 10MB'; return; }
    const f = fileInput.files[0];
    nameEl.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files[0];
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) { err.textContent = 'Only PNG/JPEG supported.'; return; }
    if (f.size > MAX) { err.textContent = 'File too large (max 10MB).'; return; }
    const reader = new FileReader();
    reader.onload = ev => { preview.src = ev.target.result; preview.style.display = 'block'; err.textContent = ''; };
    reader.readAsDataURL(f);
  });
})();

/* ========= 产品：从 config.json 渲染图片/价格 + 轮播 ========= */
document.addEventListener('DOMContentLoaded', initProducts);

async function initProducts () {
  let cfg;
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    cfg = await res.json();
  } catch (e) {
    console.error('读取 config.json 失败', e);
    return;
  }
  if (!cfg || !Array.isArray(cfg.products)) return;

  // 每个产品渲染
  cfg.products.forEach(p => {
    const card = document.querySelector(`.card.product.u3[data-product="${p.id}"]`);
    if (!card) return;

    const vp = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    const progressBar = card.querySelector('.progress i');
    const priceEl = card.querySelector('.price');

    // 清空并填充 slides
    track.innerHTML = '';
    (p.images || []).forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.index = i + 1;

      const img = document.createElement('img');
      img.className = 'cover';
      img.alt = `${p.name} — ${i + 1}`;
      img.draggable = false;
      img.src = src;

      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 创建箭头（若不存在）
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

    // 保证层级（避免被图片盖住）
    vp.style.position = 'relative';
    vp.style.zIndex = '0';
    track.style.position = 'relative';
    track.style.zIndex = '0';
    progressBar.parentElement.style.zIndex = '20';
    left.style.zIndex = right.style.zIndex = '30';

    const slides = vp.querySelectorAll('.slide');
    if (!slides.length) return;

    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);

    function setPrice(i) {
      const arr = Array.isArray(p.price) ? p.price : [p.price];
      const v = arr[ clamp(i, 0, arr.length - 1) ] ?? arr[0];
      if (typeof v === 'number') priceEl.textContent = `$${v}`;
    }

    function setArrows(i) {
      left.classList.toggle('is-disabled', i <= 0);
      right.classList.toggle('is-disabled', i >= slides.length - 1);
    }

    function setProgress(i) {
      const w = ((i + 1) / slides.length) * 100;
      progressBar.style.width = `${w}%`;
    }

    function update(i = getIndex()) {
      setArrows(i);
      setProgress(i);
      setPrice(i);
    }

    function goTo(i) {
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
      update(i);
    }

    // 事件
    left.onclick = () => goTo(getIndex() - 1);
    right.onclick = () => goTo(getIndex() + 1);

    // 滚动时更新（节流）
    let st;
    vp.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => update(getIndex()), 90);
    }, { passive: true });

    // 尺寸变化时对齐
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => goTo(getIndex()), 120);
    });

    // 初始状态
    // 若你希望初始就展示第1张，可以 goTo(0)；若希望中间某张，改索引即可
    update(0);
  });
}