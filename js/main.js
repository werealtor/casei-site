/* ========= 主题切换 ========= */
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  let theme = localStorage.getItem('theme') ||
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
    const f = fileInput.files[0];
    const err = document.getElementById('uErr');
    const preview = document.getElementById('preview');
    if (!f) { err.textContent = 'Please choose an image.'; return; }
    if (!f.type.startsWith('image/')) { err.textContent = 'Invalid file.'; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { preview.src = ev.target.result; preview.style.display = 'block'; err.textContent = ''; };
    reader.readAsDataURL(f);
  });
}

/* ========= 首屏自动暂停门控（滚到产品区再启播） ========= */
/* 逻辑：
   1) 页面首屏时，暂停所有轮播（firstScreenGate = true）。
   2) 当页面滚动超过“产品区顶边 - 120px”阈值后，解除门控（firstScreenGate = false），
      这时各卡片会按可见性/用户交互等条件自行开始/恢复自动轮播。
*/
let firstScreenGate = true;
const productsSection = document.getElementById('products');
const FIRST_GATE_OFFSET = 120;   // 提前 120px 触发
function refreshFirstScreenGate() {
  if (!productsSection) { firstScreenGate = false; return; }
  const triggerY = productsSection.offsetTop - FIRST_GATE_OFFSET;
  firstScreenGate = window.scrollY < triggerY;
  // 通知每个滑块同步一次
  document.querySelectorAll('.card.product.u3').forEach(card=>{
    card._sliderAPI && card._sliderAPI.syncAutoplay();
  });
}
window.addEventListener('scroll', () => { refreshFirstScreenGate(); }, { passive:true });
window.addEventListener('resize', () => { refreshFirstScreenGate(); });
document.addEventListener('DOMContentLoaded', refreshFirstScreenGate);

/* ========= U3：极简箭头 + 进度条 + 自动轮播（含首屏门控） ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';
  const AUTOPLAY_DELAY = 3000;     // 每张停留 3s
  const RESUME_AFTER   = 5000;     // 用户交互后 5s 无操作恢复
  const OBS_THRESHOLD  = 0.6;      // 卡片 60% 可见时才自动轮播

  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          const card = entry.target;
          const api = card._sliderAPI;
          if(!api) return;
          api.visible = entry.isIntersecting && entry.intersectionRatio >= OBS_THRESHOLD;
          api.syncAutoplay();
        });
      }, { threshold:[OBS_THRESHOLD] })
    : null;

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp = card.querySelector('.main-viewport');
    const track = card.querySelector('.main-track');
    if(!vp || !track) return;

    // 渐隐边缘包裹（可删）
    if(!card.querySelector('.edge-mask')){
      const wrap = document.createElement('div');
      wrap.className = 'edge-mask';
      vp.parentNode.insertBefore(wrap, vp);
      wrap.appendChild(vp);
    }

    // 箭头 + 进度条
    const left  = document.createElement('button'); left.className  = 'nav-arrow left';  left.setAttribute('aria-label','Previous'); left.textContent  = '‹';
    const right = document.createElement('button'); right.className = 'nav-arrow right'; right.setAttribute('aria-label','Next');     right.textContent = '›';
    const bar   = document.createElement('div');   bar.className   = 'progress';         bar.innerHTML = '<i></i>';
    vp.append(left, right, bar);
    const fill = bar.querySelector('i');

    // 基础
    const slides = track.querySelectorAll('.slide');
    if(!slides.length) return;
    vp.setAttribute('tabindex','0');
    vp.setAttribute('aria-label','Product gallery');

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp    = (n,min,max)=> Math.max(min, Math.min(max,n));

    const update = (i = getIndex())=>{
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
      fill.style.width = `${((i+1)/slides.length)*100}%`;
    };

    const goTo = (i)=>{
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
      showArrows();
    };

    // 交互
    const stopAutoplayTemp = ()=>{
      api.pausedByUser = true;
      api.stop();
      clearTimeout(api.resumeTimer);
      api.resumeTimer = setTimeout(()=>{ api.pausedByUser = false; api.syncAutoplay(); }, RESUME_AFTER);
    };

    left.addEventListener('click', ()=>{ stopAutoplayTemp(); goTo(getIndex()-1); });
    right.addEventListener('click', ()=>{ stopAutoplayTemp(); goTo(getIndex()+1); });

    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); stopAutoplayTemp(); goTo(getIndex()-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); stopAutoplayTemp(); goTo(getIndex()+1); }
      if(e.key==='Home'){ e.preventDefault(); stopAutoplayTemp(); goTo(0); }
      if(e.key==='End'){ e.preventDefault(); stopAutoplayTemp(); goTo(slides.length-1); }
    });

    let st;
    vp.addEventListener('scroll', ()=>{
      clearTimeout(st);
      st=setTimeout(()=> update(getIndex()), 90);
      stopAutoplayTemp();
    }, {passive:true});

    let rt;
    window.addEventListener('resize', ()=>{
      clearTimeout(rt);
      rt=setTimeout(()=> goTo(getIndex()), 120);
    });

    // 箭头自动淡出（桌面端）
    let hideTimer;
    const showArrows = ()=>{
      [left,right].forEach(a=>a.classList.add('is-visible'));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(()=> [left,right].forEach(a=>a.classList.remove('is-visible')), 1500);
    };
    ['mousemove','keydown','click','scroll'].forEach(evt=>{
      vp.addEventListener(evt, showArrows, { passive:true });
    });
    showArrows();

    // ===== 自动轮播 API（含首屏门控 + 可见性） =====
    const api = {
      timer: null,
      resumeTimer: null,
      pausedByUser: false,
      visible: true,  // IO 更新
      start(){
        if (prefersReduced) return;            // 减少动画：不启动
        if (this.timer) return;
        this.timer = setInterval(()=>{
          const i = getIndex();
          goTo(i + 1 >= slides.length ? 0 : i + 1);
        }, AUTOPLAY_DELAY);
      },
      stop(){
        if (this.timer){ clearInterval(this.timer); this.timer = null; }
      },
      // 统一判断是否允许自动播
      allow(){
        if (firstScreenGate) return false;     // ✅ 首屏门控：未过阈值不播
        if (document.hidden) return false;     // 标签页不可见不播
        if (!this.visible) return false;       // 卡片不可见不播
        if (this.pausedByUser) return false;   // 用户临时暂停
        return true;
      },
      syncAutoplay(){
        this.stop();
        if (this.allow()) this.start();
      }
    };
    card._sliderAPI = api;

    // 可见性观察
    if (io) io.observe(card);
    document.addEventListener('visibilitychange', ()=> api.syncAutoplay());

    // 初始化
    update(0);
    api.syncAutoplay(); // 若一加载就已过阈值且可见，则会自动启动
  });
})();