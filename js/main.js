/* Case&i — U3 slider + 价格联动 + 进度条 + 箭头  */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // 从 config.json 读取图片与价格（优先使用 config.json；如果已有 slide 就不重建）
  async function loadConfig() {
    try {
      const res = await fetch("config.json", { cache: "no-store" });
      if (!res.ok) throw 0;
      return await res.json();
    } catch {
      return null;
    }
  }

  function ensureProgress(vp) {
    // 确保 .progress > .bar 存在
    let prog = $(".progress", vp);
    if (!prog) {
      prog = document.createElement("div");
      prog.className = "progress";
      vp.appendChild(prog);
    }
    prog.innerHTML = ""; // 避免重复
    const bar = document.createElement("div");
    bar.className = "bar";
    prog.appendChild(bar);
    return bar;
  }

  function ensureArrows(vp) {
    // 左右箭头（如已存在则复用）
    let left = $(".nav-arrow.left", vp);
    let right = $(".nav-arrow.right", vp);

    if (!left) {
      left = document.createElement("button");
      left.className = "nav-arrow left";
      left.setAttribute("aria-label", "Previous");
      left.textContent = "‹";
      vp.appendChild(left);
    }
    if (!right) {
      right = document.createElement("button");
      right.className = "nav-arrow right";
      right.setAttribute("aria-label", "Next");
      right.textContent = "›";
      vp.appendChild(right);
    }
    return { left, right };
  }

  function zIndexFix(card) {
    // 保证箭头、进度条盖在图片之上
    $$(".slide .cover", card).forEach(img => {
      img.style.pointerEvents = "none";
      img.style.zIndex = "0";
    });
    $$(".progress", card).forEach(p => {
      p.style.zIndex = "9998";
      p.style.pointerEvents = "none";
    });
    $$(".nav-arrow", card).forEach(a => {
      a.style.zIndex = "9999";
      a.style.opacity = "1";
      a.style.pointerEvents = "auto";
    });
    const vp = $(".main-viewport", card);
    vp && (vp.style.position = "relative"); // 以免绝对定位的箭头脱离容器
  }

  function buildSlidesIfEmpty(card, productCfg) {
    // 如果 main-track 为空，则根据 config.json 注入 1~7 张图
    const track = $(".main-track", card);
    if (!track) return [];
    if (track.children.length > 0) {
      return $$(".slide", track);
    }
    if (!productCfg || !Array.isArray(productCfg.images)) return [];

    productCfg.images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "slide";
      const img = document.createElement("img");
      img.className = "cover";
      img.src = src;
      img.alt = `${productCfg.name || card.dataset.product} — ${i + 1}`;
      img.draggable = false;
      slide.appendChild(img);
      track.appendChild(slide);
    });
    return $$(".slide", track);
  }

  function initCard(card, cfgProduct) {
    const vp = $(".main-viewport", card);
    const track = $(".main-track", card);
    const priceEl = $(".price", card);
    if (!vp || !track) return;

    // 1) 如果没图，从 config 注图
    const slides = buildSlidesIfEmpty(card, cfgProduct);

    // 2) 进度条 + 箭头
    const bar = ensureProgress(vp);
    const { left, right } = ensureArrows(vp);

    // 3) z-index 修复，避免被图片盖住
    zIndexFix(card);

    // 4) 定义工具函数
    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const goto = (i) => {
      const idx = clamp(i, 0, slides.length - 1);
      vp.scrollTo({ left: vp.clientWidth * idx, behavior: "smooth" });
      update(idx);
    };

    function update(idx = getIndex()) {
      // 进度条
      if (bar) bar.style.width = ((idx + 1) / (slides.length || 1)) * 100 + "%";

      // 箭头开关
      left.classList.toggle("is-disabled", idx === 0);
      right.classList.toggle("is-disabled", idx === slides.length - 1);

      // 价格联动（优先用 config.json 中该产品的 price 数组）
      if (cfgProduct && Array.isArray(cfgProduct.price) && priceEl) {
        const arr = cfgProduct.price;
        const v = arr[Math.min(idx, arr.length - 1)];
        if (typeof v === "number") priceEl.textContent = `$${v}`;
      }
    }

    // 5) 事件
    left.onclick = () => goto(getIndex() - 1);
    right.onclick = () => goto(getIndex() + 1);

    // 拖拽滚动结束后同步 UI（用节流）
    let t1 = 0, t2 = 0;
    vp.addEventListener(
      "scroll",
      () => {
        clearTimeout(t1);
        t1 = setTimeout(() => update(getIndex()), 80);
      },
      { passive: true }
    );
    window.addEventListener("resize", () => {
      clearTimeout(t2);
      t2 = setTimeout(() => goto(getIndex()), 120);
    });

    // 6) 初始
    update(0);
  }

  async function bootstrap() {
    // 载入配置（若失败也不影响已有 DOM 的运行）
    const cfg = await loadConfig();
    const cfgMap =
      cfg && cfg.products
        ? Object.fromEntries(cfg.products.map(p => [p.id, p]))
        : {};

    // 初始化所有产品卡片
    $$(".card.product.u3").forEach(card => {
      const id = card.dataset.product;
      initCard(card, cfgMap[id]);
    });

    // ====== 其它页面功能（例如主题/表单），保持你现有的逻辑即可 ======
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();