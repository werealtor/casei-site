/* tiny utils */
const $ = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* nav toggle */
(() => {
  const header = $('#site-header');
  const btn = $('.menu-toggle', header);
  btn?.addEventListener('click', () => {
    const exp = btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded', String(!exp));
    header.classList.toggle('open', !exp);
  });
})();

/* theme toggle */
(() => {
  const btn = $('#theme-toggle');
  if(!btn) return;
  const saved = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.body.classList.toggle('dark', saved==='dark');
  btn.textContent = saved==='dark' ? '☀️' : '🌙';
  btn.addEventListener('click', ()=>{
    const dark = !document.body.classList.contains('dark');
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark?'dark':'light');
    btn.textContent = dark ? '☀️' : '🌙';
  });
})();

/* upload preview (demo) */
(() => {
  const form = $('#uForm'); if(!form) return;
  const file = $('#file'), nameEl = $('#fileName'), err = $('#uErr'), prev = $('#preview');
  const MAX = 10*1024*1024;
  file.addEventListener('change', ()=>{
    const f=file.files?.[0]; nameEl.textContent = f ? `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB` : 'PNG/JPEG · < 10MB';
  });
  form.addEventListener('submit', e=>{
    e.preventDefault(); err.textContent='';
    const f=file.files?.[0];
    if(!f){ err.textContent='Please choose an image.'; return; }
    if(!/^image\/(png|jpe?g)$/i.test(f.type)){ err.textContent='Only PNG/JPEG supported.'; return; }
    if(f.size>MAX){ err.textContent='File too large (max 10MB).'; return; }
    const r=new FileReader();
    r.onload = ev=>{ prev.src=ev.target.result; prev.style.display='block'; };
    r.readAsDataURL(f);
  });
})();

/* build products from config.json */
(async () => {
  const grid = $('#products-grid') || $('.products-grid');
  if(!grid) return;

  const cfg = await fetch('config.json', {cache:'no-store'}).then(r=>r.json()).catch(()=>null);
  if(!cfg?.products?.length) return;

  cfg.products.forEach(p=>{
    // 若 index.html 已有卡片，就用现成的；否则注入一张
    let card = $(`.card.product[data-product="${p.id}"]`, grid);
    if(!card){
      card = document.createElement('article');
      card.className='card product u3';
      card.dataset.product = p.id;
      card.innerHTML = `
        <div class="main-viewport" role="region" aria-label="${p.name} gallery" tabindex="0">
          <div class="main-track"></div>
          <div class="progress"><i></i></div>
        </div>
        <div class="body">
          <h3>${p.name}</h3>
          <p class="sub">${p.subtitle??''}</p>
          <div class="pillrow">${(p.badges||[]).map(b=>`<span class="pill">${b}</span>`).join('')}</div>
          <div class="price" data-id="${p.id}">$—</div>
        </div>`;
      grid.appendChild(card);
    }

    const vp = $('.main-viewport', card);
    const track = $('.main-track', card);
    const priceEl = $('.price', card);
    const prog = $('.progress', card) || (()=>{ const d=document.createElement('div'); d.className='progress'; d.innerHTML='<i></i>'; vp.appendChild(d); return d; })();
    const bar  = $('i', prog);

    // slides
    track.innerHTML='';
    (p.images||[]).forEach((src, i)=>{
      const slide = document.createElement('div');
      slide.className='slide';
      slide.dataset.price = Array.isArray(p.price) ? p.price[i] : p.price?.[String(i+1)];
      slide.innerHTML = `<img class="cover" src="${src}" alt="${p.name} — ${i+1}" draggable="false" />`;
      track.appendChild(slide);
    });

    // arrows（缺就补）
    let left  = $('.nav-arrow.left', card);
    let right = $('.nav-arrow.right', card);
    if(!left){  left=document.createElement('button');  left.className='nav-arrow left';  left.setAttribute('aria-label','Prev');  left.textContent='‹'; vp.appendChild(left); }
    if(!right){ right=document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent='›'; vp.appendChild(right); }

    // z-index 兜底（防止被图片盖住）
    vp.style.position='relative';
    $$('.slide .cover', card).forEach(img=>{ img.style.zIndex='0'; img.style.pointerEvents='none'; });
    [left,right].forEach(a=>{ a.style.zIndex='9999'; a.style.pointerEvents='auto'; a.style.opacity='1'; });
    prog.style.zIndex='9998';

    const slides = $$('.slide', track);
    const getIndex = ()=> Math.round(vp.scrollLeft / vp.clientWidth);

    const goTo = i=>{
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: vp.clientWidth * i, behavior:'smooth' });
      update(i);
    };

    function update(i=getIndex()){
      if (bar) bar.style.width = ((i+1)/(slides.length||1))*100 + '%';

      const val = slides[i]?.dataset.price;
      if (val && priceEl) priceEl.textContent = `$${val}`;

      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
    }

    left.onclick  = ()=> goTo(getIndex()-1);
    right.onclick = ()=> goTo(getIndex()+1);

    let t; 
    vp.addEventListener('scroll', ()=>{ clearTimeout(t); t=setTimeout(()=>update(getIndex()), 90); }, {passive:true});
    window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(()=>goTo(getIndex()), 120); });

    update(0);
  });
})();