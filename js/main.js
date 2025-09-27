// 简单防抖
function debounce(fn, wait = 80){
  let t; return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), wait); };
}

document.addEventListener('DOMContentLoaded', () => {
  // 遍历每个产品卡片
  document.querySelectorAll('.card.product.u3').forEach(card => {
    const vp     = card.querySelector('.main-viewport');
    const track  = card.querySelector('.main-track');
    const slides = Array.from(card.querySelectorAll('.slide'));
    if(!vp || !track || !slides.length) return;

    // 进度条：没有就补
    let prog = card.querySelector('.progress');
    if(!prog){
      prog = document.createElement('div');
      prog.className = 'progress';
      prog.innerHTML = '<i></i>';
      vp.appendChild(prog);
    }
    const fill = prog.querySelector('i');

    // 箭头：没有就补
    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if(!left){
      left = document.createElement('button');
      left.className = 'nav-arrow left';
      left.setAttribute('aria-label','Previous');
      left.innerHTML = '&#8249;';
      vp.appendChild(left);
    }
    if(!right){
      right = document.createElement('button');
      right.className = 'nav-arrow right';
      right.setAttribute('aria-label','Next');
      right.innerHTML = '&#8250;';
      vp.appendChild(right);
    }

    const priceEl = card.querySelector('.price');

    // 计算当前索引（基于 scrollLeft 与容器宽度）
    const getIndex = () => Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));
    const clamp    = (n,min,max)=> Math.max(min, Math.min(max,n));

    function goTo(i){
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
      update(i);
    }

    function getPriceFor(i){
      const s = slides[i];
      if(!s) return null;
      const p = s.getAttribute('data-price');
      return p ? Number(p) : null;
    }

    function update(i = getIndex()){
      const n = slides.length;
      // 进度条
      fill.style.width = `${((i + 1) / n) * 100}%`;
      // 箭头显隐
      left.style.visibility  = i <= 0 ? 'hidden' : 'visible';
      right.style.visibility = i >= n - 1 ? 'hidden' : 'visible';
      // 价格
      if(priceEl){
        const p = getPriceFor(i);
        if(p != null) priceEl.textContent = `$${p}`;
      }
    }

    // 事件绑定
    left.addEventListener('click', () => goTo(getIndex() - 1));
    right.addEventListener('click', () => goTo(getIndex() + 1));

    vp.addEventListener('scroll', debounce(() => update(getIndex()), 80), { passive:true });
    window.addEventListener('resize', debounce(() => update(getIndex()), 120));

    // 初始
    update(0);
  });
});

