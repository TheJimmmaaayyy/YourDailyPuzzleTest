// escape-room.js

let gameState = { hotspots: {} };
let puzzleData;
let stepIndex = 0;
let order = [];
let tasksCompleted = [];

// Show inline message near the room
function showInline(msg) {
  const box = document.getElementById('message-box');
  box.textContent = msg;
  box.style.display = 'block';
  setTimeout(() => { box.style.display = 'none'; }, 2000);
}

// Modal for win/lose
function showModal(msg) {
  document.getElementById('modal-message').textContent = msg;
  document.getElementById('modal').classList.add('active');
}

function hideModal() {
  document.getElementById('modal').classList.remove('active');
}

document.getElementById('modal-restart').addEventListener('click', () => {
  resetGame();
});

// Format hotspot ID into readable task label
function formatLabel(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Update the tasks list UI
function updateTaskList() {
  const ul = document.getElementById('task-list');
  ul.innerHTML = '';
  tasksCompleted.forEach(id => {
    const li = document.createElement('li');
    li.textContent = formatLabel(id);
    ul.appendChild(li);
  });
}

// Reset game state
function resetGame() {
  gameState = { hotspots: {} };
  stepIndex = 0;
  tasksCompleted = [];
  hideModal();
  renderHotspots();
  updateTaskList();
}

// Update hotspot's visual state
function updateHotspotState(id, state) {
  gameState.hotspots[id] = state;
  const el = document.querySelector(`.hotspot[data-id="${id}"]`);
  if (el) el.className = `hotspot ${state}`;
}

// Check if a hotspot is clickable (correct order and prerequisites)
function isClickable(hs) {
  if (hs.onClick.type !== 'lose' && hs.id !== order[stepIndex]) {
    return false;
  }
  if (hs.requires && !hs.requires.every(i => gameState.hotspots[i] === 'picked')) {
    return false;
  }
  if (hs.requiresState) {
    return Object.entries(hs.requiresState)
      .every(([dep, st]) => gameState.hotspots[dep] === st);
  }
  return gameState.hotspots[hs.id] === 'available';
}

// Handle clicks on hotspots
function handleClick(e) {
  const id = e.currentTarget.dataset.id;
  const hs = puzzleData.hotspots.find(h => h.id === id);
  if (!hs) return;
  if (!isClickable(hs)) {
    return showModal('Wrong move! You lost. Click Restart to try again.');
  }
  const { type, message } = hs.onClick;
  if (type === 'lose') {
    return showModal(message);
  }
  showInline(message);
  tasksCompleted.push(id);
  updateTaskList();
  const nextState = type === 'pickup' ? 'picked' : type;
  updateHotspotState(id, nextState);
  if (type === 'exit') {
    return showModal('🎉 You escaped! Click Restart for a new challenge.');
  }
  stepIndex++;
  renderHotspots();
}

// Render all hotspots based on JSON
function renderHotspots() {
  const container = document.getElementById('room-container');
  container.querySelectorAll('.hotspot').forEach(el => el.remove());
  const baseW = puzzleData.baselineWidth || 800;
  const scale = document.getElementById('room-bg').clientWidth / baseW;
  puzzleData.hotspots.forEach(hs => {
    gameState.hotspots[hs.id] = hs.initialState;
    if (['rect', 'circle'].includes(hs.shape.type)) {
      const el = document.createElement('div');
      el.className = `hotspot ${hs.initialState}`;
      el.dataset.id = hs.id;
      if (hs.shape.type === 'rect') {
        Object.assign(el.style, {
          left: `${hs.shape.x * scale}px`,
          top: `${hs.shape.y * scale}px`,
          width: `${hs.shape.width * scale}px`,
          height: `${hs.shape.height * scale}px`
        });
      } else {
        Object.assign(el.style, {
          left: `${(hs.shape.x - hs.shape.radius) * scale}px`,
          top: `${(hs.shape.y - hs.shape.radius) * scale}px`,
          width: `${hs.shape.radius * 2 * scale}px`,
          height: `${hs.shape.radius * 2 * scale}px`,
          borderRadius: '50%'
        });
      }
      el.addEventListener('click', handleClick);
      container.appendChild(el);
    }
  });
}

// Countdown timer
function startCountdown() {
  const el = document.getElementById('timer');
  function update() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const et = new Date(utc - 4 * 60 * 60000);
    const next = new Date(et);
    next.setHours(24, 0, 0, 0);
    const diff = next - et;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// Load and initialize puzzle
function loadPuzzle() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et = new Date(utc - 4 * 60 * 60000);
  const dateStr = `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`;
  fetch(`/assets/rooms/${dateStr}.json`)
    .then(res => res.json())
    .then(data => {
      puzzleData = data;
      order = data.correctOrder || [];
      const bg = document.getElementById('room-bg');
      bg.src = data.backgroundImage;
      bg.onload = () => {
        renderHotspots();
        updateTaskList();
        startCountdown();
      };
    })
    .catch(() => {
      document.getElementById('room-container').innerHTML = '<p style="color:#fff;padding:1rem;">No puzzle available.</p>';
    });
}

window.addEventListener('DOMContentLoaded', loadPuzzle);
