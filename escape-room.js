// escape-room.js
let gameState = { hotspots: {}, inventory: [] }, puzzleData;

function showMsg(txt) {
  const b = document.getElementById('message-box');
  b.textContent = txt; b.style.display='block';
  setTimeout(()=>b.style.display='none',3000);
}

function addItem(id) {
  if(!gameState.inventory.includes(id)) {
    gameState.inventory.push(id);
    renderInv();
  }
}

function renderInv() {
  const bar = document.getElementById('inventory-bar');
  bar.innerHTML='';
  puzzleData.items.forEach(i=>{
    if(gameState.inventory.includes(i.id)) {
      const d=document.createElement('div');d.className='slot';
      const img=document.createElement('img');img.src=i.icon;img.alt=i.name;
      d.appendChild(img);bar.appendChild(d);
    }
  });
}

function updState(id,s) {
  gameState.hotspots[id]=s;
  const el=document.querySelector(`[data-id="${id}"]`);
  if(el) el.className='hotspot '+s;
}

function clickable(h) {
  if(gameState.hotspots[h.id]!=='available') return false;
  if(h.requires && !h.requires.every(i=>gameState.inventory.includes(i))) return false;
  if(h.requiresState)
    return Object.entries(h.requiresState).every(([d,s])=>gameState.hotspots[d]===s);
  return true;
}

function clickH(e) {
  const id=e.currentTarget.dataset.id;
  console.log('click',id);
  const h=puzzleData.hotspots.find(u=>u.id===id);
  if(!h||!clickable(h)) return console.log('not clickable',id);
  const {type,message,grants}=h.onClick;
  showMsg(message);
  grants.forEach(addItem);
  updState(id,type==='pickup'?'picked':type);
  if(type==='exit') finish();
  checkUnlock();
}

function finish(){
  const o=document.createElement('div');
  Object.assign(o.style,{position:'fixed',top:0,left:0,width:'100%',height:'100%',background:'rgba(0,0,0,0.8)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem'});
  o.innerHTML='<div>🎉 You Escaped! <br> Come back tomorrow.</div>';
  document.body.appendChild(o);
}

function checkUnlock(){
  puzzleData.hotspots.forEach(h=>{
    const st=gameState.hotspots[h.id];
    if(st==='hidden' && h.revealedBy && gameState.hotspots[h.revealedBy]!=='hidden')
      updState(h.id,'available');
    if(st==='locked' && h.requires && h.requires.every(i=>gameState.inventory.includes(i)))
      updState(h.id,'available');
    if(st==='inactive' && h.requires && h.requires.every(i=>gameState.inventory.includes(i)))
      updState(h.id,'available');
    if(st==='inactive' && h.requiresState && Object.entries(h.requiresState).every(([d,s])=>gameState.hotspots[d]===s))
      updState(h.id,'available');
  });
}

function renderHotspots(){
  const c=document.getElementById('room-container');
  c.querySelectorAll('.hotspot').forEach(x=>x.remove());
  const w=puzzleData.baselineWidth||800;
  const scale=document.getElementById('room-bg').clientWidth/w;
  puzzleData.hotspots.forEach(h=>{
    if(h.shape.type==='rect'||h.shape.type==='circle'){
      const d=document.createElement('div');
      d.className='hotspot '+h.initialState;d.dataset.id=h.id;
      if(h.shape.type==='rect'){
        Object.assign(d.style,{left:h.shape.x*scale+'px',top:h.shape.y*scale+'px',width:h.shape.width*scale+'px',height:h.shape.height*scale+'px'});
      } else {
        Object.assign(d.style,{left:(h.shape.x-h.shape.radius)*scale+'px',top:(h.shape.y-h.shape.radius)*scale+'px',width:h.shape.radius*2*scale+'px',height:h.shape.radius*2*scale+'px',borderRadius:'50%'});
      }
      d.addEventListener('click',clickH);
      c.appendChild(d);
      gameState.hotspots[h.id]=h.initialState;
    }
  });
  checkUnlock();
}

function countdown(){
  const el=document.getElementById('timer');
  function u(){
    const n=new Date(),u=n.getTime()+n.getTimezoneOffset()*60000,e=new Date(u-4*60*60000),x=new Date(e);
    x.setHours(24,0,0,0);
    const d=x-e,h=String(Math.floor(d/3600000)).padStart(2,'0'),m=String(Math.floor(d%3600000/60000)).padStart(2,'0'),s=String(Math.floor(d%60000/1000)).padStart(2,'0');
    el.textContent=`${h}:${m}:${s}`;
  }
  u();setInterval(u,1000);
}

function load(){
  const n=new Date(),u=n.getTime()+n.getTimezoneOffset()*60000,e=new Date(u-4*60*60000),
        d=e.getFullYear()+'-'+String(e.getMonth()+1).padStart(2,'0')+'-'+String(e.getDate()).padStart(2,'0');
  fetch(`assets/rooms/${d}.json`).then(r=>r.json()).then(data=>{
    puzzleData=data;
    const img=document.getElementById('room-bg');
    img.src=data.backgroundImage;
    img.onload=()=>{ renderHotspots(); renderInv(); countdown(); };
  }).catch(()=>document.getElementById('room-container').innerHTML='<p style="color:#fff;padding:1rem;">No puzzle!</p>');
}

document.addEventListener('DOMContentLoaded',load);
