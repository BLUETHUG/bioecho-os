// BioEcho Life Engine — Moments between interactions
// Bird lands. Butterfly crosses. Wind gusts. Flower opens. Nothing constant.

class LifeEngine {
  constructor(world) {
    this.world = world;
    this.moments = [];
    this.lastMoment = 0;
    this.momentInterval = 8000 + Math.random() * 12000;
    this.active = [];
  }

  update(dt) {
    this.lastMoment += dt * 1000;
    if (this.lastMoment > this.momentInterval) {
      this._triggerMoment();
      this.lastMoment = 0;
      this.momentInterval = 8000 + Math.random() * 12000;
    }
    this.active = this.active.filter(m => {
      m.age += dt;
      return m.age < m.duration;
    });
  }

  render(ctx) {
    for (const m of this.active) {
      const progress = m.age / m.duration;
      if (m.type === 'bird_land') this._renderBirdLand(ctx, m, progress);
      else if (m.type === 'butterfly') this._renderButterfly(ctx, m, progress);
      else if (m.type === 'wind_gust') this._renderWindGust(ctx, m, progress);
      else if (m.type === 'flower_open') this._renderFlowerOpen(ctx, m, progress);
      else if (m.type === 'leaf_fall') this._renderLeafFall(ctx, m, progress);
    }
  }

  _triggerMoment() {
    const types = ['bird_land', 'butterfly', 'wind_gust', 'flower_open', 'leaf_fall'];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = this.world.width;
    const h = this.world.height;

    const moment = {
      type, age: 0,
      duration: type === 'wind_gust' ? 2 : type === 'butterfly' ? 4 : 3,
      x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.3,
      startX: 0, startY: 0, endX: 0, endY: 0,
      phase: Math.random() * Math.PI * 2
    };

    if (type === 'bird_land') {
      moment.startX = -30;
      moment.startY = h * 0.2 + Math.random() * h * 0.2;
      moment.endX = w * 0.2 + Math.random() * w * 0.6;
      moment.endY = h * 0.35 + Math.random() * h * 0.15;
    } else if (type === 'butterfly') {
      moment.startX = Math.random() * w;
      moment.startY = h + 20;
      moment.endX = Math.random() * w;
      moment.endY = -20;
    } else if (type === 'wind_gust') {
      moment.x = 0;
      moment.strength = 0.5 + Math.random() * 0.5;
    } else if (type === 'flower_open') {
      moment.x = w * 0.15 + Math.random() * w * 0.7;
      moment.y = h * 0.6 + Math.random() * h * 0.1;
    } else if (type === 'leaf_fall') {
      moment.startX = Math.random() * w;
      moment.startY = -10;
      moment.endX = moment.startX + (Math.random() - 0.5) * 100;
      moment.endY = h + 10;
    }

    this.active.push(moment);
  }

  _renderBirdLand(ctx, m, p) {
    const ease = 1 - Math.pow(1 - p, 3);
    const x = m.startX + (m.endX - m.startX) * ease;
    const y = m.startY + (m.endY - m.startY) * ease - Math.sin(p * Math.PI) * 30;
    const wingY = p < 0.7 ? Math.sin(p * 15) * 5 : 0;
    ctx.strokeStyle = 'rgba(15,61,46,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + wingY);
    ctx.quadraticCurveTo(x - 2, y - 1, x, y);
    ctx.quadraticCurveTo(x + 2, y - 1, x + 6, y + wingY);
    ctx.stroke();
    if (p > 0.7) {
      ctx.fillStyle = 'rgba(15,61,46,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderButterfly(ctx, m, p) {
    const x = m.startX + Math.sin(p * Math.PI * 3 + m.phase) * 40;
    const y = m.startY + (m.endY - m.startY) * p;
    const wingAngle = Math.sin(p * 20) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = `rgba(231,169,90,${0.4 + Math.sin(p * 10) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(-4, 0, 5, 3, wingAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, 0, 5, 3, -wingAngle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(110,88,67,0.6)';
    ctx.fillRect(-0.5, -2, 1, 4);
    ctx.restore();
  }

  _renderWindGust(ctx, m, p) {
    const w = this.world.width;
    const intensity = Math.sin(p * Math.PI) * m.strength;
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    ctx.strokeStyle = 'rgba(191,223,246,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = this.world.height * 0.3 + i * 20;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + p * 10 + i) * 5 * intensity);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderFlowerOpen(ctx, m, p) {
    const ease = 1 - Math.pow(1 - p, 3);
    const petalCount = 5;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - p);
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const r = 6 * ease;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(212,160,212,0.4)' : 'rgba(231,169,90,0.3)';
      ctx.beginPath();
      ctx.ellipse(
        m.x + Math.cos(angle) * r,
        m.y + Math.sin(angle) * r,
        4 * ease, 2 * ease, angle, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  _renderLeafFall(ctx, m, p) {
    const x = m.startX + (m.endX - m.startX) * p + Math.sin(p * 8 + m.phase) * 15;
    const y = m.startY + (m.endY - m.startY) * p;
    const rot = p * 10 + m.phase;
    const colors = ['#8A6A4A', '#6FA36F', '#E7A95A', '#3E6B48'];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = colors[Math.floor(m.phase) % colors.length];
    ctx.globalAlpha = 0.6 * (1 - p * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getStats() { return { active: this.active.length }; }
}
