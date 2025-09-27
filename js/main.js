document.querySelectorAll('.card.product').forEach(card => {
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  const slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const progress = card.querySelector('.progress i');

  // 每个产品卡片都生成独立的箭头
  const left = document.createElement('button');
  left.className = 'nav-arrow left';
  left.setAttribute('aria-label', 'Previous');
  left.textContent = '‹';

  const right = document.createElement('button');
  right.className = 'nav-arrow right';
  right.setAttribute('aria-label', 'Next');
  right.textContent = '›';

  vp.appendChild(left);
  vp.appendChild(right);

  // 计算当前索引
  const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);

  function goto(i) {
    const index = Math.max(0, Math.min(i, slides.length - 1));
    vp.scrollTo({ left: index * vp.clientWidth, behavior: 'smooth' });
    update(index);
  }

  function update(i) {
    // 进度条更新
    if (progress) {
      progress.style.width = ((i + 1) / slides.length * 100) + '%';
    }

    // 按钮禁用状态
    left.classList.toggle('is-disabled', i === 0);
    right.classList.toggle('is-disabled', i === slides.length - 1);

    // 价格更新
    const productId = card.dataset.product;
    if (window.priceData && window.priceData[productId]) {
      let priceArray = window.priceData[productId];
      if (Array.isArray(priceArray)) {
        priceEl.textContent = '$' + priceArray[i % priceArray.length];
      } else if (typeof priceArray === 'object') {
        const key = (i + 1).toString();
        if (priceArray[key]) {
          priceEl.textContent = '$' + priceArray[key];
        }
      }
    }
  }

  // 事件绑定
  left.onclick = () => goto(getIndex() - 1);
  right.onclick = () => goto(getIndex() + 1);
  vp.addEventListener('scroll', () => {
    clearTimeout(vp._scrollTimer);
    vp._scrollTimer = setTimeout(() => update(getIndex()), 100);
  });

  // 初始化
  update(0);
});