document.addEventListener("DOMContentLoaded", () => {
  // 遍历每个产品卡片
  document.querySelectorAll(".card.product.u3").forEach(card => {
    const track = card.querySelector(".main-track");
    const slides = Array.from(card.querySelectorAll(".slide"));
    const progress = card.querySelector(".progress i");
    const priceEl = card.querySelector(".price");
    let currentIndex = 0;

    // 创建左右箭头
    const left = document.createElement("button");
    left.className = "nav-arrow left";
    left.textContent = "‹";

    const right = document.createElement("button");
    right.className = "nav-arrow right";
    right.textContent = "›";

    card.querySelector(".main-viewport").append(left, right);

    // 更新显示
    function update() {
      // 位移滑块
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      // 更新进度条
      const percent = ((currentIndex + 1) / slides.length) * 100;
      progress.style.width = percent + "%";

      // 更新价格
      const activeSlide = slides[currentIndex];
      const newPrice = activeSlide.dataset.price;
      if (newPrice && priceEl) {
        priceEl.textContent = `$${newPrice}`;
      }
    }

    // 点击箭头事件
    left.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      update();
    });
    right.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % slides.length;
      update();
    });

    // 初始化
    update();
  });
});