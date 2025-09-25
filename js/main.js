/* ========= Slider 极简 ========= */
(function(){
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = prefersReduced ? 'auto' : 'smooth';

  document.querySelectorAll('.card.product.u3').forEach(card=>{
    const vp     = card.querySelector('.main-viewport');
    const track  = card.querySelector('.main-track');
    const slides = track ? track.querySelectorAll('.slide') : [];
    if (!vp || !slides.length) return;

    let left  = card.querySelector('.nav-arrow.left');
    let right = card.querySelector('.nav-arrow.right');
    if (!left || !right) {
      left  = document.createElement('button'); left.className='nav-arrow left';  left.setAttribute('aria-label','Previous'); left.textContent='‹';
      right = document.createElement('button'); right.className='nav-arrow right'; right.setAttribute('aria-label','Next');    right.textContent='›';
      vp.append(left,right);
    }

    const getIndex = () => Math.round(vp.scrollLeft / vp.clientWidth);
    const clamp    = (n,min,max)=> Math.max(min, Math.min(max,n));

    function update(i=getIndex()){
      left.classList.toggle('is-disabled', i<=0);
      right.classList.toggle('is-disabled', i>=slides.length-1);
    }
    function goTo(i){
      i = clamp(i, 0, slides.length-1);
      vp.scrollTo({ left: i*vp.clientWidth, behavior: scrollBehavior });
      update(i);
      showArrows();
    }

    left.addEventListener('click', ()=> goTo(getIndex()-1));
    right.addEventListener('click', ()=> goTo(getIndex()+1));

    vp.addEventListener('keydown', e=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(getIndex()-1); }
      if(e.key==='ArrowRight'){ e.preventDefault(); goTo(getIndex()+1); }
    });

    // auto hide/show arrows
    let hideTimer;
    function showArrows(){
      [left,right].forEach(a=>a.classList.add('is-visible'));
      clearTimeout(hideTimer);
      hideTimer = setTimeout(()=>[left,right].forEach(a=>a.classList.remove('is-visible')),1200);
    }
    ['mousemove','keydown','click','scroll','touchstart'].forEach(evt=> vp.addEventListener(evt, showArrows, {passive:true}));

    update(0);
  });
})();