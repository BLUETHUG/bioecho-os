// BioEcho OS v4 — Living World Experience

const world = new WorldV4(document.getElementById('world-canvas'));
const tree = new LivingTree(world);
const sound = new SoundEngine();
let experienceReady = false;
let lastFrame = 0;
let activeView = 'home';
let ambientInterval = null;

function initLanding() {
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const worldCanvas = document.getElementById('world-canvas');
  const uiLayer = document.getElementById('ui-layer');

  worldCanvas.width = window.innerWidth;
  worldCanvas.height = window.innerHeight;

  const seq = new LandingSequence(seedCanvas, worldCanvas);

  landing.addEventListener('click', async () => {
    landing.style.pointerEvents = 'none';

    // Start sound on first interaction
    await sound.initialize();
    await sound.resume();
    sound.playPulse();

    world.initialize();

    seq.start(() => {
      landing.classList.add('hidden');
      experienceReady = true;
      uiLayer.style.display = 'block';

      // Tree grows
      tree.initialize();
      sound.playGrowth();
      requestAnimationFrame(renderLoop);

      // Orbs reveal
      setTimeout(() => {
        tree._revealFeatures();
        enableTreeInteraction();
        startAmbient();
      }, 2000);
    });
  }, { once: true });

  // Idle seed pulse
  const seedCtx = seedCanvas.getContext('2d');
  let pt = 0;
  const drawIdle = () => {
    if (seq.phase !== 'pulse' && seq.t > 0) return;
    pt += 0.015;
    seedCtx.clearRect(0, 0, 200, 200);
    const cx = 100, cy = 105;
    const p = Math.sin(pt * 1.5) * 0.12 + 1;
    const b = Math.sin(pt * 0.8) * 0.04 + 1;

    const g = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 60 * b);
    g.addColorStop(0, 'rgba(111,163,111,0.08)');
    g.addColorStop(1, 'transparent');
    seedCtx.fillStyle = g;
    seedCtx.beginPath(); seedCtx.arc(cx, cy, 60 * b, 0, 6.28); seedCtx.fill();

    seedCtx.fillStyle = '#8A6A4A';
    seedCtx.beginPath(); seedCtx.ellipse(cx, cy, 10 * p, 15 * p, 0, 0, 6.28); seedCtx.fill();

    seedCtx.fillStyle = 'rgba(245,240,232,0.1)';
    seedCtx.beginPath(); seedCtx.ellipse(cx - 2, cy - 3, 4 * p, 6 * p, -0.2, 0, 6.28); seedCtx.fill();

    seedCtx.strokeStyle = 'rgba(111,163,111,0.5)';
    seedCtx.lineWidth = 1;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 15 * p);
    seedCtx.quadraticCurveTo(cx + 3, cy - 22 * p, cx, cy - 30 * p);
    seedCtx.stroke();

    seedCtx.fillStyle = 'rgba(111,163,111,0.3)';
    seedCtx.beginPath(); seedCtx.ellipse(cx + 3, cy - 25 * p, 3 * p, 1.5 * p, 0.3, 0, 6.28); seedCtx.fill();

    if (!landing.classList.contains('hidden')) requestAnimationFrame(drawIdle);
  };
  requestAnimationFrame(drawIdle);
}

function startAmbient() {
  const setAmbient = () => {
    const hour = new Date().getHours();
    sound.stopAmbient();
    if (hour >= 5 && hour < 10) sound.startAmbient('birds');
    else if (hour >= 10 && hour < 17) sound.startAmbient('water');
    else if (hour >= 17 && hour < 21) sound.startAmbient('birds');
    else sound.startAmbient('crickets');
  };
  setAmbient();
  ambientInterval = setInterval(setAmbient, 600000);
}

function enableTreeInteraction() {
  const worldCanvas = document.getElementById('world-canvas');

  worldCanvas.addEventListener('click', (e) => {
    if (!experienceReady) return;
    const idx = tree.hitTest(e.clientX, e.clientY);
    if (idx >= 0) {
      sound.playWaterDrop();
      openFeature(idx);
    }
  });

  worldCanvas.addEventListener('mousemove', (e) => {
    if (!experienceReady) return;
    const idx = tree.hitTest(e.clientX, e.clientY);
    tree.setHover(idx);
    worldCanvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
  });
}

function openFeature(index) {
  const featureNames = ['lens', 'care', 'earth', 'research', 'community', 'story'];
  const name = featureNames[index] || 'home';
  showView(name);
}

function showView(name) {
  activeView = name;
  const overlay = document.getElementById('content-overlay');
  const title = document.getElementById('overlay-title');
  const body = document.getElementById('overlay-body');

  if (name === 'home') {
    overlay.classList.remove('visible');
    return;
  }

  const icons = { lens: '💧', care: '🌿', earth: '🌍', research: '🌳', community: '🕊', story: '📖' };
  title.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  title.dataset.icon = icons[name] || '';

  body.innerHTML = `
    <div style="padding:16px;color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="margin:0 0 12px;opacity:0.7">Connect a device to begin exploring ${name}.</p>
      <p style="margin:0;opacity:0.5">This view is part of BioEcho's living interface.</p>
    </div>`;

  overlay.classList.add('visible');
}

document.getElementById('overlay-close')?.addEventListener('click', () => {
  document.getElementById('content-overlay').classList.remove('visible');
  sound.playLeafRustle();
});

function renderLoop(timestamp) {
  if (!experienceReady) return;
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);

  world.update(dt, LDL.currentTime);
  world.render(LDL.currentTime, LDL.currentSeason || 'spring');

  const ctx = document.getElementById('world-canvas').getContext('2d');
  tree.update(dt);
  tree.render(ctx, LDL.currentTime);

  requestAnimationFrame(renderLoop);
}

try { initLanding(); } catch(e) { console.error('Landing error:', e); }
