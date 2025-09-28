/* ===================== Case&i — main.js (integrated) ===================== */
/* 1) 主题切换 */
(() => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const readPref = () =>
    localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const apply = (t) => {
    document.body.classList.toggle('dark', t === 'dark');
    btn.textContent = t === 'dark' ? '☀️' : '🌙';
  };

  let theme = readPref();
  apply(theme);
  btn.addEventListener('click', () => {
    theme = document.body.classList.toggle('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
})();

/* 2) 移动端菜单 */
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('header');
  if (!toggle || !header) return;
  toggle.addEventListener('click', () => {
    header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', header.classList.contains('open'));
  });
})();

/* 3) 上传预览（限制 PNG/JPEG < 10MB） */
(() => {
  const form = document.getElementById('uForm');
  if (!form) return;
  const input = document.getElementById('file');
  const nameEl = document.getElementById('fileName');
  const err = document.getElementById('uErr');
  const preview = document.getElementById('preview');
  const MAX = 10 * 1024 * 1024;

  input.addEventListener('change', () => {
    if (!input.files.length) { nameEl.textContent = 'PNG/JPEG · < 10MB'; return; }
    const f = input.files[0];
    nameEl.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = input.files[0];
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) { err.textContent = 'Only PNG/JPEG supported.'; return; }
    if (f.size > MAX) { err.textContent = 'File too large (max 10MB).'; return; }

    const r = new FileReader();
    r.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
      err.textContent = '';
    };
    r.readAsDataURL(f);
  });
})();

/* 4) 价格数据：支持 /prices.json 或 /config.json 的 products[].price */
window.priceData = {};
(async () => {
  try {
    const r = await fetch('prices.json', { cache: 'no-store' });
    if (r.ok) { window.priceData = await r.json(); return; }
  } catch {}
  try {
    const r2 = await fetch('config.json', { cache: 'no-store' });
    if (r2.ok) {
      const cfg = await r2.json();
      if (cfg && Array.isArray(cfg.products)) {
        const map = {};
        cfg.products.forEach(p => { if (p.id && p.price) map[p.id] = p.price; });
        window.priceData = map;
      }
    }
  } catch {}
})();

/* 5) Slider：为每张产品卡片强制创建箭头 & 进度条，并修复层级 */
(() => {
  // 注入一小段保证可见的 CSS（比样式表优先级更高）
  const css = `
  .card.product .main-viewport{position:relative !important; overflow-x:auto; -webkit-overflow-scrolling:touch; scroll-snap-type:x mandatory;}
  .card.product .main-track{display:flex; width:100%; align-items:stretch;}
  .card.product .slide{position:relative !important; flex:0 0 100%; width:100%; aspect-ratio:16/9; overflow:hidden; background:var(--tone); scroll-snap-align:center; z-index:0 !important;}
  .card.product .slide .cover{position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; object-fit:cover !important; pointer-events:none !important; z-index:0 !important;}
  .card.product .nav-arrow{position:absolute !important; top:50% !important; transform:translateY(-50%) !important;
    width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(0,0,0,.15); background:rgba(255,255,255,.95); font-weight:700; font-size:18px; cursor:pointer;
    opacity:1 !important; z-index:9999 !important; user-select:none;}
  .card.product .nav-arrow.left{left:10px !important;}
  .card.product .nav-arrow.right{right:10px !important;}
  .card.product .nav-arrow.is-disabled{display:none !important;}
  .card.product .progress{position:absolute !important; left:0; right:0; bottom:0; height:3px; background:rgba(0,0,0,.08); z-index:9998 !important; overflow:hidden;}
  body.dark .card.product .progress{background:rgba(255,255,255,.12);}
  .card.product .progress i{display:block; height:100%; width:0; background:var(--brand,#0b66ff); transition:width .22s ease;}
  `;
  if (!document.getElementById('u3-safe-css')) {
    const s = document.createElement('style');
    s.id = 'u3-safe-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

  function initCard(card){
    const vp = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    if (!vp || !track) return;

    // 箭头
    let left = vp.querySelector('.nav-arrow.left');
    let right = vp.querySelector('.nav-arrow.right');
    if (!left) { left = document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.textContent='‹'; vp.appendChild(left); }
    if (!right){ right= document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent='›'; vp.appendChild(right); }

    // 进度条
    let prog = vp.querySelector('.progress');
    if (!prog){ prog = document.createElement('div'); prog.className='progress'; prog.innerHTML='<i></i>'; vp.appendChild(prog); }
    const bar = prog.querySelector('i');

    const slides = track.querySelectorAll('.slide');
    const priceEl = card.querySelector('.price');

    // 从价格表取：数组（按索引）或对象（"1".."7"）
    const pid = card.dataset.product;
    const pData = window.priceData || {};
    const priceArr = Array.isArray(pData[pid]) ? pData[pid] : null;
    const priceMap = (!priceArr && pData[pid] && typeof pData[pid] === 'object') ? pData[pid] : null;

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const goTo = (i) => {
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: smooth });
      setTimeout(()=>update(i), 60);
    };

    function update(i = getIndex()){
      // 进度
      if (bar && slides.length) bar.style.width = ((i+1)/slides.length)*100 + '%';
      // 箭头禁用
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
      // 价格
      if (priceEl){
        let v = null;
        if (priceArr && typeof priceArr[i] === 'number') v = priceArr[i];
        else if (priceMap && priceMap[String(i+1)] != null) v = priceMap[String(i+1)];
        if (typeof v === 'number') priceEl.textContent = `$${v}`;
      }
    }

    left.onclick  = () => goTo(getIndex()-1);
    right.onclick = () => goTo(getIndex()+1);

    // 滚动/尺寸联动
    vp.addEventListener('scroll', () => { clearTimeout(vp.__st); vp.__st = setTimeout(()=>update(getIndex()), 80); }, {passive:true});
    addEventListener('resize', () => { clearTimeout(vp.__rt); vp.__rt = setTimeout(()=>goTo(getIndex()), 120); });

    // 初始
    update(0);
  }

  // 初始化所有卡片
  document.querySelectorAll('.card.product').forEach(initCard);

  // 观察 DOM 变更（如你后续用 JS 动态替换图片/价格）
  const mo = new MutationObserver((muts) => {
    const need = new Set();
    muts.forEach(m => {
      const card = (m.target.closest && m.target.closest('.card.product')) || null;
      if (card) need.add(card);
    });
    need.forEach(initCard);
  });
  mo.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['src','data-price','class'] });
})();

/* ===================== End of file ===================== */