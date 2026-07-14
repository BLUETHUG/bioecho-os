// BioEcho OS v4 — Living World Experience

const world = new WorldV4(document.getElementById('world-canvas'));
let experienceReady = false;
let lastFrame = 0;

function initLanding() {
  const landing = document.getElementById('landing');
  const seedCanvas = document.getElementById('seed-canvas');
  const worldCanvas = document.getElementById('world-canvas');

  worldCanvas.width = window.innerWidth;
  worldCanvas.height = window.innerHeight;

  const seq = new LandingSequence(seedCanvas, worldCanvas);

  landing.addEventListener('click', () => {
    landing.style.pointerEvents = 'none';
    world.initialize();

    seq.start(() => {
      landing.classList.add('hidden');
      experienceReady = true;
      lastFrame = performance.now();
      requestAnimationFrame(renderLoop);
    });
  }, { once: true });

  // Draw initial seed pulse
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

function renderLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  LDL.currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  LDL.currentTime = LDL.getTimeOfDay(LDL.currentHour);

  world.update(dt, LDL.currentTime);
  world.render(LDL.currentTime, LDL.currentSeason || 'spring');

  requestAnimationFrame(renderLoop);
}

try { initLanding(); } catch(e) { console.error('Landing error:', e); }
