async function init() {
  try {
    const res = await fetch("config.json?v=2", { cache: "no-store" });
    if (!res.ok) throw new Error('Config load failed');
    const data = await res.json();
    setupProducts(data.products);
  } catch (err) {
    console.error("加载 config.json 失败:", err);
  }

  // Hero video：确保自动播放
  const v = document.getElementById('heroVideo');
  if (v) {
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    document.addEventListener('visibilitychange', tryPlay, { once: true });

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

    // slides
    track.innerHTML = "";
    product.images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.src = src; img.alt = `${product.name} ${i+1}`; img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // arrows
    const viewport = card.querySelector(".main-viewport");
    const leftBtn = document.createElement("button");
    leftBtn.className = "nav-arrow left"; leftBtn.innerHTML = "‹"; leftBtn.setAttribute('aria-label', 'Previous slide');
    const rightBtn = document.createElement("button");
    rightBtn.className = "nav-arrow right"; rightBtn.innerHTML = "›"; rightBtn.setAttribute('aria-label', 'Next slide');
    viewport.appendChild(leftBtn); viewport.appendChild(rightBtn);

    // state
    let index = 0; const slides = track.children; let interval;
    function update(newIndex) {
      if (!slides.length) return;
      index = Math.max(0, Math.min(newIndex, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;
      if (progress) progress.style.width = ((index + 1) / slides.length) * 100 + "%";
      if (priceEl) {
        if (Array.isArray(product.price)) priceEl.textContent = `$${product.price[index]}`;
        else if (product.price != null)   priceEl.textContent = `$${product.price}`;
        else                               priceEl.textContent = "$--";
      }
      leftBtn.disabled = index === 0;
      rightBtn.disabled = index === slides.length - 1;
    }

    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

    function startAutoPlay(){ interval = setInterval(() => update(index + 1), 3000); }
    function stopAutoPlay(){ clearInterval(interval); }
    startAutoPlay();
    viewport.addEventListener('mouseenter', stopAutoPlay);
    viewport.addEventListener('mouseleave', startAutoPlay);

    let startX = 0, isDragging = false;
    viewport.addEventListener('touchstart', e => { startX = e.touches[0].clientX; isDragging = true; stopAutoPlay(); }, { passive: true });
    viewport.addEventListener('touchend', e => {
      if (!isDragging) return; isDragging = false;
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 50) update(index - 1); else if (delta < -50) update(index + 1);
      startAutoPlay();
    });

    update(0);
  });
}

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  init();

  // 上传预览
  const upload = document.getElementById("image-upload");
  const preview = document.getElementById("preview-image");
  if (upload && preview) {
    upload.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type)) { alert('Only PNG/JPEG allowed.'); e.target.value = ""; return; }
      if (file.size > 10 * 1024 * 1024) { alert('Max 10MB.'); e.target.value = ""; return; }
      const reader = new FileReader();
      reader.onload = ev => { preview.src = ev.target.result; preview.style.display = "block"; };
      reader.readAsDataURL(file);
    });
  }

  // 暗黑模式切换
  const toggleBtn = document.getElementById('dark-mode-toggle');
  const body = document.body;
  const setIcon = () => { if (toggleBtn) toggleBtn.innerHTML = body.classList.contains('dark') ? '🌞' : '🌙'; };
  if (localStorage.getItem('darkMode') === 'enabled') body.classList.add('dark');
  setIcon();
  toggleBtn?.addEventListener('click', () => {
    body.classList.toggle('dark');
    localStorage.setItem('darkMode', body.classList.contains('dark') ? 'enabled' : 'disabled');
    setIcon();
  });

  // 移动端抽屉菜单
  const menuIcon = document.querySelector('.menu-icon');
  const navWrap  = document.querySelector('.top-nav-wrap');
  const topNav   = document.querySelector('.top-nav');

  function closeMenu() {
    navWrap?.classList.remove('active');
    document.body.classList.remove('menu-open');
    menuIcon?.setAttribute('aria-expanded', 'false');
  }

  if (menuIcon && navWrap && topNav) {
    menuIcon.addEventListener('click', () => {
      const active = navWrap.classList.toggle('active');
      document.body.classList.toggle('menu-open', active);
      menuIcon.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
    topNav.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', closeMenu));
    navWrap.addEventListener('click', e => { if (e.target === navWrap) closeMenu(); });
    window.addEventListener('resize', closeMenu);
  }

  // 平滑滚动（轻微顶部间距）
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', ev => {
      const id = a.getAttribute('href'); if (!id || id === '#') return;
      const target = document.querySelector(id); if (!target) return;
      ev.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // iOS 安全区
  const ro = new ResizeObserver(() => {
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.style.bottom = `calc(20px + env(safe-area-inset-bottom))`;
  });
  ro.observe(document.body);
});