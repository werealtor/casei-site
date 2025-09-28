async function init() {
  try {
    const res = await fetch("config.json");
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
    const rightBtn = document.createElement("button");
    rightBtn.className = "nav-arrow right";
    rightBtn.innerHTML = "›";
    viewport.appendChild(leftBtn);
    viewport.appendChild(rightBtn);

    // 状态
    let index = 0;
    const slides = track.children;

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
    }

    // 箭头事件
    leftBtn.addEventListener("click", () => update(index - 1));
    rightBtn.addEventListener("click", () => update(index + 1));

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