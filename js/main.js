// ====== 全局常量 ======
// ✅ 优化：优先使用注入的 URL，否则回退到开发 URL
const BACKEND = window.__BACKEND_BASE__ || 'https://casei-backend.werealtor1.workers.dev';
const CART_KEY = 'casei_cart';

document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  initVideo();
  initUploadPreview();
  initProducts();      // ✅ 优化：动态加载产品
  initThemeToggle();
  initContact();       // ✅ 优化：功能补全
  initUpload();        // ✅ 优化：功能补全
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
    if(!file){
      if(fileNameEl) fileNameEl.textContent="no file selected";
      previewBox.style.display="none";
      return;
    }
    if(!["image/png","image/jpeg"].includes(file.type)){ alert("Only PNG/JPEG allowed."); upload.value=""; previewBox.style.display="none"; return; }
    if(file.size > 10*1024*1024){ alert("Max 10MB."); upload.value=""; previewBox.style.display="none"; return; }
    if(fileNameEl) fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => { previewImg.src = ev.target.result; previewBox.style.display="flex"; };
    reader.readAsDataURL(file);
  });
}

/* ===== ✅ 优化：动态加载产品 & 轮播 & 加购 ===== */
async function initProducts(){
  const gridContainer = document.getElementById('products-grid-container');
  if (!gridContainer) return;

  try{
    const res = await fetch("config.json?v="+Date.now(), { cache:"no-store" });
    if(!res.ok) throw new Error("config load failed");
    
    const data = await res.json();
    if(!Array.isArray(data?.products)) throw new Error("Invalid config data");

    // 清空加载占位符 (如果有的话)
    gridContainer.innerHTML = '';

    // 遍历 JSON 中的每个产品并创建卡片
    data.products.forEach(product => {
      const card = createProductCard(product); // 辅助函数：创建 HTML
      gridContainer.appendChild(card);
      // 辅助函数：为这张新卡片初始化轮播和加购事件
      setupCarouselAndCart(card, product); 
    });

  }catch(e){
    console.error(e);
    gridContainer.innerHTML = `<p style="color:red; text-align:center; grid-column: 1 / -1;">Failed to load products. Please refresh the page.</p>`;
  }
}

// 辅助函数：创建卡片的 HTML 结构
function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'card product';
  card.setAttribute('data-product', product.id);
  
  const defaultImage = product.images?.[0] || 'assets/images/placeholder.jpg';
  const defaultPrice = product.price?.[0] || product.price || 0;
  const description = product.description || '';
  const tags = Array.isArray(product.tags) ? product.tags : [];
  
  card.innerHTML = `
    <div class="main-viewport" role="region" aria-label="${product.name || 'Product'} carousel">
      <div class="main-track">
        <div class="slide">
          <img src="${defaultImage}" alt="${product.name || product.id} 1" loading="lazy">
        </div>
      </div>
    </div>
    <div class="body">
      <h3>${product.name || 'Product'}</h3>
      <p class="sub">${description}</p>
      <div class="pills">
        ${tags.map(tag => `<span class="pill">${tag}</span>`).join('')}
      </div>
      <div class="price" data-id="${product.id}">$${defaultPrice}</div>
      <button class="btn add-to-cart" type="button">Add to Cart</button>
    </div>
  `;
  return card;
}

// 辅助函数：设置轮播和加购 (即原来 setupProducts 的逻辑)
function setupCarouselAndCart(card, product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const prices = Array.isArray(product.price) ? product.price : [];
  const slidesData = images.map((img,i)=>({
    image: img,
    price: typeof prices[i]==='number' ? prices[i] : (typeof product.price==='number'?product.price:null)
  }));

  // 使用 card.querySelector 确保只在当前卡片内查找
  const track = card.querySelector(".main-track");
  const priceEl = card.querySelector(".price");
  const viewport = card.querySelector(".main-viewport");

  // 动态创建幻灯片 (第一张已在 createProductCard 中创建)
  for(let i=1;i<slidesData.length;i++){
    const s=document.createElement('div'); s.className='slide';
    const im=document.createElement('img'); im.src=slidesData[i].image; im.alt=`${product.name||product.id} ${i+1}`; im.loading='lazy';
    s.appendChild(im); track.appendChild(s);
  }

  const live = document.createElement('div'); live.setAttribute('aria-live','polite'); Object.assign(live.style,{position:'absolute',width:'1px',height:'1px',overflow:'hidden'}); viewport.appendChild(live);

  const left=document.createElement('button'); const right=document.createElement('button');
  left.className='nav-arrow left'; right.className='nav-arrow right'; left.textContent='‹'; right.textContent='›';
  left.setAttribute('aria-label', 'Previous Slide'); // ✅ A11y
  right.setAttribute('aria-label', 'Next Slide'); // ✅ A11y
  viewport.appendChild(left); viewport.appendChild(right);

  const dotsWrap=document.createElement('div'); dotsWrap.className='dots';
  slidesData.forEach((_,i)=>{ const d=document.createElement('span'); d.className='dot'; d.addEventListener('click',()=>{update(i); stopAuto(); setTimeout(startAuto,5000);}); dotsWrap.appendChild(d); });
  viewport.appendChild(dotsWrap);

  const pause=document.createElement('button'); pause.className='pause-btn'; pause.textContent='❚❚'; viewport.appendChild(pause);

  let index=0,timer=null,paused=false; const total=track.children.length; const dots=dotsWrap.children;
  if(total<=1) {
    // 如果只有一张图，隐藏所有控件
    left.style.display = 'none';
    right.style.display = 'none';
    dotsWrap.style.display = 'none';
    pause.style.display = 'none';
    return; // 停止执行轮播
  }

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
    // ✅ 关键：使用闭包中的 `index` 变量来获取正确的变体
    const item={ id:product.id, name:product.name, variant:index, image:slidesData[index].image, price:slidesData[index].price||0, quantity:1 };
    const exist=cart.find(i=>i.id===item.id && i.variant===item.variant);
    if(exist) exist.quantity++; else cart.push(item);
    setCart(cart); updateCartDisplay(); alert('Added to cart!');
  });

  // 启动
  update(0); startAuto();
}

