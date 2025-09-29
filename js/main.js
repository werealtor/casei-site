async function init(){
  try{
    const res = await fetch("config.json?v=2",{cache:"no-store"});
    if(!res.ok) throw new Error("config load failed");
    const data = await res.json();
    setupProducts(data.products);
  }catch(e){ console.error(e); }

  // Hero autoplay + reduced motion
  const v = document.querySelector(".hero-media");
  if(v){
    v.muted = true;
    const tryPlay = () => v.play().catch(()=>{});
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay, { once:true });
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
      v.removeAttribute("autoplay"); v.pause();
    }
  }
}

function setupProducts(products){
  products.forEach(product=>{
    const card = document.querySelector(`.card[data-product="${product.id}"]`);
    if(!card) return;

    const track    = card.querySelector(".main-track");
    const progress = card.querySelector(".progress .bar");
    const priceEl  = card.querySelector(".price");
    const viewport = card.querySelector(".main-viewport");

    // slides
    track.innerHTML = "";
    product.images.forEach((src,i)=>{
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.src = src; img.alt = `${product.name} ${i+1}`; img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // arrows
    const leftBtn  = document.createElement("button");
    const rightBtn = document.createElement("button");
    leftBtn.className="nav-arrow left";  leftBtn.innerHTML="‹"; leftBtn.setAttribute("aria-label","Previous slide");
    rightBtn.className="nav-arrow right"; rightBtn.innerHTML="›"; rightBtn.setAttribute("aria-label","Next slide");
    viewport.appendChild(leftBtn); viewport.appendChild(rightBtn);

    // state
    let index=0, interval; const slides = track.children;

    function update(newIndex){
      if(!slides.length) return;
      index = Math.max(0, Math.min(newIndex, slides.length-1));
      track.style.transform = `translateX(-${index*100}%)`;
      if(progress) progress.style.width = ((index+1)/slides.length)*100 + "%";
      if(priceEl){
        if(Array.isArray(product.price)) priceEl.textContent = `$${product.price[index]}`;
        else if(product.price!=null)     priceEl.textContent = `$${product.price}`;
        else                             priceEl.textContent = "$--";
      }
      leftBtn.disabled = index===0;
      rightBtn.disabled = index===slides.length-1;
    }

    leftBtn.addEventListener("click",()=>update(index-1));
    rightBtn.addEventListener("click",()=>update(index+1));

    function startAuto(){ interval = setInterval(()=>update(index+1), 3000); }
    function stopAuto(){ clearInterval(interval); }
    startAuto();
    viewport.addEventListener("mouseenter", stopAuto);
    viewport.addEventListener("mouseleave", startAuto);

    // touch swipe
    let startX=0, dragging=false;
    viewport.addEventListener("touchstart", e=>{ startX=e.touches[0].clientX; dragging=true; stopAuto(); }, {passive:true});
    viewport.addEventListener("touchend",   e=>{
      if(!dragging) return; dragging=false;
      const delta = e.changedTouches[0].clientX - startX;
      if(delta>50) update(index-1); else if(delta<-50) update(index+1);
      startAuto();
    });

    update(0);
  });
}

// DOM Ready
document.addEventListener("DOMContentLoaded", ()=>{
  init();

  /* Upload preview (polished) */
  const upload = document.getElementById("image-upload");
  const previewImg = document.getElementById("preview-image");
  const previewBox = document.getElementById("preview-box");
  const fileNameEl = document.getElementById("file-name");

  if (upload && previewImg && previewBox) {
    upload.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file) { if (fileNameEl) fileNameEl.textContent = "no file selected"; previewBox.style.display = "none"; return; }

      if (!["image/png", "image/jpeg"].includes(file.type)) { alert("Only PNG/JPEG allowed."); upload.value = ""; previewBox.style.display = "none"; return; }
      if (file.size > 10 * 1024 * 1024) { alert("Max 10MB."); upload.value = ""; previewBox.style.display = "none"; return; }

      if (fileNameEl) fileNameEl.textContent = file.name;

      const reader = new FileReader();
      reader.onload = ev => {
        previewImg.src = ev.target.result;
        previewBox.style.display = "flex";   // show bordered preview
      };
      reader.readAsDataURL(file);
    });
  }

  /* Dark mode */
  const toggle = document.getElementById("dark-mode-toggle");
  const setIcon = () => toggle && (toggle.textContent = document.body.classList.contains("dark") ? "🌞" : "🌙");
  if(localStorage.getItem("darkMode")==="enabled") document.body.classList.add("dark");
  setIcon();
  toggle?.addEventListener("click", ()=>{
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "enabled":"disabled");
    setIcon();
  });

  /* Mobile drawer */
  const menuBtn = document.querySelector(".menu-icon");
  const wrap = document.querySelector(".top-nav-wrap");
  const list = document.querySelector(".top-nav");

  function closeMenu(){
    wrap?.classList.remove("active");
    document.body.classList.remove("menu-open");
    menuBtn?.setAttribute("aria-expanded","false");
  }
  if(menuBtn && wrap && list){
    menuBtn.addEventListener("click", ()=>{
      const active = wrap.classList.toggle("active");
      document.body.classList.toggle("menu-open", active);
      menuBtn.setAttribute("aria-expanded", active?"true":"false");
      if(active) setTimeout(()=> list.querySelector("a")?.focus({preventScroll:true}), 80);
    });
    wrap.addEventListener("click", e=>{ if(e.target===wrap) closeMenu(); });
    list.querySelectorAll("a[href^='#']").forEach(a=> a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", e=>{ if(e.key==="Escape" && wrap.classList.contains("active")) closeMenu(); });
    window.addEventListener("resize", closeMenu);

    // Smooth scroll offset
    document.querySelectorAll("a[href^='#']").forEach(a=>{
      a.addEventListener("click", ev=>{
        const id=a.getAttribute("href"); if(!id||id==="#") return;
        const target=document.querySelector(id); if(!target) return;
        ev.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 10;
        window.scrollTo({top:y, behavior:"smooth"});
      });
    });
  }
});