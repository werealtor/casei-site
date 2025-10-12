const BACKEND = window.__BACKEND_BASE__ || 'https://casei-backend.werealtor1.workers.dev';
const CART_KEY = 'casei_cart';

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initVideo();
  initUploadPreview();
  initProducts();
  initThemeToggle();
  initContact();
  initUpload();
  initCheckout();
  updateCartDisplay();
});

/* ===== 菜单 ===== */
function initMenu(){
  const menuBtn = document.querySelector(".menu-icon");
  const wrap = document.querySelector(".top-nav-wrap");
  const list = document.querySelector(".top-nav");
  if(!menuBtn || !wrap || !list) return;

  const closeMenu = () => {
    wrap.classList.remove("active");
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded","false");
  };

  menuBtn.addEventListener("click", () => {
    const active = wrap.classList.toggle("active");
    document.body.classList.toggle("menu-open", active);
    menuBtn.setAttribute("aria-expanded", active ? "true" : "false");
  });

  wrap.addEventListener("click", e => { if(e.target === wrap) closeMenu(); });
  list.querySelectorAll("a[href^='#']").forEach(a => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", e => { if(e.key === "Escape" && wrap.classList.contains("active")) closeMenu(); });
}

/* ===== Hero 视频 ===== */
function initVideo(){
  const v = document.querySelector(".hero-media");
  if(!v) return;
  v.muted = true; v.playsInline = true; v.setAttribute("webkit-playsinline","true");
  const tryPlay = () => v.play().catch(()=>{});
  tryPlay();
  const oncePlay = () => { tryPlay(); window.removeEventListener("touchstart", oncePlay); window.removeEventListener("click", oncePlay); };
  window.addEventListener("touchstart", oncePlay, { once:true, passive:true });
  window.addEventListener("click", oncePlay, { once:true });
  document.addEventListener("visibilitychange", () => { if(!document.hidden) tryPlay(); });
}

/* ===== 上传预览 ===== */
function initUploadPreview(){
  const upload = document.getElementById("image-upload");
  const previewImg = document.getElementById("preview-image");
  const previewBox = document.getElementById("preview-box");
  const fileNameEl = document.getElementById("file-name");
  if(!upload || !previewImg || !previewBox) return;

  upload.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if(!file){ if(fileNameEl) fileNameEl.textContent="no file selected"; previewBox.style.display="none"; return; }
    if(!["image/png","image/jpeg"].includes(file.type)){ alert("Only PNG/JPEG allowed."); upload.value=""; previewBox.style.display="none"; return; }
    if(file.size > 10*1024*1024){ alert("Max 10MB."); upload.value=""; previewBox.style.display="none"; return; }
    if(fileNameEl) fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => { previewImg.src = ev.target.result; previewBox.style.display="flex"; };
    reader.readAsDataURL(file);
  });
}

/* ===== 加载产品 & 轮播 & 加购 ===== */
async function initProducts(){
  try{
    const res = await fetch("config.json?v="+Date.now(), { cache:"no-store" });
    if(!res.ok) throw new Error("config load failed");
    const data = await res.json();
    if(Array.isArray(data?.products)) setupProducts(data.products);
  }catch(e){
    console.error(e);
    document.querySelectorAll('.card').forEach(card => {
      const el = document.createElement('p'); el.style.color='red'; el.style.textAlign='center'; el.textContent='Load failed, refresh please';
      card.querySelector('.main-viewport').appendChild(el);
    });
  }
}

