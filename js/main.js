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