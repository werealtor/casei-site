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
    if (!/^image\\/(png|jpe?g)$/i.test(f.type)) { err.textContent = 'Only PNG/JPEG supported.'; return; }
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

/* ========= Slider 箭头 + 价格联动 ========= */
(function(){
  const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const slides = card.querySelectorAll('.slide');
    const fill = card.querySelector('.progress i');
    const priceEl = card.querySelector('.price');
    if (!vp || !slides.length) return;

    // 箭头
    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if (!left)  { left  = document.createElement('button'); left.className='nav-arrow left'; left.innerHTML='‹'; vp.appendChild(left); }
    if (!right) { right = document.createElement('button'); right.className='nav-arrow right'; right.innerHTML='›'; vp.appendChild(right); }

    const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

    function goTo(i){
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
    }

    function update(i=getIndex()){
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);

      // 价格联动
      if (priceEl) {
        const p = slides[i].dataset.price || priceEl.dataset.base || priceEl.textContent.replace('$','');
        priceEl.textContent = `$${p}`;
      }

      // 进度条（仅灰色底条，fill 透明）
      if (fill) {
        fill.style.width = `${((i+1)/slides.length)*100}%`;
      }
    }

    left.addEventListener('click', ()=> goTo(getIndex()-1));
    right.addEventListener('click',()=> goTo(getIndex()+1));
    vp.addEventListener('scroll', ()=> update(getIndex()), {passive:true});
    window.addEventListener('resize', ()=> update(getIndex()));

    update(0);
  });
})();