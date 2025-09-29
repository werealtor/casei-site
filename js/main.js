/* main.js - 产品轮播 + 价格联动 + 移动端抽屉菜单 + Hero 视频适配 */

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initVideo();
  initUploadPreview();
  initProducts();
});

/* ========== 顶部菜单（移动端抽屉） ========== */
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

/* ========== Hero 视频 ========== */
function initVideo(){
  const v = document.querySelector(".hero-media");
  if(!v) return;
  v.muted = true; v.playsInline = true; v.setAttribute("webkit-playsinline","true");
  const tryPlay = () => v.play().catch(()=>{});
  tryPlay();
  // 首次交互后再尝试播放，兼容部分移动浏览器策略
  const oncePlay = () => { tryPlay(); window.removeEventListener("touchstart", oncePlay); window.removeEventListener("click", oncePlay); };
  window.addEventListener("touchstart", oncePlay, { once:true, passive:true });
  window.addEventListener("click", oncePlay, { once:true });
  document.addEventListener("visibilitychange", () => { if(!document.hidden) tryPlay(); });
}

/* ========== 上传预览 ========== */
function initUploadPreview(){
  const upload = document.getElementById("image-upload");
  const previewImg = document.getElementById("preview-image");
  const previewBox = document.getElementById("preview-box");
  const fileNameEl = document.getElementById("file-name");
  if(!upload || !previewImg || !previewBox) return;

  upload.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if(!file){ if(fileNameEl) fileNameEl.textContent = "no file selected"; previewBox.style.display="none"; return; }
    if(!["image/png","image/jpeg"].includes(file.type)){ alert("Only PNG/JPEG allowed."); upload.value=""; previewBox.style.display="none"; return; }
    if(file.size > 10 * 1024 * 1024){ alert("Max 10MB."); upload.value=""; previewBox.style.display="none"; return; }
    if(fileNameEl) fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = ev => { previewImg.src = ev.target.result; previewBox.style.display="flex"; };
    reader.readAsDataURL(file);
  });
}

/* ========== 产品轮播 + 价格联动 ========== */
async function initProducts(){
  try{
    const res = await fetch("config.json?v=" + Date.now(), { cache: "no-store" });
    if(!res.ok) throw new Error("config load failed");
    const data = await res.json();
    if(Array.isArray(data?.products)) setupProducts(data.products);
  }catch(e){ console.error(e); }
}

function setupProducts(products){
  products.forEach(product => {
    const card = document.querySelector(`.card[data-product="${product.id}"]`);
    if(!card) return;

    // 数据归一：images + price 数组
    const images = Array.isArray(product.images) ? product.images : [];
    const prices = Array.isArray(product.price) ? product.price : [];
    const slidesData = images.map((img, i) => ({
      image: img,
      price: typeof prices[i] === "number" ? prices[i] : (typeof product.price === "number" ? product.price : null)
    }));

    const track = card.querySelector(".main-track");
    const progress = card.querySelector(".progress .bar");
    const priceEl = card.querySelector(".price");
    const viewport = card.querySelector(".main-viewport");

    // 注入 slides
    track.innerHTML = "";
    slidesData.forEach((s, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.src = s.image;
      img.alt = `${product.name || product.id} ${i+1}`;
      img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 箭头
    const leftBtn  = document.createElement("button");
    const rightBtn = document.createElement("button");
    leftBtn.className = "nav-arrow left";
    rightBtn.className = "nav-arrow right";
    leftBtn.setAttribute("aria-label","Previous slide");
    rightBtn.setAttribute("aria-label","Next slide");
    leftBtn.textContent  = "‹";
    rightBtn.textContent = "›";
    viewport.appendChild(leftBtn);
    viewport.appendChild(rightBtn);

    let index = 0, interval;
    const slides = track.children;

    function update(nextIndex){
      if(!slides.length) return;
      index = Math.max(0, Math.min(nextIndex, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;
      if(progress) progress.style.width = ((index + 1) / slides.length) * 100 + "%";

      // 精准价格（覆盖初始的 "from $"）
      if(priceEl){
        const p = slidesData[index]?.price;
        priceEl.textContent = (typeof p === "number") ? `$${p}` : priceEl.textContent;
      }

      // 首尾禁用
      leftBtn.disabled  = (index === 0);
      rightBtn.disabled = (index === slides.length - 1);
    }

    // 点击切换
    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

    // 自动轮播
    function startAuto(){ interval = setInterval(() => update(index + 1), 3000); }
    function stopAuto(){ clearInterval(interval); }
    startAuto();
    viewport.addEventListener("mouseenter", stopAuto);
    viewport.addEventListener("mouseleave", startAuto);

    // 触摸
    let startX = 0, dragging = false;
    viewport.addEventListener("touchstart", e => { dragging = true; startX = e.touches[0].clientX; stopAuto(); }, { passive:true });
    viewport.addEventListener("touchend", e => {
      if(!dragging) return; dragging = false;
      const d = e.changedTouches[0].clientX - startX;
      if(d > 50) update(index - 1);
      else if(d < -50) update(index + 1);
      startAuto();
    });

    update(0);
  });
}