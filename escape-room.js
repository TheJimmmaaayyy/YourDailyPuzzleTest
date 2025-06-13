// escape-room.js
let gameState = { hotspots: {}, inventory: [] };
let puzzleData, stepIndex = 0, order = [];

function showInline(msg) {
  const box = document.getElementById('message-box');
  box.textContent = msg;
  box.style.display = 'block';
  setTimeout(() => { box.style.display = 'none'; }, 2000);
}

function showModal(msg) {
  document.getElementById('modal-message').textContent = msg;
  document.getElementById('modal').classList.add('active');
}

function hideModal() {
  document.getElementById('modal').classList.remove('active');
}

function resetGame() {
  // Reset state
  gameState = { hotspots: {}, inventory: [] };
  stepIndex = 0;
  renderInventory();
  renderHotspots();
  hideModal();
}

document.getElementById('modal-restart').addEventListener('click', resetGame);

function addItem(id) {
  if (!gameState.inventory.includes(id)) {
    gameState.inventory.push(id);
    renderInventory();
  }
}

function renderInventory() {
  const bar = document.getElementById('inventory-bar');
  bar.innerHTML = '';
  puzzleData.items.forEach(item => {
    if (gameState.inventory.includes(item.id)) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const img = document.createElement('img');
      img.src = item.icon;
      img.alt = item.name;
      slot.appendChild(img);
      bar.appendChild(slot);
    }
  });
}

function updateHotspotState(id, state) {
  gameState.hotspots[id] = state;
  const el = document.querySelector(`.hotspot[data-id="${id}"]`);
  if (el) el.className = 'hotspot ' + state;
}

function isClickable(hs) {
  // Enforce correct order
  if (hs.onClick.type !== 'lose' && hs.id !== order[stepIndex]) {
    return false;
  }
  // Inventory requirements
  if (hs.requires && !hs.requires.every(r => gameState.inventory.includes(r))) return false;
  // State requirements
  if (hs.requiresState) {
    return Object.entries(hs.requiresState)
      .every(([d,s]) => gameState.hotspots[d] === s);
  }
  return gameState.hotspots[hs.id] === 'available';
}

function handleClick(e) {
  const id = e.currentTarget.dataset.id;
  const hs = puzzleData.hotspots.find(h => h.id === id);
  if (!hs || !isClickable(hs)) {
    // Wrong click = lose
    return showModal('Wrong move! You lost. Click Restart to try again.');
  }
  const { type, message, grants } = hs.onClick;
  if (type === 'lose') {
    return showModal(message);
  }
  showInline(message);
  grants.forEach(addItem);
  const nextState = type === 'pickup' ? 'picked' : type;
  updateHotspotState(id, nextState);
  stepIndex++;
  if (type === 'exit') {
    showModal('🎉 You escaped! Click Restart for a new challenge.');
  } else {
    renderHotspots(); // unlock next hotspot
  }
}

function renderHotspots() {
  const cont = document.getElementById('room-container');
  // Remove old
  cont.querySelectorAll('.hotspot').forEach(el => el.remove());
  const baseW = puzzleData.baselineWidth || 800;
  const scale = document.getElementById('room-bg').clientWidth / baseW;
  puzzleData.hotspots.forEach(hs => {
    // Initialize state
    const state = hs.initialState;
    gameState.hotspots[hs.id] = state;
    // Positionable types
    if (['rect','circle'].includes(hs.shape.type)) {
      const div = document.createElement('div');
      div.className = 'hotspot ' + state;
      div.dataset.id = hs.id;
      if (hs.shape.type === 'rect') {
        Object.assign(div.style, {
          left: `${hs.shape.x * scale}px`,
          top: `${hs.shape.y * scale}px`,
          width: `${hs.shape.width * scale}px`,
          height: `${hs.shape.height * scale}px`
        });
      } else {
        Object.assign(div.style, {
          left: `${(hs.shape.x - hs.shape.radius) * scale}px`,
          top: `${(hs.shape.y - hs.shape.radius) * scale}px`,
          width: `${hs.shape.radius * 2 * scale}px`,
          height: `${hs.shape.radius * 2 * scale}px`,
          borderRadius: '50%'
        });
      }
      div.addEventListener('click', handleClick);
      cont.appendChild(div);
    }
  });
}

function startCountdown() {
  const el = document.getElementById('timer');
  function update() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const et = new Date(utc - 4 * 60 * 60000);
    const next = new Date(et);
    next.setHours(24,0,0,0);
    const diff = next - et;
    const h = String(Math.floor(diff/3600000)).padStart(2,'0');
    const m = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
    const s = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

function loadPuzzle() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et = new Date(utc - 4 * 60 * 60000);
  const dateStr = `${et.getFullYear()}-${String(et.getMonth()+1).padStart(2,'0')}-${String(et.getDate()).padStart(2,'0')}`;
  fetch(`/assets/rooms/${dateStr}.json`)
    .then(r => r.json())
    .then(data => {
      puzzleData = data;
      order = data.correctOrder || [];
      const bg = document.getElementById('room-bg');
      bg.src = data.backgroundImage;
      bg.onload = () => {
        renderHotspots();
        renderInventory();
        startCountdown();
      };
    })
    .catch(() => {
      document.getElementById('room-container').innerHTML = '<p style="color:#fff;padding:1rem;">No puzzle available.</p>';
    });
}

document.addEventListener('DOMContentLoaded', loadPuzzle);
