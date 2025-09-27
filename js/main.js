/* ========= 工具 ========= */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* 价格获取：支持数组 / 对象("1","2",...) 两种写法 */
function pickPrice(priceConf, indexZeroBased) {
  if (priceConf == null) return null;
  const i1 = indexZeroBased + 1;
  if (Array.isArray(priceConf)) {
    return priceConf[Math.min(indexZeroBased, priceConf.length - 1)];
  }
  if (typeof priceConf === 'object') {
    const v = priceConf[String(i1)];
    return (typeof v === 'number') ? v : null;
  }
  return null;
}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', async () => {
  // 1) 读取 config.json（带 cache bust 避免缓存）
  let conf;
  try {
    const res = await fetch(`./config.json?v=${Date.now()}`, { cache: 'no-store' });
    conf = await res.json();
  } catch (e) {
    console.error('Failed to load config.json', e);
    return;
  }
  const productsById = Object.fromEntries(
    (conf.products || []).map(p => [p.id, p])
  );

  // 2) 渲染每张卡的图片，并挂上滑动/箭头/进度条/价格联动
  $$('.card.product.u3').forEach(card => {
    const pid   = card.dataset.product;
    const data  = productsById[pid];
    if (!data) return;

    const vp     = $('.main-viewport', card);
    const track  = $('.main-track', vp);
    const progEl = $('.progress i', vp);
    const priceEl= $('.price', card);

    // 写入 slides
    track.innerHTML = (data.images || []).map((src, i) => `
      <div class="slide" data-index="${i}">
        <img class="cover" src="${src}" alt="${data.name} — ${i+1}" loading="lazy" draggable="false">
      </div>
    `).join('');

    const slides = $$('.slide', track);
    if (!slides.length) return;

    /* ---- 箭头（确保每个卡片都有） ---- */
    let left = $('.nav-arrow.left', vp);
    let right= $('.nav-arrow.right', vp);
    if (!left) {
      left = document.createElement('button');
      left.className = 'nav-arrow left';
      left.setAttribute('aria-label','Previous');
      left.textContent = '‹';
      vp.appendChild(left);
    }
    if (!right) {
      right = document.createElement('button');
      right.className = 'nav-arrow right';
      right.setAttribute('aria-label','Next');
      right.textContent = '›';
      vp.appendChild(right);
    }

    // 为了避免任何层级问题，强制关键元素的 z-index（补丁）
    vp.style.position = 'relative';
    vp.style.zIndex = '0';
    track.style.position = 'relative';
    track.style.zIndex = '0';
    $$('.slide .cover', track).forEach(img => {
      img.style.pointerEvents = 'none';
      img.style.zIndex = '0';
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
    });
    left.style.zIndex = '30';
    right.style.zIndex = '30';
    const progressBar = $('.progress', vp);
    if (progressBar) progressBar.style.zIndex = '20';

    /* ---- 滑动逻辑 ---- */
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = prefersReduced ? 'auto' : 'smooth';

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const goTo = (i) => {
      i = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: i * vp.clientWidth, behavior: scrollBehavior });
      update(i);
    };

    function update(index = getIndex()) {
      // 进度
      if (progEl) {
        const pct = ((index + 1) / slides.length) * 100;
        progEl.style.width = `${pct}%`;
      }
      // 箭头可用性
      left.classList.toggle('is-disabled', index <= 0);
      right.classList.toggle('is-disabled', index >= slides.length - 1);
      // 价格联动
      if (priceEl) {
        const price = pickPrice(data.price, index);
        if (typeof price === 'number') {
          priceEl.textContent = `$${price}`;
        }
      }
    }

    // 初始状态
    update(0);

    // 事件
    left.addEventListener('click',  () => goTo(getIndex() - 1));
    right.addEventListener('click', () => goTo(getIndex() + 1));

    vp.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(getIndex() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(getIndex() + 1); }
      if (e.key === 'Home')       { e.preventDefault(); goTo(0); }
      if (e.key === 'End')        { e.preventDefault(); goTo(slides.length - 1); }
    });

    let st;
    vp.addEventListener('scroll', () => {
      clearTimeout(st);
      st = setTimeout(() => update(getIndex()), 90);
    }, { passive: true });

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => goTo(getIndex()), 120);
    });

    // 可见性控制自动播放（可选：保留结构，默认不启用）
    const api = {
      timer: null, visible: true,
      start(){ if (prefersReduced || this.timer) return;
        this.timer = setInterval(() => { const i = getIndex(); goTo(i + 1 >= slides.length ? 0 : i + 1); }, 4000);
      },
      stop(){ if (this.timer){ clearInterval(this.timer); this.timer = null; } }
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.target !== card) return;
          api.visible = en.isIntersecting;
          api.stop(); if (api.visible) api.start();
        });
      }, { threshold: [0.6] });
      io.observe(card);
    }
  });
});