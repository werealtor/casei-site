// Case&i main JS
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Smooth scroll
  $$(".btn[data-scroll]").forEach(btn => {
    btn.addEventListener("click", () => {
      const to = btn.getAttribute("data-scroll");
      const el = $(to);
      if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  // Load config
  async function loadConfig(){
    const res = await fetch("config.json");
    if(!res.ok) throw new Error("Failed to load config.json");
    return res.json();
  }

  // Build product carousel
  function buildProductCard(card, images, price){
    const track = $(".main-track", card);
    track.innerHTML = "";
    images.forEach(src => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = `images/${src}`;
      img.alt = `${card.dataset.product} preview`;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    const priceEl = $(".price", card);
    if (priceEl) priceEl.textContent = `$${price.toFixed(2)}`;

    let index = 0;
    const total = images.length;
    const left = $(".nav-arrow.left", card);
    const right = $(".nav-arrow.right", card);
    const bar = $(".progress .bar", card);

    function update(){
      const w = card.querySelector(".main-viewport").clientWidth;
      track.style.transform = `translateX(-${index * w}px)`;
      const pct = total > 1 ? (index/(total-1))*100 : 100;
      bar.style.width = `${pct}%`;
      left.disabled = index <= 0;
      right.disabled = index >= total - 1;
    }

    const ro = new ResizeObserver(update);
    ro.observe($(".main-viewport", card));

    left.addEventListener("click", () => { if(index>0){ index--; update(); }});
    right.addEventListener("click", () => { if(index<total-1){ index++; update(); }});

    let startX = 0;
    const viewport = $(".main-viewport", card);
    viewport.addEventListener("touchstart", (e)=> startX = e.touches[0].clientX, {passive:true});
    viewport.addEventListener("touchend", (e)=>{
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 40 && index>0) { index--; update(); }
      else if (dx < -40 && index<total-1) { index++; update(); }
    });

    viewport.tabIndex = 0;
    viewport.addEventListener("keydown", (e)=>{
      if(e.key === "ArrowLeft" && index>0){ index--; update(); }
      if(e.key === "ArrowRight" && index<total-1){ index++; update(); }
    });

    update();
  }

  // Dark mode toggle
  const toggleBtn = $("#dark-mode-toggle");
  function applyTheme(mode){
    if (mode === "dark") {
      document.body.classList.add("dark");
      toggleBtn.textContent = "☀";
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      toggleBtn.textContent = "☾";
      localStorage.setItem("theme", "light");
    }
  }
  applyTheme(localStorage.getItem("theme") || "light");
  toggleBtn.addEventListener("click", ()=>{
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
  });

  // Upload preview
  const form = $("#custom-form");
  if(form){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      alert("Image selected locally. In production, connect this to your upload API.");
    });
    const file = $("#image-upload");
    const preview = $("#preview-image");
    file.addEventListener("change", ()=>{
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 10*1024*1024) {
        alert("Please choose a file under 10MB.");
        file.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev)=>{
        preview.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(f);
    });
  }

  // Mobile menu toggle
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const opened = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", opened ? "true" : "false");
    });
  }

  // Contact form simple check
  const cform = document.getElementById("contact-form");
  if (cform) {
    cform.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("contact-name").value.trim();
      const email = document.getElementById("contact-email").value.trim();
      const msg = document.getElementById("contact-message").value.trim();
      const tip = document.getElementById("contact-tip");
      if (!name || !email || !msg) {
        tip.textContent = "Please fill out all fields.";
        return;
      }
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        tip.textContent = "Please enter a valid email.";
        return;
      }
      tip.textContent = "Thanks! We have received your message (demo).";
      cform.reset();
    });
  }

  // Init
  loadConfig().then(cfg => {
    const hero = document.querySelector(".hero-media video");
    if (hero && cfg.hero) hero.setAttribute("poster", `images/${cfg.hero}`);

    $$(".card.product").forEach(card => {
      const id = card.dataset.product;
      const images = (cfg.products && cfg.products[id]) || [];
      const price = (cfg.prices && cfg.prices[id]) || 0;
      buildProductCard(card, images, price);
    });
  }).catch(err => { console.error(err); });
})();