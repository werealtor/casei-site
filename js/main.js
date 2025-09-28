/* Case&i — U3 slider + price sync + arrows + progress */
(function(){
  const $ = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

  async function loadConfig(){
    const res = await fetch('config.json', { cache:'no-store' });
    if(!res.ok) throw new Error('config.json not found');
    return res.json();
  }

  function injectSlidesIfEmpty(card, p){
    const track = $('.main-track', card);
    if(!track) return [];
    if(track.children.length) return $$('.slide', track);
    if(!p || !Array.isArray(p.images)) return [];
    p.images.forEach((src,i)=>{
      const slide = document.createElement('div'); slide.className='slide';
      const img = document.createElement('img'); img.className='cover';
      img.src = src; img.alt = `${p.name||p.id} — ${i+1}`; img.draggable=false;
      slide.appendChild(img); track.appendChild(slide);
    });
    return $$('.slide', track);
  }

  function ensureControls(vp){
    // progress
    let prog = $('.progress', vp);
    if(!prog){ prog = document.createElement('div'); prog.className='progress'; prog.innerHTML='<div class="bar"></div>'; vp.appendChild(prog); }
    else if(!$('.bar', prog)){ prog.innerHTML='<div class="bar"></div>'; }
    const bar = $('.bar', prog);
    // arrows
    let left = $('.nav-arrow.left', vp);
    if(!left){ left = document.createElement('button'); left.className='nav-arrow left'; left.setAttribute('aria-label','Previous'); left.textContent='‹'; vp.appendChild(left); }
    let right = $('.nav-arrow.right', vp);
    if(!right){ right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent='›'; vp.appendChild(right); }
    return { bar, left, right };
  }

  function mountCard(card, pCfg){
    const vp = $('.main-viewport', card);
    const track = $('.main-track', card);
    const priceEl = $('.price', card);
    if(!vp || !track) return;

    const slides = injectSlidesIfEmpty(card, pCfg);
    const { bar, left, right } = ensureControls(vp);

    // z-index 安全：图片不挡点击，控件永远在顶层
    $$('.slide .cover', vp).forEach(img=>{ img.style.pointerEvents='none'; img.style.zIndex='0'; });
    [left,right].forEach(a=>{ a.style.zIndex='9999'; a.style.opacity='1'; a.style.pointerEvents='auto'; });
    vp.style.position='relative';

    const getIndex = ()=> Math.round(vp.scrollLeft / vp.clientWidth);
    const goto = (i)=>{
      i = clamp(i, 0, slides.length-1);
      track.style.transform = `translateX(-${i*100}%)`;
      update(i);
    };
    function update(i=getIndex()){
      if(bar) bar.style.width = ((i+1)/(slides.length||1))*100 + '%';
      left.classList.toggle('is-disabled', i===0);
      right.classList.toggle('is-disabled', i===slides.length-1);
      if(pCfg && Array.isArray(pCfg.price) && priceEl){
        const v = pCfg.price[Math.min(i, pCfg.price.length-1)];
        if(typeof v==='number') priceEl.textContent = `$${v}`;
      }
    }

    left.onclick = ()=> goto(getIndex()-1);
    right.onclick = ()=> goto(getIndex()+1);

    // 初始化
    update(0);
  }

  // 上传预览（保留）
  function setupUpload(){
    const uForm = $('#uForm'); if(!uForm) return;
    const fileInput = $('#file');
    const nameEl = $('#fileName');
    const err = $('#uErr');
    const preview = $('#preview');
    const MAX = 10*1024*1024;
    fileInput.addEventListener('change', ()=>{
      if(!fileInput.files.length){ nameEl.textContent='PNG/JPEG · < 10MB'; return; }
      const f=fileInput.files[0]; nameEl.textContent=`${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
    });
    uForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const f=fileInput.files[0]; if(!f){ err.textContent='Please choose an image.'; return; }
      if(!/^image\/(png|jpe?g)$/i.test(f.type)){ err.textContent='Only PNG/JPEG supported.'; return; }
      if(f.size>MAX){ err.textContent='File too large (max 10MB).'; return; }
      const reader=new FileReader();
      reader.onload = ev=>{ preview.src=ev.target.result; preview.style.display='block'; err.textContent=''; };
      reader.readAsDataURL(f);
    });
  }

  // 主题按钮
  function setupTheme(){
    const btn = $('#theme-toggle'); if(!btn) return;
    const saved = localStorage.getItem('theme');
    if(saved==='dark'){ document.body.classList.add('dark'); btn.textContent='☀️'; }
    btn.addEventListener('click', ()=>{
      const isDark = document.body.classList.toggle('dark');
      btn.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    try{
      const cfg = await loadConfig();
      const map = cfg?.products ? Object.fromEntries(cfg.products.map(p=>[p.id,p])) : {};
      $$('.card.product.u3').forEach(card=>{
        const id = card.dataset.product;
        mountCard(card, map[id]);
      });
      setupUpload();
      setupTheme();
    }catch(e){
      console.error(e);
    }
  });
})();