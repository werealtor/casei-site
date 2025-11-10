// Product list: ready to use, email-based ordering
const PRODUCTS = [
  {
    id: "casei-clear-17",
    name: "Case&i ClearGuard — iPhone 17",
    model: "iPhone 17",
    color: "Clear",
    desc: "Slim clear case with raised edges and precise fit for iPhone 17.",
    price: 25,
    img: "/assets/images/case-iphone17-clear.jpg",
    label: "From $25",
    mailSubject: "Case&i Order - iPhone 17 ClearGuard",
    mailBody:
      "Hi Case&i Team,%0D%0A%0D%0AI'd like to order 1x Case&i ClearGuard for iPhone 17 ($25).%0D%0AName:%0D%0AShipping address:%0D%0APhone:%0D%0APreferred payment method:%0D%0A%0D%0AThank you."
  },
  {
    id: "casei-clear-17pro",
    name: "Case&i ClearGuard — iPhone 17 Pro",
    model: "iPhone 17 Pro",
    color: "Clear",
    desc: "Clear, refined protection tuned for iPhone 17 Pro.",
    price: 28,
    img: "/assets/images/case-iphone17pro-clear.jpg",
    label: "$28",
    mailSubject: "Case&i Order - iPhone 17 Pro ClearGuard",
    mailBody:
      "Hi Case&i Team,%0D%0A%0D%0AI'd like to order 1x Case&i ClearGuard for iPhone 17 Pro ($28).%0D%0AName:%0D%0AShipping address:%0D%0APhone:%0D%0APreferred payment method:%0D%0A%0D%0AThank you."
  },
  {
    id: "casei-clear-17promax",
    name: "Case&i ClearGuard — iPhone 17 Pro Max",
    model: "iPhone 17 Pro Max",
    color: "Clear",
    desc: "Crystal-clear protection with corner cushioning for iPhone 17 Pro Max.",
    price: 30,
    img: "/assets/images/case-iphone17promax-clear.jpg",
    label: "$30",
    mailSubject: "Case&i Order - iPhone 17 Pro Max ClearGuard",
    mailBody:
      "Hi Case&i Team,%0D%0A%0D%0AI'd like to order 1x Case&i ClearGuard for iPhone 17 Pro Max ($30).%0D%0AName:%0D%0AShipping address:%0D%0APhone:%0D%0APreferred payment method:%0D%0A%0D%0AThank you."
  }
];

// Create email order link
function createMailtoLink(p) {
  return `mailto:support@xxkit.com?subject=${encodeURIComponent(
    p.mailSubject
  )}&body=${p.mailBody}`;
}

// Create product card element
function createProductCard(p, { compact = false } = {}) {
  const card = document.createElement("div");
  card.className = "card";

  const labelHtml = p.label
    ? `<div class="tag-label">${p.label}</div>`
    : "";

  card.innerHTML = `
    ${labelHtml}
    <img src="${p.img}" alt="${p.name}">
    <h3>${p.name}</h3>
    <p>${p.desc}</p>
    <div class="price">$${p.price}</div>
    <a href="${createMailtoLink(p)}" class="btn pill outline">
      Order via Email
    </a>
  `;

  if (compact) {
    const desc = card.querySelector("p");
    if (desc) desc.style.display = "none";
  }

  return card;
}

// Render featured products on index page
function renderFeatured() {
  const wrap = document.getElementById("featured-list");
  if (!wrap) return;
  PRODUCTS.forEach(p => {
    wrap.appendChild(createProductCard(p, { compact: true }));
  });
}

// Render all products on shop page with filters
function renderShop() {
  const listEl = document.getElementById("product-list");
  if (!listEl) return;

  const filterModel = document.getElementById("filter-model");
  const filterColor = document.getElementById("filter-color");

  function applyFilters() {
    const m = (filterModel && filterModel.value) || "";
    const c = (filterColor && filterColor.value) || "";
    listEl.innerHTML = "";

    const filtered = PRODUCTS.filter(p =>
      (!m || p.model === m) &&
      (!c || p.color === c)
    );

    if (!filtered.length) {
      listEl.innerHTML = `<p class="text-md">No products match this selection.</p>`;
      return;
    }

    filtered.forEach(p => listEl.appendChild(createProductCard(p)));
  }

  if (filterModel) filterModel.addEventListener("change", applyFilters);
  if (filterColor) filterColor.addEventListener("change", applyFilters);

  applyFilters();
}

// Mobile nav toggle
function setupNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!toggle || !navLinks) return;

  toggle.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });

  navLinks.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("show");
    });
  });
}

// Footer year
function setYear() {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setYear();
  setupNavToggle();
  renderFeatured();
  renderShop();
});
