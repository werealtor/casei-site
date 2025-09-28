/* ---- tiny utils ---- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

/* ---- nav toggle ---- */
(() => {
  const header = $('#site-header');
  const btn = $('.menu-toggle', header);
  btn?.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    header.classList.toggle('open', !expanded);
  });
})();

/* ---- theme toggle ---- */
(() => {
  const toggle = $('#theme-toggle');
  const apply = m => document.body.classList.toggle('dark', m==='dark');
  apply(localStorage.getItem('theme'));
  toggle?.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', next); apply(next);
  });
})();

/* ---- upload preview (demo) ---- */
(() => {
  const form = $('#uForm'), file = $('#file'), nameEl = $('#fileName'), err = $('#uErr'), prev = $('#preview');
  if(!form) return;
  file.addEventListener('change', () => {
    const f = file.files?.[0]; if(!f) return;
    nameEl.textContent = f.name;
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); err.textContent='';
    const f = file.files?.[0];
    if(!f){ err.textContent='Please choose an image.'; return;}
    if(!/image\/(png|jpeg)/.test(f.type) || f.size>10*1024*1024){
      err.textContent='PNG/JPEG and < 10MB required.'; return;
    }
    const r = new FileReader();
    r.onload = () => { prev.src = r.result; prev.style.display='block'; };
    r.readAsDataURL(f);
  });
})();

/* ---- products from config.json ---- */
(async () => {
  const grid = $('#products-grid');
  if(!grid) return;

  const cfg = await fetch('config.json', {cache:'no-store'}).then(r=>r.json());

  // build cards
  cfg.products.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card product u3';
    card.dataset.product = p.id;

    card.innerHTML = `
      <div class="main-viewport" role="region" aria-label="${p.name} gallery" tabindex="0">
        <div class="main-track"></div>
        <div class="progress"><i></i></div>
      </div>
      <div class="body">
        <h3>${p.name}</h3>
        <p class="sub">${p.subtitle ?? ''}</p>
        <div class="pillrow">${(p.badges||[]).map(b=>`<span class="pill">${b}</span>`).join('')}</div>
        <div class="price" data-id="${p.id}">$—</div>
      </div>
    `;
    grid.appendChild(card);

    // slides
    const track = $('.main-track', card);
    p.images.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.price = Array.isArray(p.price) ? p.price[i] : p.price?.[String(i+1)];
      slide.innerHTML = `<img class="cover" src="${src}" alt="${p.name} — ${i+1}" draggable="false" />`;
      track.appendChild(slide);
    });

    // arrows
    const vp = $('.main-viewport', card);
    const left = document.createElement('button');
    left.className = 'nav-arrow left'; left.setAttribute('aria-label','Prev'); left.textContent = '‹';
    const right = document.createElement('button');
    right.className = 'nav-arrow right'; right.setAttribute('aria-label','Next'); right.textContent = '›';
    vp.append(left,right);

    // ensure z-index is above images (Safari/iOS)
    [left,right,$('.progress',card)].forEach(el=>{ if(el){ el.style.zIndex = '9990'; }});

    // slider logic
    const slides = $$('.slide', track);
    const bar = $('.progress i', card);
    const priceEl = $('.price', card);

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const goTo = (i) => {
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: vp.clientWidth * i, behavior: 'smooth' });
      update(i);
    };

    function update(i = getIndex()){
      // progress
      if (bar) bar.style.width = ((i+1)/slides.length)*100 + '%';

      // price
      const val = slides[i]?.dataset.price;
      if (val && priceEl) priceEl.textContent = `$${val}`;

      // arrow state
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
    }

    left.onclick  = () => goTo(getIndex()-1);
    right.onclick = () => goTo(getIndex()+1);

    let _t; 
    vp.addEventListener('scroll', () => { clearTimeout(_t); _t = setTimeout(()=>update(getIndex()), 90); }, {passive:true});
    window.addEventListener('resize', () => { clearTimeout(_t); _t = setTimeout(()=>goTo(getIndex()), 120); });

    // init
    update(0);
  });
})();