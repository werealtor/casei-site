/* ========= 主题切换 ========= */
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

/* ========= 滑块价格联动 ========= */
function bindPriceSlider(card, prices) {
  const vp = card.querySelector('.main-viewport');
  const slides = [...card.querySelectorAll('.slide')];
  const priceEl = card.querySelector('.price');

  if (!vp || !slides.length || !priceEl) return;

  function updatePrice() {
    const i = Math.round(vp.scrollLeft / vp.clientWidth);
    const slide = slides[i];
    const pid = slide.getAttribute('data-price-id') || priceEl.getAttribute('data-id');
    if (pid && prices[pid] !== undefined) {
      priceEl.textContent = `$${prices[pid]}`;
    }
  }

  // 初始
  updatePrice();

  // 滚动时更新（节流一下）
  let st;
  vp.addEventListener('scroll', () => {
    clearTimeout(st);
    st = setTimeout(updatePrice, 100);
  }, {passive:true});
}

/* ========= 动态加载价格并绑定 ========= */
(async function(){
  try {
    const res = await fetch('prices.json', {cache:'no-store'});
    const prices = await res.json();
    document.querySelectorAll('.card.product').forEach(card=>{
      bindPriceSlider(card, prices);
    });
  } catch(e){
    console.warn('价格加载失败', e);
  }
})();

});
