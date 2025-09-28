async function init() {
  try {
    // 加上版本号避免 CDN/浏览器缓存
    const res = await fetch("config.json?v=2", { cache: "no-store" });
    if (!res.ok) throw new Error('Config load failed');
    const data = await res.json();
    setupProducts(data.products);
  } catch (err) {
    console.error("加载 config.json 失败:", err);
  }

  // Hero video：确保 iOS/移动端可靠自动播放
  const v = document.getElementById('heroVideo');
  if (v) {
    v.muted = true; // iOS 自动播放要求静音
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    document.addEventListener('visibilitychange', tryPlay, { once: true });

    // 尊重“减少动态效果”系统偏好
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

    // 注入 slides
    track.innerHTML = "";
    product.images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${product.name} ${i + 1}`;
      img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 添加左右箭头
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

    // 状态
    let index = 0;
    const slides = track.children;
    let interval;

    function update(newIndex) {
      if (!slides.length) return;
      index = Math.max(0, Math.min(newIndex, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;

      // 进度条
      if (progress) progress.style.width = ((index + 1) / slides.length) * 100 + "%";

      // 价格（支持数组/单价）
      if (priceEl) {
        if (Array.isArray(product.price)) {
          priceEl.textContent = `$${product.price[index]}`;
        } else if (product.price != null) {
          priceEl.textContent = `$${product.price}`;
        } else {
          priceEl.textContent = "$--";
        }
      }

      // 箭头可用性
      leftBtn.disabled = index === 0;
      rightBtn.disabled = index === slides.length - 1;
    }

    // 点击事件
    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

    // 自动轮播
    function startAutoPlay() { interval = setInterval(() => update(index + 1), 3000); }
    function stopAutoPlay() { clearInterval(interval); }
    startAutoPlay();

    // 悬停暂停（桌面）
    viewport.addEventListener('mouseenter', stopAutoPlay);
    viewport.addEventListener('mouseleave', startAutoPlay);

    // 触摸滑动（移动）
    let startX = 0, isDragging = false;
    viewport.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isDragging = true;
      stopAutoPlay();
    }, { passive: true });

    viewport.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 50) update(index - 1);
      else if (delta < -50) update(index + 1);
      startAutoPlay();
    });

    // 初始化
    update(0);
  });
}

// 入口
document.addEventListener("DOMContentLoaded", () => {
  init();

  // 上传预览
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

  // 暗黑模式切换
  const toggleBtn = document.getElementById('dark-mode-toggle');
  const body = document.body;
  const setIcon = () => { if (toggleBtn) toggleBtn.innerHTML = body.classList.contains('dark') ? '🌞' : '🌙'; };
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

  // 移动端菜单
  const menuIcon = document.querySelector('.menu-icon');
  const topNav = document.querySelector('.top-nav');
  if (menuIcon && topNav) {
    menuIcon.addEventListener('click', () => topNav.classList.toggle('active'));
  }
});