/* ===== 主题 ===== */
function initThemeToggle(){
  const btn=document.getElementById('theme-toggle'); if(!btn) return;
  const html=document.documentElement;
  let theme=localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  html.setAttribute('data-theme',theme); btn.textContent= theme==='dark'?'☀️':'🌙';
  btn.addEventListener('click',()=>{ theme=theme==='dark'?'light':'dark'; html.setAttribute('data-theme',theme); localStorage.setItem('theme',theme); btn.textContent= theme==='dark'?'☀️':'🌙'; });
}

/* ===== ✅ 优化：联系表单 (功能补全) ===== */
function initContact(){
  const form = document.getElementById('contact-form'); 
  if(!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const helperEl = form.querySelector('.helper'); // 获取提示元素

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    
    // 提取表单数据
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    if (!data.name || !data.email || !data.message) {
      alert('Please fill out all fields.');
      return;
    }
    
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    helperEl.textContent = '...';

    try{
      // 你的后端联系端点
      const res = await fetch(`${BACKEND}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert('Message sent successfully!');
        form.reset();
        helperEl.textContent = 'We usually reply within 24 hours.';
      } else {
        const err = await res.json().catch(() => ({ message: 'Server error' }));
        alert(`Failed to send: ${err.message || 'Unknown error'}`);
        helperEl.textContent = 'An error occurred. Please try again.';
      }

    } catch(e) { 
      console.error(e);
      alert('Network error.');
      helperEl.textContent = 'A network error occurred. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}


/* ===== ✅ 优化：上传逻辑 (功能补全) ===== */
function initUpload(){
  const form = document.getElementById('custom-form');
  if(!form) return;

  const fileInput = document.getElementById('image-upload');
  const resultEl = document.getElementById('upload-result');
  const submitBtn = form.querySelector('button[type="submit"]');
  const fileNameEl = document.getElementById('file-name');
  const previewBox = document.getElementById('preview-box');

  form.addEventListener('submit', async e=>{
    e.preventDefault();

    const f = fileInput.files?.[0];
    if(!f){ alert('Please choose a file'); return; }
    if(!['image/png','image/jpeg'].includes(f.type)){ alert('Only PNG/JPEG allowed.'); return; }
    if(f.size > 10*1024*1024){ alert('Max 10MB.'); return; }

    const fd = new FormData();
    fd.append('file', f);
    fd.append('filename', f.name);
    
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    resultEl.textContent = '';

    try {
      
      // ✅ 优化：使用 /api/v1/upload 路径
const res = await fetch(`${BACKEND}/api/v1/upload`, { method:'POST', body: fd });

      const data = await res.json();

      if(res.ok && data.url){
        // 1. 上传成功 - 将其添加到购物车
        const cart = getCart();
        const customItem = { 
          id: `custom_${Date.now()}`, // 使用唯一 ID
          name: 'My Custom Design',
          variant: 0,
          image: data.url, // ✅ 使用用户上传的图片 URL
          price: 45, // ✅ 定制价格 (你可以在此硬编码或从配置中读取)
          quantity: 1 
        };
        
        cart.push(customItem);
        setCart(cart); 
        updateCartDisplay();
        
        // 2. 提示用户，并重置表单
        alert('Custom item added to cart!');
        form.reset();
        fileNameEl.textContent = 'no file selected';
        previewBox.style.display = 'none';
        resultEl.textContent = '';

      } else {
        const error = data.error || data.message || 'Upload failed';
        alert(`Upload failed: ${error}`);
        resultEl.textContent = `Upload failed: ${error}`;
      }
    }catch(err){
      console.error('Upload network error:', err);
      alert('Network error — check backend or CORS.');
      resultEl.textContent = 'Network error. Please try again.';
    } finally {
      // 3. 恢复按钮
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}

/* ===== 结账 ===== */
function initCheckout(){
  const btn=document.getElementById('checkout-btn'); if(!btn) return;
  btn.addEventListener('click', async ()=>{
    const cart=getCart(); if(!cart.length){ alert('Cart empty'); return; }
    try{
      
        // ✅ 优化：将来你的 checkout 路由也应该版本化
const res=await fetch(`${BACKEND}/api/v1/checkout`,{

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
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = cart.reduce((s,i)=>s+i.quantity,0);

  const itemsEl=document.getElementById('cart-items'); if(!itemsEl) return;
  itemsEl.innerHTML = cart.map((i,idx)=>`
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}">
      <div>${i.name} ${i.id.startsWith('custom_') ? '' : `(Variant ${i.variant+1})`} - $${i.price} × ${i.quantity}</div>
      <button class="remove-btn" data-index="${idx}" type="button">Remove</button>
    </div>
  `).join('');
  const total=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const totalEl = document.querySelector('.total');
  if (totalEl) totalEl.textContent = `Total: $${total}`;

  itemsEl.querySelectorAll('.remove-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const c=getCart(); c.splice(Number(btn.dataset.index),1); setCart(c); updateCartDisplay();
    });
  });
}
