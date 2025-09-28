async function init() {
  try {
    const res = await fetch("config.json");
    if (!res.ok) {
      throw new Error('Config load failed');
    }
    const data = await res.json();
    setupProducts(data.products);
  } catch (err) {
    console.error("加载 config.json 失败:", err);
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
      img.alt = `${product.name} ${i+1}`;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 添加箭头
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
      index = Math.max(0, Math.min(newIndex, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;

      // 更新进度条
      if (progress) {
        progress.style.width = ((index + 1) / slides.length) * 100 + "%";
      }

      // 更新价格
      if (Array.isArray(product.price)) {
        priceEl.textContent = `$${product.price[index]}`;
      } else {
        priceEl.textContent = `$${product.price}`;
      }

      // 调整箭头可用性
      leftBtn.disabled = index === 0;
      rightBtn.disabled = index === slides.length - 1;
    }

    // 箭头事件
    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

    // 自动轮播
    function startAutoPlay() {
      interval = setInterval(() => update(index + 1), 3000);
    }
    startAutoPlay();

    // 鼠标悬停暂停
    viewport.addEventListener('mouseenter', () => clearInterval(interval));
    viewport.addEventListener('mouseleave', startAutoPlay);

    // 触摸支持
    let startX = 0;
    let isDragging = false;
    viewport.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isDragging = true;
      clearInterval(interval);
    });
    viewport.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const delta = e.touches[0].clientX - startX;
      if (Math.abs(delta) > 50) {
        // 可以添加预览位移，但为简单起见，仅在end处理
      }
    });
    viewport.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 50) {
        update(index - 1);
      } else if (delta < -50) {
        update(index + 1);
      }
      startAutoPlay();
    });

    // 初始化
    update(0);
  });
}

// 文件上传预览
document.addEventListener("DOMContentLoaded", () => {
  init();

  const upload = document.getElementById("image-upload");
  const preview = document.getElementById("preview-image");

  if (upload && preview) {
    upload.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        // 客户端验证文件类型
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
          alert('Invalid file type. Only PNG and JPEG are allowed.');
          return;
        }
        // 客户端验证文件大小 (<10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File too large. Maximum size is 10MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
          preview.src = ev.target.result;
          preview.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 暗模式切换
  const toggleBtn = document.getElementById('dark-mode-toggle');
  const body = document.body;

  // 检查 localStorage 中的偏好
  if (localStorage.getItem('darkMode') === 'enabled') {
    body.classList.add('dark');
  }

  // 按钮事件监听
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('dark');
      if (body.classList.contains('dark')) {
        localStorage.setItem('darkMode', 'enabled');
      } else {
        localStorage.setItem('darkMode', 'disabled');
      }
    });
  }
});