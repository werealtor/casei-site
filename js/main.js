// === 产品卡片：箭头 + 进度条 + 价格联动 ===
document.querySelectorAll('.card.product.u3').forEach(card => {
  const vp = card.querySelector('.main-viewport');
  const slides = card.querySelectorAll('.slide');
  if (!vp || slides.length === 0) return;

  // ---- 进度条 ----
  let prog = card.querySelector('.progress');
  if (!prog) {
    prog = document.createElement('div');
    prog.className = 'progress';
    prog.innerHTML = '<i></i>';
    vp.appendChild(prog);
  }
  const fill = prog.querySelector('i');

  // ---- 左右箭头 ----
  let left = card.querySelector('.nav-arrow.left');
  let right = card.querySelector('.nav-arrow.right');
  if (!left) {
    left = document.createElement('button');
    left.className = 'nav-arrow left';
    left.innerHTML = '&#8249;';
    vp.appendChild(left);
  }
  if (!right) {
    right = document.createElement('button');
    right.className = 'nav-arrow right';
    right.innerHTML = '&#8250;';
    vp.appendChild(right);
  }

  // ---- 价格元素 ----
  const priceEl = card.querySelector('.price');

  // ---- 工具函数 ----
  const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function goTo(i) {
    i = clamp(i, 0, slides.length - 1);
    vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
    update(i);
  }

  function update(i = getIndex()) {
    // 进度条
    fill.style.width = `${((i + 1) / slides.length) * 100}%`;
    left.style.visibility = i <= 0 ? 'hidden' : 'visible';
    right.style.visibility = i >= slides.length - 1 ? 'hidden' : 'visible';

    // 价格联动（从 data-price 读取）
    if (priceEl) {
      const slide = slides[i];
      const p = slide.dataset.price;
      if (p) priceEl.textContent = `$${p}`;
    }
  }

  // ---- 绑定事件 ----
  left.onclick = () => goTo(getIndex() - 1);
  right.onclick = () => goTo(getIndex() + 1);

  let st;
  vp.addEventListener('scroll', () => {
    clearTimeout(st);
    st = setTimeout(() => update(getIndex()), 80);
  }, { passive: true });

  window.addEventListener('resize', () => update(getIndex()));

  update(0);
});