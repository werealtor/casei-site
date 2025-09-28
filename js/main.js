document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("config.json");
  const data = await res.json();
  const products = data.products;

  document.querySelectorAll(".card.product").forEach((card) => {
    const id = card.dataset.product;
    const product = products.find(p => p.id === id);
    if (!product) return;

    const track = card.querySelector(".main-track");
    const vp = card.querySelector(".main-viewport");
    const progress = card.querySelector(".progress");
    const priceEl = card.querySelector(".price");

    // 注入 slides
    product.images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      slide.innerHTML = `<img src="${src}" alt="${product.name} ${i+1}">`;
      track.appendChild(slide);
    });

    // 注入左右箭头
    const left = document.createElement("button");
    left.className = "nav-arrow left";
    left.innerHTML = "‹";
    const right = document.createElement("button");
    right.className = "nav-arrow right";
    right.innerHTML = "›";
    vp.appendChild(left);
    vp.appendChild(right);

    // 注入进度条
    const bar = document.createElement("div");
    bar.className = "bar";
    progress.appendChild(bar);

    const slides = track.querySelectorAll(".slide");

    function getIndex() {
      return Math.round(vp.scrollLeft / vp.clientWidth);
    }

    function update(i) {
      if (bar) bar.style.width = ((i+1) / slides.length) * 100 + "%";
      if (product.price && Array.isArray(product.price)) {
        const priceVal = product.price[Math.min(i, product.price.length-1)];
        priceEl.textContent = `$${priceVal}`;
      }
    }

    function goto(i) {
      i = Math.max(0, Math.min(i, slides.length-1));
      vp.scrollTo({ left: i * vp.clientWidth, behavior: "smooth" });
      update(i);
    }

    left.onclick = () => goto(getIndex() - 1);
    right.onclick = () => goto(getIndex() + 1);

    vp.addEventListener("scroll", () => {
      clearTimeout(vp._t);
      vp._t = setTimeout(() => update(getIndex()), 100);
    });

    update(0); // 初始化
  });
});
function update(i) {
  if (bar) bar.style.width = ((i + 1) / slides.length) * 100 + "%";

  if (product.price && Array.isArray(product.price)) {
    const priceVal = product.price[Math.min(i, product.price.length - 1)];
    priceEl.textContent = `$${priceVal}`;
  }
}