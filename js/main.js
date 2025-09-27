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

/* ========= 小工具 ========= */
function debounce(fn, wait = 80){
  let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); };
}
const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));

/* ========= U3：箭头 + 价格联动（灰色进度条不更新蓝条） ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    if (!vp || !slides.length) return;

    // 进度条：页面已有 .progress（灰色底条），无需改动

    // 箭头：缺则补
    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if (!left)  { left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;'; vp.appendChild(left); }
    if (!right) { right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.innerHTML='&#8250;'; vp.appendChild(right); }

    const priceEl = card.querySelector('.price');
    const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

    function goTo(i){
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
    }

    function update(i=getIndex()){
      // 箭头显隐
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);

      // 价格联动：从当前 slide 的 data-price 读取
      if (priceEl) {
        const slide = slides[i];
        const p = slide && slide.dataset && slide.dataset.price;
        if (p) priceEl.textContent = `$${p}`;
      }

      // 不更新 .progress i 的宽度（蓝色条已在 CSS 隐藏）
    }

    // 点击 & 键盘
    left.addEventListener('click', ()=> goTo(getIndex()-1));
    right.addEventListener('click',()=> goTo(getIndex()+1));
    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
      if(e.key==='Home'){ e.preventDefault(); goTo(0); }
      if(e.key==='End'){ e.preventDefault(); goTo(slides.length-1); }
    });

    // 滚动/尺寸
    vp.addEventListener('scroll', debounce(()=>update(getIndex()),90), {passive:true});
    window.addEventListener('resize', debounce(()=>update(getIndex()),120));

    // 初始
    update(0);
  });
})();