function setupProducts(products){
  products.forEach(product=>{
    const card = document.querySelector(`.card[data-product="${product.id}"]`);
    if(!card) return;

    const images = Array.isArray(product.images) ? product.images : [];
    const prices = Array.isArray(product.price) ? product.price : [];
    const slidesData = images.map((img,i)=>({
      image: img,
      price: typeof prices[i]==='number' ? prices[i] : (typeof product.price==='number'?product.price:null)
    }));

    const track = card.querySelector(".main-track");
    const priceEl = card.querySelector(".price");
    const viewport = card.querySelector(".main-viewport");
    viewport.setAttribute('role','region'); viewport.setAttribute('aria-label','Product carousel');

    for(let i=1;i<slidesData.length;i++){
      const s=document.createElement('div'); s.className='slide';
      const im=document.createElement('img'); im.src=slidesData[i].image; im.alt=`${product.name||product.id} ${i+1}`; im.loading='lazy';
      s.appendChild(im); track.appendChild(s);
    }

    const live = document.createElement('div'); live.setAttribute('aria-live','polite'); Object.assign(live.style,{position:'absolute',width:'1px',height:'1px',overflow:'hidden'}); viewport.appendChild(live);

    const left=document.createElement('button'); const right=document.createElement('button');
    left.className='nav-arrow left'; right.className='nav-arrow right'; left.textContent='‹'; right.textContent='›';
    viewport.appendChild(left); viewport.appendChild(right);

    const dotsWrap=document.createElement('div'); dotsWrap.className='dots';
    slidesData.forEach((_,i)=>{ const d=document.createElement('span'); d.className='dot'; d.addEventListener('click',()=>{update(i); stopAuto(); setTimeout(startAuto,5000);}); dotsWrap.appendChild(d); });
    viewport.appendChild(dotsWrap);

    const pause=document.createElement('button'); pause.className='pause-btn'; pause.textContent='❚❚'; viewport.appendChild(pause);

    let index=0,timer=null,paused=false; const total=track.children.length; const dots=dotsWrap.children;
    if(total<=1) return;

    function update(next,announce=true){
      index=(next+total)%total;
      requestAnimationFrame(()=>{track.style.transform=`translateX(-${index*100}%)`;});
      Array.from(dots).forEach((d,i)=>d.classList.toggle('active',i===index));
      if(priceEl){ const p=slidesData[index]?.price; if(typeof p==='number') priceEl.textContent=`$${p}`; }
      live.textContent = announce ? `Slide ${index+1} of ${total}` : '';
      pause.textContent = paused ? '▶':'❚❚';
    }
    function scheduleNext(ms=5000){ clearTimeout(timer); timer=setTimeout(()=>{update(index+1); scheduleNext();},ms); }
    function startAuto(){ paused=false; scheduleNext(); viewport.classList.remove('paused'); }
    function stopAuto(){ paused=true; clearTimeout(timer); viewport.classList.add('paused'); }

    left.addEventListener('click',()=>{update(index-1); stopAuto(); setTimeout(startAuto,5000);});
    right.addEventListener('click',()=>{update(index+1); stopAuto(); setTimeout(startAuto,5000);});
    pause.addEventListener('click',()=>{paused?startAuto():stopAuto(); update(index,false);});
    viewport.addEventListener('mouseenter',stopAuto); viewport.addEventListener('mouseleave',startAuto);

    // touch
    let sx=0,cx=0,drag=false;
    viewport.addEventListener('touchstart',e=>{drag=true; sx=e.touches[0].clientX; stopAuto(); track.style.transition='none';},{passive:true});
    viewport.addEventListener('touchmove',e=>{if(!drag) return; cx=e.touches[0].clientX; const off=(cx-sx)/viewport.offsetWidth*100; track.style.transform=`translateX(calc(-${index*100}% + ${off}%))`;},{passive:true});
    viewport.addEventListener('touchend',()=>{if(!drag) return; drag=false; track.style.transition='transform .3s ease'; const d=cx-sx; if(d>50) update(index-1); else if(d<-50) update(index+1); else update(index); setTimeout(startAuto,5000);});

    // 加购
    const btn=card.querySelector('.add-to-cart');
    btn.addEventListener('click',()=>{
      const cart=getCart();
      const item={ id:product.id, name:product.name, variant:index, image:slidesData[index].image, price:slidesData[index].price||0, quantity:1 };
      const exist=cart.find(i=>i.id===item.id && i.variant===item.variant);
      if(exist) exist.quantity++; else cart.push(item);
      setCart(cart); updateCartDisplay(); alert('Added to cart!');
    });

    // 启动
    update(0); startAuto();
  });
}

/* ===== 主题 ===== */
function initThemeToggle(){
  const btn=document.getElementById('theme-toggle'); if(!btn) return;
  const html=document.documentElement;
  let theme=localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  html.setAttribute('data-theme',theme); btn.textContent= theme==='dark'?'☀️':'🌙';
  btn.addEventListener('click',()=>{ theme=theme==='dark'?'light':'dark'; html.setAttribute('data-theme',theme); localStorage.setItem('theme',theme); btn.textContent= theme==='dark'?'☀️':'🌙'; });
}

/* ===== 联系表单（可接后端 /contact，先占位成功） ===== */
function initContact(){
  const form=document.getElementById('contact-form'); if(!form) return;
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      // 可改成真实端点： `${BACKEND}/contact`
      alert('Sent!');
      form.reset();
    }catch(e){ alert('Failed.'); }
  });
}

/* ===== 上传逻辑 ===== */
function initUpload(){
  const form=document.getElementById('custom-form'); if(!form) return;
  const fileInput=document.getElementById('image-upload');
  const nameEl=document.getElementById('file-name');
  const resultEl=document.getElementById('upload-result');

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const f=fileInput.files?.[0];
    if(!f){ alert('Choose a file'); return; }
    const fd=new FormData();
    fd.append('file', f);
    fd.append('filename', f.name);

    try{
      const res=await fetch(`${BACKEND}/upload`, { method:'POST', body:fd });
      const data=await res.json();
      if(res.ok && data.url){
        resultEl.style.display='block';
        resultEl.innerHTML = `Uploaded: <a href="${data.url}" target="_blank" rel="noopener">${data.url}</a>`;
      }else{
        console.error(data);
        alert('Upload failed');
      }
    }catch(err){
      console.error(err); alert('Network error');
    }
  });
}

/* ===== 结账 ===== */
function initCheckout(){
  const btn=document.getElementById('checkout-btn'); if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const cart=getCart(); if(!cart.length){ alert('Cart empty'); return; }
    try{
      const res=await fetch(`${BACKEND}/checkout`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ items: cart })
      });
      const data=await res.json();
      if(res.ok && data.url){ window.location.href=data.url; }
      else{ console.error(data); alert('Checkout error'); }
    }catch(e){ console.error(e); alert('Network error'); }
  });
}

/* ===== 购物车 ===== */
function getCart(){ return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); }
function setCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }
function updateCartDisplay(){
  const cart=getCart();
  document.getElementById('cart-count').textContent = cart.reduce((s,i)=>s+i.quantity,0);
  const itemsEl=document.getElementById('cart-items'); if(!itemsEl) return;
  itemsEl.innerHTML = cart.map((i,idx)=>`
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}">
      <div>${i.name} (Variant ${i.variant+1}) - $${i.price} × ${i.quantity}</div>
      <button class="remove-btn" data-index="${idx}" type="button">Remove</button>
    </div>
  `).join('');
  const total=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  document.querySelector('.total').textContent = `Total: $${total}`;
  itemsEl.querySelectorAll('.remove-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const c=getCart(); c.splice(Number(btn.dataset.index),1); setCart(c); updateCartDisplay();
    });
  });
}
