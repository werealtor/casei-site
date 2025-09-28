// 简易工具
const $  = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

// 主题 & 菜单
(() => {
  const toggle = $('#theme-toggle');
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.body.classList.add('dark');
  toggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  const header = $('#site-header');
  $('.menu-toggle')?.addEventListener('click', () => {
    header.classList.toggle('open');
    const btn = $('.menu-toggle');
    const expanded = header.classList.contains('open');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  });
})();

// 动态构建轮播：从 config.json 注入 7 张图 + 箭头 + 进度条 + 价格联动
(async () => {
  let conf;
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    conf = await res.json();
  } catch (e) {
    console.error('Load config.json failed', e);
    return;
  }

  const currency = (conf?.settings?.currency || 'USD') === 'USD' ? '$' : (conf?.settings?.currency || '$');

  $$('.card.product').forEach(card => {
    const pid   = card.dataset.product;                 // classic / fashion / business
    const vp    = $('.main-viewport', card);
    const track = $('.main-track', vp);
    const prog  = $('.progress i', vp);
    const priceEl = $('.price', card);

    const pconf = conf.products.find(p => p.id === pid);
    if (!pconf) return;

    // 1) 清空轨道并注入 slides
    track.innerHTML = '';
    (pconf.images || []).forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.dataset.index = i + 1;
      const img = document.createElement('img');
      img.className = 'cover';
      img.alt = `${pconf.name} — ${i+1}`;
      img.src = src;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // 2) 确保箭头存在（由 JS 生成，避免被误删）
    let left = $('.nav-arrow.left', vp);
    let right = $('.nav-arrow.right', vp);
    if (!left) {
      left = document.createElement('button');
      left.className = 'nav-arrow left';
      left.setAttribute('aria-label', 'Previous');
      left.textContent = '‹';
      vp.appendChild(left);
    }
    if (!right) {
      right = document.createElement('button');
      right.className = 'nav-arrow right';
      right.setAttribute('aria-label', 'Next');
      right.textContent = '›';
      vp.appendChild(right);
    }

    // 3) 计算当前 index（基于滚动位置）
    const slides = $$('.slide', track);
    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);

    // 4) 前往某页
    const goTo = (i) => {
      const max = Math.max(0, slides.length - 1);
      const idx = Math.min(Math.max(i, 0), max);
      vp.scrollTo({ left: idx * vp.clientWidth, behavior: 'smooth' });
      update(idx);
    };

    // 5) 更新：进度条 + 箭头状态 + 价格联动
    function update(idx = getIndex()) {
      // 进度条
      const pct = slides.length > 1 ? ((idx + 1) / slides.length) * 100 : 100;
      if (prog) prog.style.width = `${pct}%`;

      // 箭头状态
      left.classList.toggle('is-disabled', idx <= 0);
      right.classList.toggle('is-disabled', idx >= slides.length - 1);

      // 价格联动（数组越界自动兜底用最后一个）
      const arr = Array.isArray(pconf.price) ? pconf.price : [];
      let val = arr[Math.min(idx, arr.length - 1)];
      if (typeof val !== 'number') val = arr[arr.length - 1];
      if (priceEl && typeof val === 'number') priceEl.textContent = `${currency}${val}`;
    }

    // 6) 事件绑定
    left.onclick  = () => goTo(getIndex() - 1);
    right.onclick = () => goTo(getIndex() + 1);

    // 7) 同步滚动 / 尺寸变化
    let t1, t2;
    vp.addEventListener('scroll', () => { clearTimeout(t1); t1 = setTimeout(() => update(getIndex()), 90); }, { passive:true });
    window.addEventListener('resize', () => { clearTimeout(t2); t2 = setTimeout(() => goTo(getIndex()), 120); });

    // 8) 初始化
    update(0);
  });

  // 保险：把箭头和进度条层级压到图层之上（防止某些自定义样式覆盖）
  (function ensureZTop(){
    const s = document.createElement('style');
    s.id = 'u3-zfix';
    s.textContent = `
      .card.product .nav-arrow{z-index:99990!important;pointer-events:auto!important;opacity:1!important}
      .card.product .progress{z-index:99990!important}
      .card.product .slide .cover{z-index:0!important;pointer-events:none!important}
    `;
    document.getElementById('u3-zfix')?.remove();
    document.head.appendChild(s);
  })();
})();

// 简易上传预览（保持原功能）
(() => {
  const form = document.getElementById('uForm');
  const fileInput = document.getElementById('file');
  const fileName = document.getElementById('fileName');
  const preview = document.getElementById('preview');
  const uErr = document.getElementById('uErr');

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    fileName.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(2)}MB`;
    if (!/^image\/(png|jpeg)$/i.test(f.type)) {
      uErr.textContent = 'Only PNG/JPEG supported.';
      preview.style.display = 'none';
      return;
    }
    uErr.textContent = '';
    const url = URL.createObjectURL(f);
    preview.src = url;
    preview.style.display = 'block';
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files?.[0];
    if (!f) { uErr.textContent = 'Please choose an image first.'; return; }
    alert('Preview ready (demo).');
  });
})();