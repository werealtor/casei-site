/* ========= 移动端菜单 ========= */
const menuToggle = document.querySelector('.menu-toggle');
const headerEl = document.querySelector('header');
if (menuToggle && headerEl) {
  menuToggle.addEventListener('click', () => {
    headerEl.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', headerEl.classList.contains('open'));
  });
}

/* ========= 工具 ========= */
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
const debounce=(fn,wait=90)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait)}}

/* ========= 价格加载（可选） ========= */
async function fetchJSON(url){
  try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
  catch{ return null; }
}
function getPriceFromMaps(pricesMap, productId, index0){
  if(!pricesMap || !(productId in pricesMap)) return null;
  const v = pricesMap[productId];
  if (typeof v === 'number') return v;
  if (Array.isArray(v)) return v[index0] ?? v[v.length-1];
  if (v && typeof v === 'object') {
    const k1 = String(index0+1);
    if (v[k1]!=null) return v[k1];
    // fallback 最小键
    const keys = Object.keys(v).sort((a,b)=>+a-+b);
    return v[keys[0]];
  }
  return null;
}
function fmtMoney(num,currency='USD',locale=(navigator.language||'en-US')){
  try{ return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:0}).format(num); }
  catch{ return `$${num}`; }
}

/* ========= 初始化每个卡片的滑块 ========= */
function initCardSlider(card, prices){
  const vp = card.querySelector('.main-viewport');
  const track = card.querySelector('.main-track');
  if (!vp || !track) return;

  // 只在 viewport 层插入一次箭头&进度条（避免被图片遮挡）
  let left = card.querySelector('.nav-arrow.left');
  let right = card.querySelector('.nav-arrow.right');
  let progress = card.querySelector('.progress');
  if (!progress){ progress = document.createElement('div'); progress.className='progress'; progress.innerHTML='<i></i>'; vp.appendChild(progress); }
  const fill = progress.querySelector('i');

  if (!left){ left=document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.innerHTML='&#8249;'; vp.appendChild(left); }
  if (!right){ right=document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.innerHTML='&#8250;'; vp.appendChild(right); }

  const slides = track.querySelectorAll('.slide');
  const priceEl = card.querySelector('.price');
  const pid = card.dataset.product;

  const getIndex = ()=> Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));

  function update(i=getIndex()){
    left.classList.toggle('is-disabled', i<=0);
    right.classList.toggle('is-disabled', i>=slides.length-1);

    // 进度条
    fill.style.width = `${((i+1)/slides.length)*100}%`;

    // 价格联动（有 prices.json 就显示）
    if (prices && priceEl) {
      const p = getPriceFromMaps(prices, pid, i);
      priceEl.textContent = (p==null) ? '—' : fmtMoney(p);
      priceEl.classList.toggle('is-na', p==null);
    }
  }
  function goTo(i){
    i = clamp(i, 0, slides.length-1);
    vp.scrollTo({ left: i * vp.clientWidth, behavior: 'smooth' });
    update(i);
  }

  left.addEventListener('click', ()=> goTo(getIndex()-1));
  right.addEventListener('click',()=> goTo(getIndex()+1));
  vp.addEventListener('keydown', e=>{
    if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
    if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
    if(e.key==='Home'){ e.preventDefault(); goTo(0); }
    if(e.key==='End'){ e.preventDefault(); goTo(slides.length-1); }
  });
  vp.addEventListener('scroll', debounce(()=>update(getIndex()),80), {passive:true});
  window.addEventListener('resize', debounce(()=>update(getIndex()),120));

  // 首次更新
  update(0);
}

/* ========= 启动 ========= */
(async function boot(){
  const prices = await fetchJSON('prices.json'); // 可选，拿不到就只显示“—”
  document.querySelectorAll('.card.product.u3').forEach(card=> initCardSlider(card, prices));
})();