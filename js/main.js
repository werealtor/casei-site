async function init() {
  try {
    const res = await fetch("config.json");
    const data = await res.json();
    setupProducts(data.products);
  } catch (err) {
    console.error("Config load failed:", err);
  }
}

function setupProducts(products) {
  const LS_KEY = 'casei-editing-v1';
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');

  products.forEach(raw => {
    const count = raw.images.length;
    const ov = saved[raw.id] || {};
    const product = {
      ...raw,
      titles: ov.titles || Array.from({length:count},(_,i)=>`${raw.name} — ${i+1}`),
      subtitles: ov.subtitles || Array(count).fill(''),
      price: ov.price || raw.price
    };

    const card = document.querySelector(`.card[data-product="${product.id}"]`);
    if (!card) return;
    const track = card.querySelector(".main-track");
    const progress = card.querySelector(".progress .bar");
    const priceEl = card.querySelector(".price");
    const titleEl = card.querySelector("h3");
    const subEl = card.querySelector(".sub");
    const viewport = card.querySelector(".main-viewport");

    // slides
    track.innerHTML = "";
    product.images.forEach((src,i)=>{
      const slide=document.createElement("div");
      slide.className="slide";
      const img=document.createElement("img");
      img.src=src; img.alt=`${product.name} ${i+1}`;
      slide.appendChild(img);
      track.appendChild(slide);
    });

    // edit button
    const editBtn=document.createElement("button");
    editBtn.className="edit-btn"; editBtn.textContent="Edit";
    viewport.appendChild(editBtn);

    // arrows
    const leftBtn=document.createElement("button");
    leftBtn.className="nav-arrow left"; leftBtn.innerHTML="‹";
    const rightBtn=document.createElement("button");
    rightBtn.className="nav-arrow right"; rightBtn.innerHTML="›";
    viewport.appendChild(leftBtn); viewport.appendChild(rightBtn);

    let index=0, interval, editing=false;
    const slides=track.children;

    function render(i){
      titleEl.textContent=product.titles[i]||product.name;
      subEl.textContent=product.subtitles[i]||'';
      priceEl.textContent=`$${Array.isArray(product.price)?product.price[i]:product.price}`;
    }
    function persist(){
      saved[product.id]={titles:product.titles,subtitles:product.subtitles,price:product.price};
      localStorage.setItem(LS_KEY,JSON.stringify(saved));
    }
    function update(i){
      index=Math.max(0,Math.min(i,slides.length-1));
      track.style.transform=`translateX(-${index*100}%)`;
      progress.style.width=((index+1)/slides.length*100)+"%";
      render(index);
      leftBtn.disabled=index===0;
      rightBtn.disabled=index===slides.length-1;
    }

    function setEditing(on){
      editing=on; editBtn.classList.toggle("active",on);
      editBtn.textContent=on?"Done":"Edit";
      titleEl.setAttribute("contenteditable",on);
      subEl.setAttribute("contenteditable",on);
      if(on) clearInterval(interval); else startAutoPlay();
    }
    editBtn.addEventListener("click",()=>setEditing(!editing));

    function bindEditable(el,arr,fallback){
      el.addEventListener("input",()=>{arr[index]=el.textContent.trim()||fallback||''; persist();});
      el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();el.blur();}});
    }
    bindEditable(titleEl,product.titles,product.name);
    bindEditable(subEl,product.subtitles,'');

    if(priceEl){
      let timer;
      const start=()=>{
        timer=setTimeout(()=>{
          const val=prompt("Set price:",product.price[index]);
          if(val!==null){
            const n=Number(val);
            if(!isNaN(n)){product.price[index]=n; persist(); render(index);}
          }
        },400);
      };
      const stop=()=>clearTimeout(timer);
      priceEl.addEventListener("mousedown",start);
      priceEl.addEventListener("mouseup",stop);
      priceEl.addEventListener("mouseleave",stop);
      priceEl.addEventListener("click",()=>{if(editing) start();});
    }

    leftBtn.addEventListener("click",()=>update(index-1));
    rightBtn.addEventListener("click",()=>update(index+1));

    function startAutoPlay(){interval=setInterval(()=>update(index+1),3000);}
    startAutoPlay();

    viewport.addEventListener("mouseenter",()=>clearInterval(interval));
    viewport.addEventListener("mouseleave",()=>{if(!editing) startAutoPlay();});

    update(0);
  });
}

// file upload preview
document.addEventListener("DOMContentLoaded",()=>{
  init();
  const upload=document.getElementById("image-upload");
  const preview=document.getElementById("preview-image");
  if(upload&&preview){
    upload.addEventListener("change",e=>{
      const file=e.target.files[0];
      if(file){
        const reader=new FileReader();
        reader.onload=ev=>{preview.src=ev.target.result; preview.style.display="block";};
        reader.readAsDataURL(file);
      }
    });
  }
});