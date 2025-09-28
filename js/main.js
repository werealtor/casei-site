async function init() {
  try {
    const res = await fetch("config.json", { cache: "no-store" });
    if (!res.ok) throw new Error('Config load failed');
    const data = await res.json();
    setupProducts(data.products);
  } catch (err) {
    console.error("加载 config.json 失败:", err);
  }

  // Hero video autoplay reliability (especially iOS)
  const v = document.getElementById('heroVideo');
  if (v) {
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    document.addEventListener('visibilitychange', tryPlay, { once: true });

    // respect system preference for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.removeAttribute('autoplay');
      v.pause();
    }
  }
}

function setupProducts(products) {
  products.forEach(product => {
    const card = document.querySelector(`.card[data-product="${product.id}"]`);
    if (!card) return;

    const track = card.querySelector(".main-track");
    const progress = card.querySelector(".progress .bar");
    const priceEl = card.querySelector(".price");

    // Inject slides
    track.innerHTML = "";
    product.images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${product.name} ${i+1}`;
      img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // Arrows
    const viewport = card.querySelector(".main-viewport");
    const leftBtn = document.createElement("button");
    leftBtn.className = "nav-arrow left";
    leftBtn.innerHTML = "‹";
    leftBtn.setAttribute('aria-label', 'Previous slide');
    const rightBtn = document.createElement("button");
    rightBtn.className = "nav-arrow right";
    rightBtn.innerHTML = "›";
    rightBtn.setAttribute('aria-label', 'Next slide');
    viewport.appendChild(leftBtn);
    viewport.appendChild(rightBtn);

    // State
    let index = 0;
    const slides = track.children;
    let interval;

    function update(newIndex) {
      index = Math.max(0, Math.min(newIndex, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;

      // Progress
      if (progress) progress.style.width = ((index + 1) / slides.length) * 100 + "%";

      // Price
      if (Array.isArray(product.price)) {
        priceEl.textContent = `$${product.price[index]}`;
      } else {
        priceEl.textContent = `$${product.price}`;
      }

      leftBtn.disabled = index === 0;
      rightBtn.disabled = index === slides.length - 1;
    }

    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

    // Autoplay
    function startAutoPlay() { interval = setInterval(() => update(index + 1), 3000); }
    function stopAutoPlay() { clearInterval(interval); }
    startAutoPlay();

    // Pause on hover / resume
    viewport.addEventListener('mouseenter', stopAutoPlay);
    viewport.addEventListener('mouseleave', startAutoPlay);

    // Touch swipe
    let startX = 0, isDragging = false;
    viewport.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; stopAutoPlay(); });
    viewport.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 50) update(index - 1);
      else if (delta < -50) update(index + 1);
      startAutoPlay();
    });

    update(0);
  });
}

// Upload preview
document.addEventListener("DOMContentLoaded", () => {
  init();

  const upload = document.getElementById("image-upload");
  const preview = document.getElementById("preview-image");

  if (upload && preview) {
    upload.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type)) { alert('Only PNG/JPEG allowed.'); return; }
      if (file.size > 10 * 1024 * 1024) { alert('Max 10MB.'); return; }
      const reader = new FileReader();
      reader.onload = ev => { preview.src = ev.target.result; preview.style.display = "block"; };
      reader.readAsDataURL(file);
    });
  }

  // Dark mode toggle
  const toggleBtn = document.getElementById('dark-mode-toggle');
  const body = document.body;
  const setIcon = () => { toggleBtn.innerHTML = body.classList.contains('dark') ? '🌞' : '🌙'; };
  if (localStorage.getItem('darkMode') === 'enabled') body.classList.add('dark');
  setIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('dark');
      if (body.classList.contains('dark')) localStorage.setItem('darkMode', 'enabled');
      else localStorage.setItem('darkMode', 'disabled');
      setIcon();
    });
  }

  // Mobile menu
  const menuIcon = document.querySelector('.menu-icon');
  const topNav = document.querySelector('.top-nav');
  if (menuIcon && topNav) {
    menuIcon.addEventListener('click', () => topNav.classList.toggle('active'));
  }
});