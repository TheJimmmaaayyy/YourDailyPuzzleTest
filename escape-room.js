// escape-room.js

let gameState = { hotspots: {}, inventory: [] };
let puzzleData = null;

function showMessage(text) {
  const msgBox = document.getElementById('message-box');
  msgBox.textContent = text;
  msgBox.style.display = 'block';
  setTimeout(() => { msgBox.style.display = 'none'; }, 3000);
}

function addItem(itemId) {
  if (!gameState.inventory.includes(itemId)) {
    gameState.inventory.push(itemId);
    renderInventory();
  }
}

function renderInventory() {
  const invBar = document.getElementById('inventory-bar');
  invBar.innerHTML = '';
  puzzleData.items.forEach(item => {
    if (gameState.inventory.includes(item.id)) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      const img = document.createElement('img');
      img.src = item.icon;
      img.alt = item.name;
      slot.appendChild(img);
      invBar.appendChild(slot);
    }
  });
}

function updateHotspotState(id, newState) {
  gameState.hotspots[id] = newState;
  const elem = document.querySelector(`.hotspot[data-id="${id}"]`);
  if (!elem) return;
  if (['hidden', 'inactive', 'locked'].includes(newState)) {
    elem.classList.add(newState);
    elem.classList.remove('available');
  } else {
    elem.classList.remove('hidden', 'inactive', 'locked');
    elem.classList.add('available');
  }
}

function isClickable(hotspot) {
  const state = gameState.hotspots[hotspot.id];
  if (state !== 'available') return false;
  if (hotspot.requires && !hotspot.requires.every(r => gameState.inventory.includes(r))) return false;
  if (hotspot.requiresState) {
    return Object.entries(hotspot.requiresState).every(
      ([depId, depState]) => gameState.hotspots[depId] === depState
    );
  }
  return true;
}

function handleClickable(event) {
  const id = event.currentTarget.dataset.id;
  const hotspot = puzzleData.hotspots.find(h => h.id === id);
  if (!isClickable(hotspot)) return;
  const { type, message, grants } = hotspot.onClick;
  showMessage(message);
  if (grants && grants.length) {
    grants.forEach(item => addItem(item));
  }
  if (type === 'pickup') {
    updateHotspotState(id, 'picked');
  } else if (['inspect', 'spin'].includes(type)) {
    updateHotspotState(id, type);
  } else if (type === 'exit') {
    showCompletion();
  }
  checkUnlocks();
}

function showCompletion() {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.8)', display: 'flex',
    flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    color: '#fff', fontSize: '1.2rem'
  });
  overlay.innerHTML = '<p>You Escaped!<br/>Check back tomorrow for a new challenge.</p>';
  document.body.appendChild(overlay);
}

function checkUnlocks() {
  puzzleData.hotspots.forEach(hs => {
    const currentState = gameState.hotspots[hs.id];
    if (currentState === 'hidden' && hs.revealedBy &&
        gameState.hotspots[hs.revealedBy] !== 'hidden' &&
        gameState.hotspots[hs.revealedBy] !== 'inactive') {
      updateHotspotState(hs.id, 'available');
    }
    if (currentState === 'locked' && hs.requires &&
        hs.requires.every(r => gameState.inventory.includes(r))) {
      updateHotspotState(hs.id, 'available');
    }
    if (currentState === 'inactive' && hs.requires &&
        hs.requires.every(r => gameState.inventory.includes(r))) {
      updateHotspotState(hs.id, 'available');
    }
    if (currentState === 'inactive' && hs.requiresState) {
      const ok = Object.entries(hs.requiresState).every(
        ([depId, depState]) => gameState.hotspots[depId] === depState
      );
      if (ok) updateHotspotState(hs.id, 'available');
    }
  });
}

function renderHotspots() {
  const container = document.getElementById('room-container');
  puzzleData.hotspots.forEach(hs => {
    const div = document.createElement('div');
    div.className = 'hotspot ' + hs.initialState;
    div.dataset.id = hs.id;
    const baselineWidth = puzzleData.baselineWidth || 800;
    const scale = document.getElementById('room-bg').clientWidth / baselineWidth;
    if (hs.shape.type === 'rect') {
      Object.assign(div.style, {
        left: (hs.shape.x * scale) + 'px',
        top: (hs.shape.y * scale) + 'px',
        width: (hs.shape.width * scale) + 'px',
        height: (hs.shape.height * scale) + 'px'
      });
    } else if (hs.shape.type === 'circle') {
      Object.assign(div.style, {
        left: ((hs.shape.x - hs.shape.radius) * scale) + 'px',
        top: ((hs.shape.y - hs.shape.radius) * scale) + 'px',
        width: (hs.shape.radius * 2 * scale) + 'px',
        height: (hs.shape.radius * 2 * scale) + 'px',
        borderRadius: '50%'
      });
    } else if (hs.shape.type === 'poly') {
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.style.position = 'absolute';
      svg.style.left = '0'; svg.style.top = '0';
      svg.setAttribute('viewBox', `0 0 ${baselineWidth} ${baselineWidth * 0.75}`);
      svg.style.width = '100%'; svg.style.height = '100%';
      const poly = document.createElementNS(svgNS, 'polygon');
      const points = hs.shape.points.map(p => p.join(',')).join(' ');
      poly.setAttribute('points', points);
      poly.setAttribute('transform', `scale(${scale})`);
      poly.setAttribute('fill', 'transparent');
      poly.dataset.id = hs.id;
      poly.style.cursor = 'pointer';
      if (hs.initialState !== 'available') poly.style.display = 'none';
      svg.appendChild(poly);
      container.appendChild(svg);
      poly.addEventListener('click', handleClickable);
      gameState.hotspots[hs.id] = hs.initialState;
      return;
    }
    if (hs.initialState !== 'available') div.classList.add(hs.initialState);
    container.appendChild(div);
    div.addEventListener('click', handleClickable);
    gameState.hotspots[hs.id] = hs.initialState;
  });
}

function loadPuzzle() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  fetch(`/assets/rooms/${dateStr}.json`)
    .then(res => {
      if (!res.ok) throw new Error('No puzzle today.');
      return res.json();
    })
    .then(data => {
      puzzleData = data;
      document.getElementById('room-bg').src = data.backgroundImage;
      document.getElementById('room-bg').addEventListener('load', () => {
        renderHotspots();
        renderInventory();
        startCountdown();
      });
    })
    .catch(err => {
      const container = document.getElementById('room-container');
      container.innerHTML = '<p style="color: #fff; padding: 20px;">No puzzle available today. Check back tomorrow!</p>';
    });
}

function startCountdown() {
  const countdownElem = document.getElementById('countdown-timer');
  function updateTimer() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const diff = next - now;
    const hrs = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    countdownElem.textContent = `${hrs}:${mins}:${secs}`;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
}

document.addEventListener('DOMContentLoaded', loadPuzzle);
