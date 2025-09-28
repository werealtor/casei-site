/* ========= 主题切换 ========= */
(() => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const theme = localStorage.getItem('theme') ||
                (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.classList.toggle('dark', theme === 'dark');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    btn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();

/* ========= 移动端菜单 ========= */
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('header');
  if (!toggle || !header) return;
  toggle.addEventListener('click', () => {
    header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', header.classList.contains('open'));
  });
})();

/* ========= 上传预览 ========= */
(() => {
  const form = document.getElementById('uForm');
  if (!form) return;
  const fileInput = document.getElementById('file');
  const nameEl = document.getElementById('fileName');
  const err = document.getElementById('uErr');
  const preview = document.getElementById('preview');
  const MAX = 10 * 1024 * 1024;
  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) { nameEl.textContent = 'PNG/JPEG · < 10MB'; return; }
    const f = fileInput.files[0];
    nameEl.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files[0];
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) { err.textContent = 'Only PNG/JPEG supported.'; return; }
    if (f.size > MAX) { err.textContent = 'File too large (max 10MB).'; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; err.textContent = ''; };
    reader.readAsDataURL(f);
  });
})();

/* ========= 价格加载：优先 config.json，其次 prices.json ========= */
async function loadPriceMap(){
  // try config.json
  try {
    const r = await fetch('config.json?v=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const cfg = await r.json();
      if (cfg && Array.isArray(cfg.products)) {
        const m = {};
        cfg.products.forEach(p => { if (p?.id && p.price) m[p.id] = p.price; });
        if (Object.keys(m).length) return m;
      }
    }
  } catch {}
  // fallback prices.json
  try {
    const r2 = await fetch('prices.json?v=' + Date.now(), { cache: 'no-store' });
    if (r2.ok) return await r2.json();
  } catch {}
  return {};
}
const pickPrice = (conf, i0) => {
  if (conf == null) return null;
  if (Array.isArray(conf)) return conf[Math.min(i0, conf.length-1)];
  if (typeof conf === 'object') return conf[String(i0+1)] ?? null;
  return null;
};

/* ========= 为每张产品卡片绑定：箭头 + 进度条 + 价格联动 ========= */
function wireSlider(card, priceMap){
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  if (!vp || !track) return;

  // 关键元素兜底（以防 HTML 被改坏）
  let prog = vp.querySelector('.progress'); if(!prog){ prog = document.createElement('div'); prog.className='progress'; prog.innerHTML='<i></i>'; vp.appendChild(prog); }
  const bar = prog.querySelector('i');

  let left = vp.querySelector('.nav-arrow.left');
  let right= vp.querySelector('.nav-arrow.right');
  if(!left){ left=document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.textContent='‹'; vp.appendChild(left); }
  if(!right){ right=document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent='›'; vp.appendChild(right); }

  // 强制层级，避免被图片盖住
  vp.style.position = 'relative';
  prog.style.zIndex = '20';
  left.style.zIndex = right.style.zIndex = '30';

  const slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const pid = card.dataset.product;
  const conf = priceMap[pid];

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = prefersReduced ? 'auto' : 'smooth';
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
  const goTo = (i) => { i = clamp(i,0,slides.length-1); vp.scrollTo({left:i*vp.clientWidth, behavior:smooth}); update(i); };

  function update(i = getIndex()){
    if (bar && slides.length) bar.style.width = ((i+1)/slides.length)*100 + '%';
    left.classList.toggle('is-disabled', i<=0);
    right.classList.toggle('is-disabled', i>=slides.length-1);
    if (priceEl) {
      const p = pickPrice(conf, i);
      if (typeof p === 'number') priceEl.textContent = `$${p}`;
    }
  }

  left.onclick  = () => goTo(getIndex()-1);
  right.onclick = () => goTo(getIndex()+1);
  vp.addEventListener('scroll', () => { clearTimeout(vp.__st); vp.__st=setTimeout(()=>update(getIndex()), 90); }, {passive:true});
  addEventListener('resize', () => { clearTimeout(vp.__rt); vp.__rt=setTimeout(()=>goTo(getIndex()), 120); });

  update(0);
}

/* ========= 启动 ========= */
document.addEventListener('DOMContentLoaded', async () => {
  const priceMap = await loadPriceMap();
  document.querySelectorAll('.card.product.u3').forEach(card => wireSlider(card, priceMap));
});