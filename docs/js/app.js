// BioEcho OS v6 — Award-Winning Immersive Experience

let scene3d = null;
const sound = new SoundEngine();
let experienceReady = false;
let lastFrame = 0;

function initLanding() {
  try { BarkPanel.init(); } catch(e) {}

  const worldCanvas = document.getElementById('world-canvas');
  if (worldCanvas) {
    worldCanvas.width = window.innerWidth;
    worldCanvas.height = window.innerHeight;
  }

  try { scene3d = new BioEchoScene(); } catch(e) { console.warn('BioEchoScene:', e); }

  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const uiLayer = document.getElementById('ui-layer');

  if (!landing || !seedCanvas) return;

  const seq = new LandingSequence(seedCanvas);

  initCursor();

  landing.addEventListener('click', async () => {
    try {
      landing.style.pointerEvents = 'none';

      try {
        await sound.initialize();
        await sound.resume();
        sound.playPulse();
      } catch(e) {}

      seq.start(() => {
        landing.classList.add('hidden');
        experienceReady = true;
        uiLayer.style.display = 'block';
        requestAnimationFrame(() => uiLayer.classList.add('visible'));

        try {
          scene3d.init(worldCanvas);
          scene3d.setTimeOfDay(LDL.currentTime || 'noon');
        } catch(e) {
          console.error('3D scene init error:', e);
        }

        try { sound.playGrowth(); } catch(e) {}
        requestAnimationFrame(renderLoop);

        setTimeout(() => {
          showExplorePrompt();
          showHeroText();
          startCoordTracker();
          enableOrbInteraction();
        }, 1500);
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

    const g = seedCtx.createRadialGradient(cx, cy, 0, cx, cy, 100 * s * b);
    g.addColorStop(0, 'rgba(245,240,232,0.2)');
    g.addColorStop(0.4, 'rgba(111,163,111,0.1)');
    g.addColorStop(1, 'transparent');
    seedCtx.fillStyle = g;
    seedCtx.beginPath(); seedCtx.arc(cx, cy, 100 * s * b, 0, 6.28); seedCtx.fill();

    seedCtx.fillStyle = '#F5F0E8';
    seedCtx.beginPath(); seedCtx.ellipse(cx, cy, 28 * s * p, 42 * s * p, 0, 0, 6.28); seedCtx.fill();

    seedCtx.fillStyle = 'rgba(255,255,255,0.3)';
    seedCtx.beginPath(); seedCtx.ellipse(cx - 4 * s, cy - 6 * s, 10 * s * p, 16 * s * p, -0.2, 0, 6.28); seedCtx.fill();

    seedCtx.strokeStyle = '#6FA36F';
    seedCtx.lineWidth = 3 * s;
    seedCtx.beginPath();
    seedCtx.moveTo(cx, cy - 42 * s * p);
    seedCtx.quadraticCurveTo(cx + 6 * s, cy - 60 * s * p, cx, cy - 80 * s * p);
    seedCtx.stroke();

    seedCtx.fillStyle = 'rgba(111,163,111,0.5)';
    seedCtx.beginPath(); seedCtx.ellipse(cx + 6 * s, cy - 70 * s * p, 8 * s * p, 4 * s * p, 0.3, 0, 6.28); seedCtx.fill();

    if (!landing.classList.contains('hidden')) requestAnimationFrame(drawIdle);
  };
  requestAnimationFrame(drawIdle);
}

function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || window.innerWidth < 769) return;

  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

  const hoverTargets = 'button, a, .pill, .icon-btn, #seed-canvas, #landing';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.add('hovering');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverTargets)) cursor.classList.remove('hovering');
  });

  const animate = () => {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function showHeroText() {
  const hero = document.getElementById('hero-text');
  if (!hero) return;
  hero.classList.add('visible');
  setTimeout(() => {
    hero.classList.add('fading');
    setTimeout(() => hero.classList.remove('visible', 'fading'), 2000);
  }, 5000);
}

function showExplorePrompt() {
  const prompt = document.getElementById('explore-prompt');
  if (!prompt) return;
  setTimeout(() => prompt.classList.add('visible'), 1000);
  const dismiss = () => {
    prompt.classList.add('fading');
    setTimeout(() => prompt.classList.remove('visible', 'fading'), 1500);
  };
  window.addEventListener('keydown', dismiss, { once: true });
  document.getElementById('world-canvas')?.addEventListener('mousedown', dismiss, { once: true });
  setTimeout(dismiss, 10000);
}

function startCoordTracker() {
  const el = document.getElementById('coord-pos');
  if (!el || !scene3d) return;
  setInterval(() => {
    if (!scene3d?.camera) return;
    const x = scene3d.camera.position.x.toFixed(1);
    const z = scene3d.camera.position.z.toFixed(1);
    el.textContent = `${x}, ${z}`;
  }, 200);
}

const featureContent = {
  lens: {
    title: 'BioEcho Lens',
    body: `<p>See the invisible. The Lens reveals the hidden signals that plants and ecosystems emit — electrical pulses, chemical signatures, stress patterns.</p>
    <div class="stat-row"><span class="stat-label">Status</span><span class="stat-value accent">Active</span></div>
    <div class="stat-row"><span class="stat-label">Sensitivity</span><span class="stat-value">High</span></div>
    <div class="stat-row"><span class="stat-label">Range</span><span class="stat-value">12m</span></div>`
  },
  care: {
    title: 'Living Care',
    body: `<p>Your ecosystem's health timeline. Track vitality, detect early warning signs, and nurture what matters.</p>
    <div class="stat-row"><span class="stat-label">Vitality</span><span class="stat-value accent">94%</span></div>
    <div class="stat-row"><span class="stat-label">Stress</span><span class="stat-value">Low</span></div>
    <div class="stat-row"><span class="stat-label">Growth</span><span class="stat-value accent">+2.3%</span></div>`
  },
  earth: {
    title: 'Living Earth',
    body: `<p>Every observation connects to a global living map. See what others are discovering — from old-growth forests to your own backyard.</p>
    <div class="stat-row"><span class="stat-label">Observations</span><span class="stat-value">12.4k</span></div>
    <div class="stat-row"><span class="stat-label">Species</span><span class="stat-value accent">847</span></div>
    <div class="stat-row"><span class="stat-label">Regions</span><span class="stat-value">156</span></div>`
  },
  research: {
    title: 'Living Research',
    body: `<p>Explore the knowledge graph of life — species relationships, ecological networks, and evolutionary lineages interconnected like a vast root system.</p>
    <div class="stat-row"><span class="stat-label">Nodes</span><span class="stat-value">24.8k</span></div>
    <div class="stat-row"><span class="stat-label">Edges</span><span class="stat-value accent">142k</span></div>
    <div class="stat-row"><span class="stat-label">Confidence</span><span class="stat-value">96%</span></div>`
  },
  community: {
    title: 'Living Community',
    body: `<p>You're not alone. Join a flock of citizen scientists, naturalists, and caretakers working together to understand and protect the living world.</p>
    <div class="stat-row"><span class="stat-label">Members</span><span class="stat-value accent">8.2k</span></div>
    <div class="stat-row"><span class="stat-label">Active</span><span class="stat-value">1,247</span></div>
    <div class="stat-row"><span class="stat-label">Contributions</span><span class="stat-value">34.6k</span></div>`
  },
  story: {
    title: 'Living Story',
    body: `<p>Travel through time. See the deep history of your ecosystem — from ancient forests to restoration stories — and peer into what's coming next.</p>
    <div class="stat-row"><span class="stat-label">Timeline</span><span class="stat-value">2,400 yrs</span></div>
    <div class="stat-row"><span class="stat-label">Events</span><span class="stat-value accent">1,892</span></div>
    <div class="stat-row"><span class="stat-label">Predictions</span><span class="stat-value">Active</span></div>`
  }
};

let activeFeature = null;

function showFeaturePanel(name, originX, originY) {
  const panel = document.getElementById('side-panel');
  const title = panel.querySelector('.panel-title');
  const body = panel.querySelector('.panel-body');
  const content = featureContent[name] || featureContent.lens;

  if (title) title.textContent = content.title;
  if (body) body.innerHTML = content.body;

  panel.classList.add('visible');
  activeFeature = name;

  try { sound.playWaterDrop(); } catch(e) {}
}

function hideFeaturePanel() {
  const panel = document.getElementById('side-panel');
  panel.classList.remove('visible');
  activeFeature = null;
  try { sound.playLeafRustle(); } catch(e) {}
}

document.getElementById('panel-close')?.addEventListener('click', hideFeaturePanel);

function enableOrbInteraction() {
  const canvas = document.getElementById('world-canvas');
  if (!canvas || !scene3d?.orbs) return;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const label = document.getElementById('feature-label');
  const labelText = label?.querySelector('.label-text');
  const featureNames = ['lens', 'care', 'earth', 'research', 'community', 'story'];

  canvas.addEventListener('mousemove', (e) => {
    if (!experienceReady || !scene3d?.orbs) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, scene3d.camera);
    const hits = raycaster.intersectObjects(scene3d.orbs);
    if (hits.length > 0) {
      const idx = scene3d.orbs.indexOf(hits[0].object);
      if (idx >= 0) {
        const name = featureNames[idx];
        const content = featureContent[name];
        if (labelText && content) labelText.textContent = content.title;
        label.style.left = `${e.clientX + 20}px`;
        label.style.top = `${e.clientY - 10}px`;
        label.classList.add('visible');
      }
    } else {
      label.classList.remove('visible');
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!experienceReady || !scene3d?.orbs) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, scene3d.camera);
    const hits = raycaster.intersectObjects(scene3d.orbs);
    if (hits.length > 0) {
      const idx = scene3d.orbs.indexOf(hits[0].object);
      if (idx >= 0) {
        const name = featureNames[idx];
        if (activeFeature === name) {
          hideFeaturePanel();
        } else {
          showFeaturePanel(name, e.clientX, e.clientY);
        }
      }
    }
  });
}

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const view = pill.dataset.view;
    if (view) {
      try { sound.playWaterDrop(); } catch(e) {}
    }
  });
});

document.getElementById('btn-sound')?.addEventListener('click', function() {
  this.classList.toggle('muted');
  if (this.classList.contains('muted')) {
    sound.stopAmbient();
  } else {
    startAmbient();
  }
});

let ambientInterval = null;

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

let lastGustSound = 0;
let lastFootstep = 0;

function renderLoop(timestamp) {
  if (!experienceReady) return;
  try {
    const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;

    LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
    LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);

    if (scene3d) {
      scene3d.update(dt);
      scene3d.render();
    }

    if (scene3d?.wind?.strength > 0.6 && timestamp - lastGustSound > 4000) {
      sound.playWindGust();
      lastGustSound = timestamp;
    }
    if (scene3d?.isMoving && timestamp - lastFootstep > 350) {
      sound.playFootstep();
      lastFootstep = timestamp;
    }
  } catch (e) {
    console.error('Render loop error:', e);
  }
  requestAnimationFrame(renderLoop);
}

try { initLanding(); } catch(e) { console.error('Landing error:', e); }
