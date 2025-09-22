(function(){
  // dynamic USD prices
  const fmt = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0});
  function applyPrices(prices){
    document.querySelectorAll('.price[data-id]').forEach(el=>{
      const id = el.getAttribute('data-id');
      if(prices && prices[id]!=null){
        el.textContent = fmt.format(prices[id]);
      }else if(el.textContent.trim()==='—'){
        el.textContent = '$—';
      }
    });
  }
  fetch('prices.json',{cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(data=>applyPrices(data))
    .catch(()=>applyPrices(null));

  // upload preview
  const form=document.getElementById('uForm'),
        file=document.getElementById('file'),
        preview=document.getElementById('preview');
  if(form&&file&&preview){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const f=file.files && file.files[0];
      if(!f){ alert('Please choose an image.'); return; }
      if(!/image\/(png|jpe?g)/.test(f.type)||f.size>5*1024*1024){
        alert('Upload PNG/JPG under 5MB.'); return;
      }
      const r=new FileReader();
      r.onload=ev=>{ preview.src=ev.target.result; preview.style.display='block'; };
      r.readAsDataURL(f);
    });
  }

  // hamburger menu
  const header=document.getElementById('site-header');
  if(header){
    const btn=header.querySelector('.menu-toggle');
    btn.addEventListener('click',()=>{
      const open=header.classList.toggle('open');
      btn.setAttribute('aria-expanded',open?'true':'false');
      btn.setAttribute('aria-label',open?'Close menu':'Open menu');
    });
    header.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{
      header.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
      btn.setAttribute('aria-label','Open menu');
    }));
  }

  // register service worker
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js');
  }
})();
