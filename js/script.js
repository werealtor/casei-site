// 上传预览 + 错误提示
(function(){
  const form=document.getElementById('uForm'),
        file=document.getElementById('file'),
        preview=document.getElementById('preview'),
        err=document.getElementById('uErr');
  if(!form||!file||!preview) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    err && (err.textContent = '');
    const f=file.files && file.files[0]; 
    if(!f){ err&&(err.textContent='Please choose an image.'); return; }
    if(!/image\/(png|jpe?g)/.test(f.type) || f.size>5*1024*1024){
      err && (err.textContent='Upload PNG/JPG under 5MB.');
      return;
    }
    const r=new FileReader();
    r.onload=ev=>{ preview.src=ev.target.result; preview.style.display='block'; };
    r.readAsDataURL(f);
  });
})();

// 极简汉堡菜单（移动端）
// 极简汉堡菜单 + 遮罩
(function(){
  const header = document.getElementById('site-header');
  const btn = header && header.querySelector('.menu-toggle');
  const nav = header && header.querySelector('#primary-nav');
  const overlay = document.querySelector('.overlay');
  if(!btn || !nav || !overlay) return;

  function closeMenu(){
    header.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-label','Open menu');
    overlay.style.display = 'none';
  }

  btn.addEventListener('click', ()=>{
    const open = header.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay.style.display = open ? 'block' : 'none';
  });

  overlay.addEventListener('click', closeMenu);

  nav.addEventListener('click', (e)=>{
    if(e.target.tagName === 'A'){ closeMenu(); }
  });
})();

// 可选：动态美元价（根目录存在 prices.json 时覆盖）
(function(){
  const nodes = document.querySelectorAll('.price[data-id]');
  if(!nodes.length) return;
  fetch('prices.json',{cache:'no-store'})
    .then(r => r.ok ? r.json() : null)
    .then(prices=>{
      if(!prices) return;
      const fmt = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0});
      nodes.forEach(el=>{
        const id = el.getAttribute('data-id');
        if(id && prices[id]!=null){ el.textContent = fmt.format(prices[id]); }
      });
    })
    .catch(()=>{});
})();

// 注册 Service Worker（优先 /sw.js，找不到再尝试 /js/sw.js）
(function(){
  if(!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(()=>{
    return navigator.serviceWorker.register('/js/sw.js').catch(()=>{});
  });
})();