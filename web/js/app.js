// BioEcho OS v4 — Living World Experience

let world = null;
let tree = null;
const sound = new SoundEngine();
let experienceReady = false;
let lastFrame = 0;
let activeView = 'home';
let ambientInterval = null;
let activeUnfurl = null;

function initLanding() {
  BarkPanel.init();

  world = new WorldV4(document.getElementById('world-canvas'));
  tree = new LivingTree(world);
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const worldCanvas = document.getElementById('world-canvas');
  const uiLayer = document.getElementById('ui-layer');

  worldCanvas.width = window.innerWidth;
  worldCanvas.height = window.innerHeight;

  const seq = new LandingSequence(seedCanvas, worldCanvas);

landing.addEventListener('click', async () => {
    try {
      landing.style.pointerEvents = 'none';

      await sound.initialize();
      await sound.resume();
      sound.playPulse();

      world.initialize();

      seq.start(() => {
        landing.classList.add('hidden');
        experienceReady = true;
        uiLayer.style.display = 'block';

        tree.initialize();
        sound.playGrowth();
        requestAnimationFrame(renderLoop);

      setTimeout(() => {
        tree._revealFeatures();
        enableTreeInteraction();
        startAmbient();
      }, 2000);
    });
  } catch (e) {
    console.error('Click handler error:', e);
    landing.style.pointerEvents = 'auto';
  }
}, { once: true });

  const seedCtx = seedCanvas.getContext('2d');
  const sw = seedCanvas.width, sh = seedCanvas.height;
  const s = sw / 200;
  const scx = sw / 2, scy = sh / 2;
  let pt = 0;
  const drawIdle = () => {
    if (seq.phase !== 'pulse' && seq.t > 0) return;
    pt += 0.015;
    seedCtx.clearRect(0, 0, sw, sh);
    const cx = scx, cy = scy;
    const p = Math.sin(pt * 1.5) * 0.15 + 1;
    const b = Math.sin(pt * 0.8) * 0.08 + 1;

    // Strong outer glow — very visible
    const g = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 100 * s * b);
    g.addColorStop(0, 'rgba(245,240,232,0.25)');
    g.addColorStop(0.4, 'rgba(111,163,111,0.15)');
    g.addColorStop(1, 'transparent');
    seedCtx.fillStyle = g;
    seedCtx.beginPath(); seedCtx.arc(cx, cy, 100 * s * b, 0, 6.28); seedCtx.fill();

    // Bright seed body — cream color, large
    seedCtx.fillStyle = '#F5F0E8';
    seedCtx.beginPath(); seedCtx.ellipse(cx, cy, 28 * s * p, 42 * s * p, 0, 0, 6.28); seedCtx.fill();

    // Inner highlight
    seedCtx.fillStyle = 'rgba(255,255,255,0.4)';
    seedCtx.beginPath(); seedCtx.ellipse(cx - 4 * s, cy - 6 * s, 10 * s * p, 16 * s * p, -0.2, 0, 6.28); seedCtx.fill();

    // Prominent sprout
    seedCtx.strokeStyle = '#6FA36F';
    seedCtx.lineWidth = 3 * s;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 42 * s * p);
    seedCtx.quadraticCurveTo(cx + 6 * s, cy - 60 * s * p, cx, cy - 80 * s * p);
    seedCtx.stroke();

    // Clear leaf
    seedCtx.fillStyle = 'rgba(111,163,111,0.6)';
    seedCtx.beginPath(); seedCtx.ellipse(cx + 6 * s, cy - 70 * s * p, 8 * s * p, 4 * s * p, 0.3, 0, 6.28); seedCtx.fill();

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
      openFeature(idx, e.clientX, e.clientY);
    }
  });

  worldCanvas.addEventListener('mousemove', (e) => {
    if (!experienceReady) return;
    const idx = tree.hitTest(e.clientX, e.clientY);
    tree.setHover(idx);
    worldCanvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
  });
}

