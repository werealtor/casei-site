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

/* ========= U3：箭头 + 自动轮播（灰色进度条，不更新蓝条） ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
  const AUTOPLAY_DELAY = 3000;
  const RESUME_AFTER   = 5000;

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    if (!vp || !slides.length) return;

    const left  = document.createElement('button'); left.className='nav-arrow left';  left.textContent='‹';
    const right = document.createElement('button'); right.className='nav-arrow right'; right.textContent='›';
    vp.append(left,right);

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp    = (n,min,max)=> Math.max(min, Math.min(max,n));

    const update = (i=getIndex())=>{
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
      // 不再更新 fill.style.width，因为蓝色条已隐藏
    };
    const goTo = (i)=>{
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
    };

    left.addEventListener('click', ()=> goTo(getIndex()-1));
    right.addEventListener('click', ()=> goTo(getIndex()+1));

    let st; vp.addEventListener('scroll', ()=>{ clearTimeout(st); st=setTimeout(()=>update(getIndex()),90); }, {passive:true});

    update(0);
  });
})();