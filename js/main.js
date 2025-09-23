/* theme toggle */
const themeBtn=document.getElementById('theme-toggle');
if(themeBtn){
  let theme=localStorage.getItem('theme')|| (window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.body.classList.toggle('dark',theme==='dark');
  themeBtn.textContent=theme==='dark'?'☀️':'🌙';
  themeBtn.addEventListener('click',()=>{
    const isDark=document.body.classList.toggle('dark');
    themeBtn.textContent=isDark?'☀️':'🌙';
    localStorage.setItem('theme',isDark?'dark':'light');
  });
}

/* menu toggle */
const menuToggle=document.querySelector('.menu-toggle');const headerEl=document.querySelector('header');
if(menuToggle){menuToggle.addEventListener('click',()=>{headerEl.classList.toggle('open')});}

/* upload preview */
const uForm=document.getElementById('uForm');
if(uForm){
  uForm.addEventListener('submit',e=>{
    e.preventDefault();
    const f=document.getElementById('file').files[0];
    const err=document.getElementById('uErr');const preview=document.getElementById('preview');
    if(!f){err.textContent='Please choose an image.';return;}
    if(!f.type.startsWith('image/')){err.textContent='Invalid file.';return;}
    const r=new FileReader();
    r.onload=ev=>{preview.src=ev.target.result;preview.style.display='block';err.textContent='';};
    r.readAsDataURL(f);
  });
}

/* slider with arrows + progress */
document.querySelectorAll('.card.product.u3').forEach(card=>{
  const vp=card.querySelector('.main-viewport');const track=card.querySelector('.main-track');
  if(!vp||!track)return;
  const slides=track.querySelectorAll('.slide');
  const left=document.createElement('button');left.className='nav-arrow left';left.textContent='‹';
  const right=document.createElement('button');right.className='nav-arrow right';right.textContent='›';
  const bar=document.createElement('div');bar.className='progress';bar.innerHTML='<i></i>';
  vp.append(left,right,bar);const fill=bar.querySelector('i');
  const getIndex=()=>Math.round(vp.scrollLeft/vp.clientWidth);
  const go=i=>{i=Math.max(0,Math.min(slides.length-1,i));vp.scrollTo({left:i*vp.clientWidth,behavior:'smooth'});fill.style.width=((i+1)/slides.length*100)+'%';};
  left.onclick=()=>go(getIndex()-1);right.onclick=()=>go(getIndex()+1);
  vp.addEventListener('scroll',()=>{fill.style.width=((getIndex()+1)/slides.length*100)+'%'},{passive:true});
  fill.style.width=(1/slides.length*100)+'%';
});