const featureContent = {
  lens: {
    title: 'BioEcho Lens', icon: 'lens',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">See the invisible. The Lens reveals the hidden signals that plants and ecosystems emit — electrical pulses, chemical signatures, stress patterns.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Connect a device to activate sensing.</p>
    </div>`
  },
  care: {
    title: 'Living Care', icon: 'sprout',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">Your ecosystem's health timeline. Track vitality, detect early warning signs, and nurture what matters.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Each organism you monitor appears here as it grows.</p>
    </div>`
  },
  earth: {
    title: 'Living Earth', icon: 'seed',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">Every observation connects to a global living map. See what others are discovering — from old-growth forests to your own backyard.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Community observations, biodiversity hotspots, and local discoveries.</p>
    </div>`
  },
  research: {
    title: 'Living Research', icon: 'rings',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">Explore the knowledge graph of life — species relationships, ecological networks, and evolutionary lineages interconnected like a vast root system.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Powered by citizen science data and peer-reviewed research.</p>
    </div>`
  },
  community: {
    title: 'Living Community', icon: 'flock',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">You're not alone. Join a flock of citizen scientists, naturalists, and caretakers working together to understand and protect the living world.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Share observations, verify findings, and contribute to real research.</p>
    </div>`
  },
  story: {
    title: 'Living Story', icon: 'vine',
    body: `<div style="color:#F5F0E8;font-family:Inter,sans-serif;font-weight:300;font-size:14px;line-height:1.6">
      <p style="opacity:0.8">Travel through time. See the deep history of your ecosystem — from ancient forests to restoration stories — and peer into what's coming next.</p>
      <p style="opacity:0.5;font-size:12px;margin-top:12px">Your personal ecosystem timeline, from past to future.</p>
    </div>`
  }
};

function openFeature(index, originX, originY) {
  const names = ['lens', 'care', 'earth', 'research', 'community', 'story'];
  const name = names[index] || 'home';
  showView(name, originX, originY);
}

function showView(name, ox, oy) {
  activeView = name;
  const overlay = document.getElementById('content-overlay');
  const card = overlay.querySelector('.content-card');
  const title = document.getElementById('overlay-title');
  const body = document.getElementById('overlay-body');
  const closeBtn = document.getElementById('overlay-close');

  if (name === 'home') {
    if (activeUnfurl) { activeUnfurl.close(); activeUnfurl = null; }
    overlay.classList.remove('visible');
    return;
  }

  const content = featureContent[name] || featureContent.lens;
  title.innerHTML = `<span style="display:flex;align-items:center;gap:8px">${bioechoIcon(content.icon, 18)}<span style="font-size:14px;font-weight:400;color:#F5F0E8;font-family:Inter,sans-serif">${content.title}</span></span>`;
  closeBtn.innerHTML = bioechoIcon('close', 14);
  body.innerHTML = content.body;
  overlay.classList.add('visible');

  if (activeUnfurl) activeUnfurl.close();
  const canvas = document.getElementById('vine-canvas');
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  activeUnfurl = new PanelUnfurl(card, ox || window.innerWidth / 2, oy || window.innerHeight * 0.72);
  activeUnfurl.open();
}

document.getElementById('overlay-close')?.addEventListener('click', () => {
  if (activeUnfurl) { activeUnfurl.close(); activeUnfurl = null; }
  document.getElementById('content-overlay').classList.remove('visible');
  sound.playLeafRustle();
});

function renderLoop(timestamp) {
  if (!experienceReady) return;
  try {
    const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;

    LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
    LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);

    world.update(dt, LDL.currentTime);
    world.render(LDL.currentTime, LDL.currentSeason || 'spring');

    const ctx = document.getElementById('world-canvas').getContext('2d');
    tree.update(dt);
    tree.render(ctx, LDL.currentTime);
  } catch (e) {
    console.error('Render loop error:', e);
  }
  requestAnimationFrame(renderLoop);
}

try { initLanding(); } catch(e) { console.error('Landing error:', e); }