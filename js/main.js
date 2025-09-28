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

/* ========= 读取 config.json（唯一数据源） ========= */
async function loadPriceMap(){
  try {
    const r = await fetch('config.json?v='+Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch {}
  return {};
}
const pickPrice = (conf, i0) => {
  if (conf == null) return null;
  if (Array.isArray(conf)) return conf[Math.min(i0, conf.length-1)];
  if (typeof conf === 'object') return conf[String(i0+1)] ?? null;
  return null;
};

/* ========= 自动生成 7 张图 ========= */
const IMAGE_COUNT = 7;
function buildSevenSlides(card){
  const track = card.querySelector('.main-track');
  if (!track) return;
  if (track.querySelector('.slide')) return; // 已有则跳过
  const pid = card.dataset.product;
  const frag = document.createDocumentFragment();
  for (let i=1; i<=IMAGE_COUNT; i++){
    const slide = document.createElement('div');
    slide.className = 'slide';
    const img = document.createElement('img');
    img.className = 'cover';
    img.alt = `${pid} — ${i}`;
    img.src = `assets/images/${pid}/${i}.jpg`;
    img.addEventListener('error', () => { slide.remove(); }); // 缺图自动移除
    slide.appendChild(img);
    frag.appendChild(slide);
  }
  track.appendChild(frag);
}

/* ========= 绑定滑块（箭头 + 进度条 + 价格联动） ========= */
function wireSlider(card, priceMap){
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  if (!vp || !track) return;

  // 补齐关键节点
  let prog = vp.querySelector('.progress'); if(!prog){ prog=document.createElement('div'); prog.className='progress'; prog.innerHTML='<i></i>'; vp.appendChild(prog); }
  const bar = prog.querySelector('i');
  let left = vp.querySelector('.nav-arrow.left');
  let right= vp.querySelector('.nav-arrow.right');
  if(!left){ left=document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.textContent='‹'; vp.appendChild(left); }
  if(!right){ right=document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent='›'; vp.appendChild(right); }

  // 保证层级
  vp.style.position = 'relative';
  prog.style.zIndex = '20';
  left.style.zIndex = right.style.zIndex = '30';

  let slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const pid = card.dataset.product;
  const conf = priceMap[pid];

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = prefersReduced ? 'auto' : 'smooth';
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
  const goTo = (i) => { i = clamp(i,0,slides.length-1); vp.scrollTo({left:i*vp.clientWidth, behavior:smooth}); setTimeout(()=>update(i),60); };

  function update(i = getIndex()){
    slides = track.querySelectorAll('.slide'); // 可能有缺图被移除
    const len = slides.length;
    if (bar && len) bar.style.width = ((i+1)/len)*100 + '%';
    left.classList.toggle('is-disabled', i<=0);
    right.classList.toggle('is-disabled', i>=len-1);
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

/* ========= 启动：每卡 7 图 + 绑定 ========= */
document.addEventListener('DOMContentLoaded', async () => {
  const priceMap = await loadPriceMap();
  document.querySelectorAll('.card.product.u3').forEach(card => {
    buildSevenSlides(card);
    wireSlider(card, priceMap);
  });
});