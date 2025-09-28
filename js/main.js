<script>
// ============ 主题切换 ============
(function(){
  const btn = document.getElementById('theme-toggle');
  if(!btn) return;
  const getSysDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('theme');
  document.body.classList.toggle('dark', saved ? saved === 'dark' : getSysDark());
  btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  btn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.textContent = isDark ? '☀️' : '🌙';
  });
})();

// ============ 移动端菜单 ============
(function(){
  const toggle = document.querySelector('.menu-toggle');
  const header = document.querySelector('header');
  if(!toggle || !header) return;
  toggle.addEventListener('click', () => {
    const open = !header.classList.contains('open');
    header.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// ============ 上传预览 ============
(function(){
  const form = document.getElementById('uForm');
  if(!form) return;
  const file = document.getElementById('file');
  const hint = document.getElementById('fileName');
  const err  = document.getElementById('uErr');
  const preview = document.getElementById('preview');
  const MAX = 10*1024*1024;
  file.addEventListener('change', ()=>{
    if(!file.files.length){ hint.textContent='PNG/JPEG · < 10MB'; return; }
    const f = file.files[0];
    hint.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const f = file.files[0];
    if(!f){ err.textContent='Please choose an image.'; return; }
    if(!/^image\/(png|jpe?g)$/i.test(f.type)){ err.textContent='Only PNG/JPEG supported.'; return; }
    if(f.size>MAX){ err.textContent='File too large (max 10MB).'; return; }
    const r = new FileReader();
    r.onload = ev => { preview.src = ev.target.result; preview.style.display='block'; err.textContent=''; };
    r.readAsDataURL(f);
  });
})();

// ============ 价格联动（支持数组 / 对象） ============
async function loadPrices() {
  try {
    const res = await fetch('prices.json', {cache:'no-store'});
    if(!res.ok) throw 0;
    return await res.json();
  } catch { return null; }
}
function formatPrice(v){ return typeof v==='number' ? `$${v}` : '$—'; }

// ============ 滑块：箭头 + 进度条 ============
function initSliders(prices){
  const cards = document.querySelectorAll('.card.product');
  cards.forEach(card=>{
    const pid = card.dataset.product || '';
    const vp = card.querySelector('.main-viewport');
    const track = vp && vp.querySelector('.main-track');
    if(!vp || !track) return;

    // 如果还没有 slide（安全兜底）
    if(!track.querySelector('.slide')){
      // 尝试兼容 config.json 的 images 字段（可选）
      // 若你已在 HTML 里写好 <div class="slide"><img .../></div> 就不会执行这里
      const imgs = (card.dataset.images || '').split(',').filter(Boolean);
      imgs.forEach(src=>{
        const d = document.createElement('div');
        d.className='slide';
        d.innerHTML=`<img class="cover" src="${src.trim()}" alt="">`;
        track.appendChild(d);
      });
    }

    const slides = track.querySelectorAll('.slide');
    const bar = vp.querySelector('.progress i');
    // 创建箭头（若已存在则不重复创建）
    let left = vp.querySelector('.nav-arrow.left');
    let right = vp.querySelector('.nav-arrow.right');
    if(!left){
      left = document.createElement('button');
      left.className='nav-arrow left';
      left.setAttribute('aria-label','Previous');
      left.textContent='‹';
      vp.appendChild(left);
    }
    if(!right){
      right = document.createElement('button');
      right.className='nav-arrow right';
      right.setAttribute('aria-label','Next');
      right.textContent='›';
      vp.appendChild(right);
    }

    // 读价格数组（优先 prices.json 的同名键）
    const priceEl = card.querySelector('.price');
    const pData = prices && prices[pid];
    const getPriceForIndex = (i)=>{
      if(!pData) return null;
      if(Array.isArray(pData)) return pData[Math.min(i, pData.length-1)] ?? null;
      // 对象：用 1..n 键
      const key = String(i+1);
      return (pData && pData[key] != null) ? Number(pData[key]) : null;
    };

    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const getIndex=()=> Math.round(vp.scrollLeft / vp.clientWidth);
    const goTo=(i)=>{
      i = clamp(i,0,slides.length-1);
      vp.scrollTo({left: i*vp.clientWidth, behavior: 'smooth'});
      update(i);
    };
    function update(i=getIndex()){
      // 进度条
      if(bar){ bar.style.width = ((i+1)/slides.length*100)+'%'; }
      // 箭头可用态
      left.disabled = (i<=0);
      right.disabled = (i>=slides.length-1);
      // 价格联动
      if(priceEl){
        const pv = getPriceForIndex(i);
        priceEl.textContent = formatPrice(pv);
      }
    }

    // 事件
    left.addEventListener('click',()=>goTo(getIndex()-1));
    right.addEventListener('click',()=>goTo(getIndex()+1));
    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
      if(e.key==='Home'){ e.preventDefault(); goTo(0); }
      if(e.key==='End'){ e.preventDefault(); goTo(slides.length-1); }
    });

    // 滚动节流更新
    let st=null;
    vp.addEventListener('scroll', ()=>{
      if(st) cancelAnimationFrame(st);
      st = requestAnimationFrame(()=>update());
    }, {passive:true});

    // 尺寸变化时对齐
    let rt=null;
    window.addEventListener('resize', ()=>{
      clearTimeout(rt);
      rt=setTimeout(()=>goTo(getIndex()),120);
    });

    // 初始
    update(0);
  });
}

// ============ 启动 ============
document.addEventListener('DOMContentLoaded', async ()=>{
  const prices = await loadPrices();   // 可为空
  initSliders(prices || {});
});
</script>