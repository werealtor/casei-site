// 简易工具
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));

// 移动端菜单
(() => {
  const hdr = $('#site-header'), btn = $('.menu-toggle', hdr);
  if (btn) btn.addEventListener('click', () => hdr.classList.toggle('open'));
})();

// 主题
(() => {
  const btn = $('#theme-toggle');
  if(!btn) return;
  const apply = m => document.body.classList.toggle('dark', m==='dark');
  apply(localStorage.getItem('theme') || 'light');
  btn.addEventListener('click', () => {
    const cur = document.body.classList.contains('dark') ? 'dark':'light';
    const nxt = cur==='dark' ? 'light':'dark';
    localStorage.setItem('theme', nxt); apply(nxt);
  });
})();

// 主逻辑：从 config.json 渲染图片 & 初始化滑块 & 价格联动
(async function init() {
  const cfg = await fetch('config.json', {cache:'no-store'}).then(r=>r.json());

  cfg.products.forEach(prod => {
    const card  = $(`.card[data-product="${prod.id}"]`);
    if (!card) return;

    // 1) 渲染 slides
    const track = $('.main-track', card);
    track.innerHTML = '';
    prod.images.forEach((src, i) => {
      const d = document.createElement('div');
      d.className = 'slide';
      d.dataset.index = i+1;
      d.innerHTML = `<img class="cover" src="${src}" alt="${prod.name} ${i+1}" loading="lazy">`;
      track.appendChild(d);
    });

    // 2) 箭头（若不存在则创建）
    const vp = $('.main-viewport', card);
    let left  = $('.nav-arrow.left',  card);
    let right = $('.nav-arrow.right', card);
    if (!left)  { left  = document.createElement('button'); left.className  = 'nav-arrow left';  left.setAttribute('aria-label','Prev');  left.textContent  = '‹'; vp.appendChild(left); }
    if (!right) { right = document.createElement('button'); right.className = 'nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent = '›'; vp.appendChild(right); }

    // 3) 进度条
    const bar = $('.progress i', card);

    const slides = $$('.slide', track);
    const priceEl = $('.price', card);
    const priceList = prod.price || [];

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const goTo = (i) => {
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: 'smooth' });
      update(i);
    };

    function update(i = getIndex()) {
      // 进度
      const pct = ((i+1)/slides.length)*100;
      if (bar) bar.style.width = pct + '%';

      // 箭头禁用
      left.classList.toggle('is-disabled',  i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);

      // 价格联动（数组 or 对象均可）
      if (priceEl && priceList) {
        let v;
        if (Array.isArray(priceList)) v = priceList[ clamp(i,0,priceList.length-1) ];
        else v = priceList[String(i+1)];
        if (typeof v === 'number') priceEl.textContent = `$${v}`;
      }

      // 层级：确保箭头与进度条在图片之上
      vp.style.position = 'relative';
      $$('.slide .cover', card).forEach(img => { img.style.zIndex = '0'; img.style.pointerEvents = 'none'; });
      left.style.zIndex = right.style.zIndex = '9999';
      $('.progress', card).style.zIndex = '9998';
    }

    // 事件
    left.onclick  = () => goTo(getIndex()-1);
    right.onclick = () => goTo(getIndex()+1);

    let t=null;
    vp.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(()=>update(getIndex()), 60); }, {passive:true});
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(()=>goTo(getIndex()), 80); });

    // 初始
    update(0);
  });

  // 简易上传预览（保留）
  const form = $('#uForm'); if (form){
    const file = $('#file'), name = $('#fileName'), err = $('#uErr'), img = $('#preview');
    form.addEventListener('submit', e=>{
      e.preventDefault(); err.textContent='';
      const f=file.files[0]; if(!f){ err.textContent='Please choose an image.'; return; }
      if(!/^image\/(png|jpeg)$/.test(f.type)){ err.textContent='PNG/JPEG only.'; return; }
      if(f.size>10*1024*1024){ err.textContent='File must be < 10MB.'; return; }
      const url=URL.createObjectURL(f); img.src=url; img.style.display='block';
    });
    file.addEventListener('change', ()=>{
      name.textContent = file.files[0]?.name ? file.files[0].name : 'PNG/JPEG · < 10MB';
    });
  }
})();