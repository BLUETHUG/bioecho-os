// BioEcho World v5 — 360° Immersive Living Ecosystem
// Parallax depth, procedural infinite world, camera-responsive

class WorldV4 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.wind = { strength: 0.5, target: 0.5, gust: 0, gustTimer: 0 };
    this.mouseX = -1;
    this.mouseY = -1;

    this.sectorSize = 800;
    this.chunks = {};
    this.renderDistance = 3;

    this.clouds = [];
    this.particles = [];
    this.rain = [];
    this.isRaining = false;
    this.rainTimer = 0;

    this.treeWorldX = 0;
    this.treeWorldZ = 0;
  }

  initialize() {
    this.resize();
    this._generateChunks(0, 0);
    this._generateClouds();
  }

  resize() {
    this.w = this.canvas.width = window.innerWidth;
    this.h = this.canvas.height = window.innerHeight;
  }

  _generateChunks(cx, cz) {
    for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
      for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        if (!this.chunks[key]) {
          this.chunks[key] = this._generateChunk(cx + dx, cz + dz);
        }
      }
    }
  }

  _generateChunk(cx, cz) {
    const seed = cx * 7919 + cz * 104729;
    const hash = (n) => { n = ((n >> 13) ^ n) * 1274126177; return ((n >> 16) ^ n) / 2147483648; };
    const sx = cx * this.sectorSize;
    const sz = cz * this.sectorSize;

    const trees = [];
    for (let i = 0; i < 12; i++) {
      const tx = sx + hash(seed + i * 31) * this.sectorSize;
      const tz = sz + hash(seed + i * 47 + 100) * this.sectorSize;
      const h = 60 + hash(seed + i * 67) * 120;
      const w = 8 + hash(seed + i * 89) * 12;
      const canopyR = 18 + hash(seed + i * 103) * 25;
      const type = hash(seed + i * 113) > 0.3 ? 'deciduous' : 'conifer';
      trees.push({ x: tx, z: tz, h, w, canopyR, type, sway: hash(seed + i * 127) * 6.28 });
    }

    const grass = [];
    for (let i = 0; i < 200; i++) {
      grass.push({
        x: sx + hash(seed + i * 131) * this.sectorSize,
        z: sz + hash(seed + i * 139) * this.sectorSize,
        h: 3 + hash(seed + i * 149) * 15,
        phase: hash(seed + i * 151) * 6.28
      });
    }

    const flowers = [];
    for (let i = 0; i < 20; i++) {
      flowers.push({
        x: sx + hash(seed + i * 157) * this.sectorSize,
        z: sz + hash(seed + i * 163) * this.sectorSize,
        size: 2 + hash(seed + i * 167) * 4,
        phase: hash(seed + i * 173) * 6.28,
        color: ['#D4A0D4', '#E7A95A', '#BFDFF6', '#6FA36F', '#F5F0E8'][Math.floor(hash(seed + i * 179) * 5)],
        petals: 4 + Math.floor(hash(seed + i * 181) * 3),
        bloom: 1, bloomTarget: 1
      });
    }

    const rocks = [];
    for (let i = 0; i < 8; i++) {
      rocks.push({
        x: sx + hash(seed + i * 191) * this.sectorSize,
        z: sz + hash(seed + i * 193) * this.sectorSize,
        size: 5 + hash(seed + i * 197) * 20,
        color: `rgba(${40 + hash(seed + i * 199) * 30},${35 + hash(seed + i * 211) * 25},${30 + hash(seed + i * 223) * 20},0.4)`
      });
    }

    return { trees, grass, flowers, rocks };
  }

  _generateClouds() {
    this.clouds = [];
    for (let i = 0; i < 25; i++) {
      this.clouds.push({
        x: Math.random() * 3000 - 500,
        y: 30 + Math.random() * 150,
        z: Math.random() * 3000 - 500,
        w: 80 + Math.random() * 200,
        h: 15 + Math.random() * 35,
        speed: 0.02 + Math.random() * 0.06,
        opacity: 0.06 + Math.random() * 0.08
      });
    }
  }

  update(dt, timeOfDay) {
    this.time += dt;

    this.wind.gustTimer += dt;
    if (this.wind.gustTimer > 3 + Math.random() * 8) {
      this.wind.target = 0.3 + Math.random() * 0.7;
      this.wind.gustTimer = 0;
    }
    this.wind.strength += (this.wind.target - this.wind.strength) * 0.02;
    this.wind.gust = Math.sin(this.time * 0.5) * 0.2 * this.wind.strength;

    for (const c of this.clouds) {
      c.x += c.speed * (1 + this.wind.strength * 0.3);
      if (c.x > 2500) c.x = -500;
    }

    if (Math.random() < 0.02) {
      this.particles.push({
        x: (Math.random() - 0.5) * 1000,
        y: 50 + Math.random() * 200,
        z: (Math.random() - 0.5) * 1000,
        vx: (Math.random() - 0.5) * 0.5 + this.wind.gust * 0.3,
        vy: -0.05 + Math.random() * 0.15,
        vz: (Math.random() - 0.5) * 0.5,
        life: 1,
        type: ['pollen', 'seed', 'dust'][Math.floor(Math.random() * 3)],
        size: 1 + Math.random() * 3
      });
    }
    this.particles = this.particles.filter(p => {
      p.x += p.vx + this.wind.gust * 0.2;
      p.y += p.vy;
      p.z += p.vz;
      p.life -= 0.003;
      return p.life > 0 && p.y > 0;
    });

    this.rainTimer += dt;
    if (!this.isRaining && this.rainTimer > 40 + Math.random() * 80) {
      this.isRaining = true;
      this.rainTimer = 0;
    }
    if (this.isRaining && this.rainTimer > 5 + Math.random() * 10) {
      this.isRaining = false;
      this.rainTimer = 0;
    }
    if (this.isRaining) {
      for (let i = 0; i < 4; i++) {
        this.rain.push({
          x: (Math.random() - 0.5) * 1500,
          y: 400 + Math.random() * 200,
          z: (Math.random() - 0.5) * 1500,
          speed: 8 + Math.random() * 6,
          length: 12 + Math.random() * 18
        });
      }
    }
    this.rain = this.rain.filter(r => {
      r.y -= r.speed;
      r.x += this.wind.gust * 0.8;
      return r.y > 0;
    });
  }

  render(timeOfDay, season, camera) {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.w, H = this.h;
    const tod = LDL.timeOfDay[timeOfDay] || LDL.timeOfDay.noon;

    ctx.clearRect(0, 0, W, H);

    this._sky(ctx, W, H, tod);
    this._stars(ctx, W, H, tod, camera);
    this._celestial(ctx, W, H, tod, camera);
    this._clouds(ctx, W, H, tod, camera);
    this._rays(ctx, W, H, tod, camera);

    this._renderGround(ctx, W, H, tod, season, camera);
    this._renderChunks(ctx, W, H, tod, season, camera);

    this._renderParticles(ctx, W, H, tod, camera);
    this._renderRain(ctx, W, H, tod, camera);
    this._fog(ctx, W, H, tod, camera);
    this._vignette(ctx, W, H, tod);

    if (this.mouseX >= 0) {
      const g = ctx.createRadialGradient(this.mouseX, this.mouseY, 0, this.mouseX, this.mouseY, 80);
      g.addColorStop(0, `rgba(231,169,90,${0.04 * tod.ambient})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.mouseX, this.mouseY, 80, 0, 6.28); ctx.fill();
    }
  }

  _sky(ctx, W, H, tod) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tod.skyTop);
    g.addColorStop(0.35, tod.skyMid);
    g.addColorStop(1, tod.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  _stars(ctx, W, H, tod, camera) {
    if (tod.ambient > 0.5) return;
    const a = Math.max(0, (0.5 - tod.ambient) * 2.5);
    ctx.save();
    const parallax = camera.getParallax(0.01);
    for (let i = 0; i < 120; i++) {
      const sx = ((i * 137.5 + parallax.x * 0.01) % W + W) % W;
      const sy = ((i * 97.3 + parallax.y * 0.01) % (H * 0.5) + H * 0.5) % (H * 0.5);
      const tw = Math.sin(this.time * (0.5 + i * 0.01) + i) * 0.4 + 0.6;
      ctx.globalAlpha = a * tw * 0.7;
      ctx.fillStyle = '#F5F0E8';
      ctx.beginPath();
      ctx.arc(sx, sy, 0.5 + (i % 3) * 0.5, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _celestial(ctx, W, H, tod, camera) {
    const parallax = camera.getParallax(0.005);
    if (tod.ambient >= 0.15) {
      const hour = new Date().getHours() + new Date().getMinutes() / 60;
      const sunAngle = (hour / 24) * Math.PI;
      const sx = W * 0.5 + Math.cos(sunAngle) * W * 0.35 + parallax.x * 0.02;
      const sy = H * 0.08 + Math.sin(sunAngle) * H * -0.15 + parallax.y * 0.02;
      const r = 25 + tod.ambient * 15;
      ctx.save();
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 5);
      g.addColorStop(0, `rgba(231,169,90,${0.25 * tod.ambient})`);
      g.addColorStop(0.3, `rgba(231,169,90,${0.08 * tod.ambient})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r * 5, 0, 6.28); ctx.fill();
      ctx.globalAlpha = tod.ambient * 0.9;
      ctx.fillStyle = '#E7A95A';
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.4, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    if (tod.ambient < 0.4) {
      const mx = W * 0.78 + parallax.x * 0.015, my = H * 0.1 + parallax.y * 0.015;
      const a = Math.max(0, (0.4 - tod.ambient) * 2.5);
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 50);
      g.addColorStop(0, 'rgba(217,227,236,0.15)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mx, my, 50, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#D9E3EC';
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, 6.28); ctx.fill();
      ctx.fillStyle = tod.skyTop;
      ctx.beginPath(); ctx.arc(mx + 3, my - 1, 10, 0, 6.28); ctx.fill();
      ctx.restore();
    }
  }

  _rays(ctx, W, H, tod, camera) {
    if (tod.ambient < 0.25) return;
    const parallax = camera.getParallax(0.005);
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const sunAngle = (hour / 24) * Math.PI;
    const sx = W * 0.5 + Math.cos(sunAngle) * W * 0.35 + parallax.x * 0.02;
    const sy = H * 0.08 + Math.sin(sunAngle) * H * -0.15 + parallax.y * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.025 * tod.ambient;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 0.5 + 0.15;
      const len = 280 + Math.sin(this.time * 0.1 + i * 0.7) * 50;
      const sp = 12 + Math.sin(this.time * 0.18 + i) * 4;
      ctx.fillStyle = 'rgba(231,169,90,0.08)';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle - 0.01) * len, sy + Math.sin(angle - 0.01) * len);
      ctx.lineTo(sx + Math.cos(angle + 0.01) * len + sp, sy + Math.sin(angle + 0.01) * len + sp);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  _clouds(ctx, W, H, tod, camera) {
    ctx.save();
    const night = tod.ambient < 0.3;
    for (const c of this.clouds) {
      const proj = camera.project(c.x, c.y, c.z, W, H);
      if (!proj || proj.z > 800) continue;
      const depth = Math.min(1, proj.z / 800);
      ctx.globalAlpha = c.opacity * (night ? 0.2 : 1) * (1 - depth * 0.3);
      const col = night ? '40,40,60' : '245,240,232';
      const s = proj.scale * 2;
      ctx.fillStyle = `rgba(${col},0.35)`;
      ctx.beginPath(); ctx.ellipse(proj.x, proj.y, c.w * s, c.h * s, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(proj.x - c.w * 0.2 * s, proj.y + 5, c.w * 0.3 * s, c.h * 0.3 * s, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.ellipse(proj.x + c.w * 0.25 * s, proj.y + 3, c.w * 0.35 * s, c.h * 0.35 * s, 0, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  _renderGround(ctx, W, H, tod, season, camera) {
    const horizonY = H * 0.55;
    const parallax = camera.getParallax(0.1);

    const mColors = [
      `rgba(15,61,46,${0.1 * tod.ambient})`,
      `rgba(15,61,46,${0.15 * tod.ambient})`,
      `rgba(62,107,72,${0.1 * tod.ambient})`
    ];
    const mFreqs = [0.002, 0.004, 0.006];
    const mAmps = [35, 25, 18];
    const mYs = [0.48, 0.53, 0.58];

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = mColors[i];
      ctx.beginPath();
      const mY = H * mYs[i] + parallax.y * (0.3 + i * 0.1);
      ctx.moveTo(-50, H);
      ctx.lineTo(-50, mY);
      for (let x = -50; x <= W + 50; x += 6) {
        const wx = x + parallax.x * (0.3 + i * 0.1);
        const y = mY + Math.sin(wx * mFreqs[i]) * mAmps[i] + Math.sin(wx * mFreqs[i] * 2.7) * mAmps[i] * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 50, H);
      ctx.fill();
    }

    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    const gc = season === 'winter' ? '58,42,26' : season === 'autumn' ? '82,58,35' : '42,72,42';
    groundGrad.addColorStop(0, `rgba(${gc},${0.2 * tod.ambient})`);
    groundGrad.addColorStop(0.5, `rgba(${gc},${0.35 * tod.ambient})`);
    groundGrad.addColorStop(1, `rgba(${gc},${0.5 * tod.ambient})`);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  _renderChunks(ctx, W, H, tod, season, camera) {
    const groundY = H * 0.65;
    const palettes = {
      spring: ['#2A5A3A', '#3E6B48', '#6FA36F', '#8BC48B'],
      summer: ['#1A4A2A', '#2A5A3A', '#3E6B48', '#4A7A4A'],
      autumn: ['#6E5843', '#8A6A4A', '#A07848', '#C49A6C'],
      winter: ['#3A2A1A', '#4A3A2A', '#2A1A0A']
    };
    const treeColors = palettes[season] || palettes.spring;

    const cx = Math.floor(camera.x / this.sectorSize);
    const cz = Math.floor(camera.z / this.sectorSize);
    this._generateChunks(cx, cz);

    const allObjects = [];

    for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
      for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
        const key = `${cx + dx},${cz + dz}`;
        const chunk = this.chunks[key];
        if (!chunk) continue;

        for (const tree of chunk.trees) {
          const proj = camera.project(tree.x, 0, tree.z, W, H);
          if (proj && proj.z > 0 && proj.z < 600) {
            allObjects.push({ type: 'tree', obj: tree, proj, depth: proj.z });
          }
        }
        for (const rock of chunk.rocks) {
          const proj = camera.project(rock.x, 0, rock.z, W, H);
          if (proj && proj.z > 0 && proj.z < 600) {
            allObjects.push({ type: 'rock', obj: rock, proj, depth: proj.z });
          }
        }
        for (const f of chunk.flowers) {
          const proj = camera.project(f.x, 0, f.z, W, H);
          if (proj && proj.z > 0 && proj.z < 400) {
            allObjects.push({ type: 'flower', obj: f, proj, depth: proj.z });
          }
        }
        for (const g of chunk.grass) {
          const proj = camera.project(g.x, 0, g.z, W, H);
          if (proj && proj.z > 0 && proj.z < 300) {
            allObjects.push({ type: 'grass', obj: g, proj, depth: proj.z });
          }
        }
      }
    }

    allObjects.sort((a, b) => b.depth - a.depth);

    for (const item of allObjects) {
      switch (item.type) {
        case 'tree': this._drawTree(ctx, item.obj, item.proj, tod, treeColors); break;
        case 'rock': this._drawRock(ctx, item.obj, item.proj, tod); break;
        case 'flower': this._drawFlower(ctx, item.obj, item.proj, tod); break;
        case 'grass': this._drawGrass(ctx, item.obj, item.proj, tod, season); break;
      }
    }
  }

  _drawTree(ctx, tree, proj, tod, colors) {
    const s = proj.scale;
    const sway = Math.sin(this.time * 0.8 + tree.sway) * 3 * this.wind.strength;
    const alpha = Math.min(1, (1 - proj.z / 600) * 1.5) * tod.ambient;

    const baseY = proj.y;
    const trunkH = tree.h * s;

    const tg = ctx.createLinearGradient(proj.x, baseY, proj.x, baseY - trunkH);
    tg.addColorStop(0, `rgba(42,26,10,${alpha * 0.7})`);
    tg.addColorStop(1, `rgba(60,40,20,${alpha * 0.5})`);
    ctx.fillStyle = tg;
    const tw = tree.w * s;
    ctx.beginPath();
    ctx.moveTo(proj.x - tw * 0.5, baseY);
    ctx.lineTo(proj.x - tw * 0.3 + sway, baseY - trunkH);
    ctx.lineTo(proj.x + tw * 0.3 + sway, baseY - trunkH);
    ctx.lineTo(proj.x + tw * 0.5, baseY);
    ctx.fill();

    if (tree.type === 'deciduous') {
      for (let l = 0; l < 3; l++) {
        const r = tree.canopyR * s * (1 - l * 0.15);
        const ly = baseY - trunkH - l * 6 * s;
        ctx.fillStyle = colors[l % colors.length];
        ctx.globalAlpha = alpha * (0.5 - l * 0.06);
        ctx.beginPath();
        ctx.arc(proj.x + sway + l * 1.5, ly, r, 0, 6.28);
        ctx.fill();
      }
    } else {
      for (let l = 0; l < 3; l++) {
        const lw = tree.canopyR * s * (1.1 - l * 0.25);
        const ly = baseY - trunkH * 0.35 - l * trunkH * 0.2;
        ctx.fillStyle = `rgba(26,74,42,${alpha * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(proj.x + sway * (1 - l * 0.15), ly - trunkH * 0.2);
        ctx.lineTo(proj.x - lw, ly);
        ctx.lineTo(proj.x + lw, ly);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawRock(ctx, rock, proj, tod) {
    const s = proj.scale;
    const alpha = Math.min(1, (1 - proj.z / 600) * 1.5) * tod.ambient;
    ctx.fillStyle = rock.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.y, rock.size * s, rock.size * s * 0.5, 0, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawFlower(ctx, flower, proj, tod) {
    const s = proj.scale;
    const alpha = Math.min(1, (1 - proj.z / 400) * 2) * tod.ambient;
    const sway = Math.sin(this.time * 1.1 + flower.phase) * 1.5 * this.wind.strength;
    const bloom = flower.bloom;

    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = flower.color;
    for (let p = 0; p < flower.petals; p++) {
      const a = (p / flower.petals) * 6.28 + this.time * 0.05;
      const r = flower.size * s * bloom;
      ctx.beginPath();
      ctx.ellipse(proj.x + sway + Math.cos(a) * r * 0.4, proj.y + Math.sin(a) * r * 0.4, r * 0.35, r * 0.18, a, 0, 6.28);
      ctx.fill();
    }
    ctx.fillStyle = '#E7A95A';
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(proj.x + sway, proj.y, flower.size * s * 0.2, 0, 6.28);
    ctx.fill();
    ctx.restore();
  }

  _drawGrass(ctx, blade, proj, tod, season) {
    const s = proj.scale;
    const alpha = Math.min(1, (1 - proj.z / 300) * 3) * tod.ambient;
    const wind = Math.sin(this.time * 1.2 + blade.phase) * (2 + this.wind.gust * 5);
    const col = season === 'winter' ? '#4A3A2A' : season === 'autumn' ? '#7A5A3A' : '#4A7A4A';

    ctx.strokeStyle = col;
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 0.6 + s * 0.5;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    ctx.quadraticCurveTo(proj.x + wind * 0.5 * s, proj.y - blade.h * s * 0.5, proj.x + wind * s, proj.y - blade.h * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _renderParticles(ctx, W, H, tod, camera) {
    ctx.save();
    for (const p of this.particles) {
      const proj = camera.project(p.x, p.y, p.z, W, H);
      if (!proj || proj.z < 0 || proj.z > 500) continue;
      const alpha = p.life * 0.35 * tod.ambient * (1 - proj.z / 500);
      if (p.type === 'pollen') {
        ctx.fillStyle = '#E7A95A';
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, 6.28); ctx.fill();
      } else if (p.type === 'seed') {
        ctx.fillStyle = '#F5F0E8';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.ellipse(proj.x, proj.y, p.size * proj.scale * 0.5, p.size * proj.scale, Math.sin(this.time + p.x) * 0.3, 0, 6.28);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(245,240,232,0.4)';
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, p.size * proj.scale * 0.3, 0, 6.28); ctx.fill();
      }
    }
    ctx.restore();
  }

  _renderRain(ctx, W, H, tod, camera) {
    if (this.rain.length === 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(191,223,246,${0.2 * tod.ambient})`;
    ctx.lineWidth = 0.8;
    for (const r of this.rain) {
      const proj = camera.project(r.x, r.y, r.z, W, H);
      if (!proj || proj.z < 0 || proj.z > 500) continue;
      const alpha = (1 - proj.z / 500) * 0.2 * tod.ambient;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(proj.x + this.wind.gust * 2, proj.y + r.length * proj.scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  _fog(ctx, W, H, tod, camera) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const intensity = hour < 7 ? 0.3 : hour > 18 ? 0.2 : 0.04;
    if (intensity <= 0) return;
    for (let i = 0; i < 3; i++) {
      const fy = H * (0.45 + i * 0.12);
      const fh = H * 0.15;
      const g = ctx.createLinearGradient(0, fy, 0, fy + fh);
      const drift = Math.sin(this.time * 0.06 + i) * 20;
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, `rgba(191,223,246,${intensity * tod.ambient * (1 - i * 0.15)})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(drift, fy, W, fh);
    }
  }

  _vignette(ctx, W, H, tod) {
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.85);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, `rgba(10,20,15,${0.3 + (1 - tod.ambient) * 0.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  setMouse(x, y) { this.mouseX = x; this.mouseY = y; }
}
