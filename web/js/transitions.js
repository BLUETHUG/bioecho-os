// BioEcho Transitions v4 — Organic Emergence & Vine-Growth

// Organic leaf-unfold easing (fast start, gentle settle)
function leafEase(t) { return 1 - Math.pow(1 - t, 4) * Math.cos(t * 1.2); }

// Vine growth path animation
function vinePath(startX, startY, endX, endY, progress) {
  const dx = endX - startX, dy = endY - startY;
  const cp1x = startX + dx * 0.2 + Math.sin(progress * 3) * 15;
  const cp1y = startY + dy * 0.1;
  const cp2x = startX + dx * 0.7 + Math.cos(progress * 2.5) * 10;
  const cp2y = startY + dy * 0.8;
  return {
    x: cubicBezier(startX, cp1x, cp2x, endX, progress),
    y: cubicBezier(startY, cp1y, cp2y, endY, progress)
  };
}

function cubicBezier(a, b, c, d, t) {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

class PanelUnfurl {
  constructor(panel, originX, originY) {
    this.panel = panel;
    this.ox = originX;
    this.oy = originY;
    this.progress = 0;
    this.active = false;
    this.duration = 1.2;
    this.vinePoints = [];
  }

  open() {
    if (this.active) return;
    this.active = true;
    this.progress = 0;
    this.vinePoints = this._generateVine();
    this.panel.classList.add('unfurling');
    this.panel.style.opacity = '0';
    this._animate();
  }

  close() {
    this.active = false;
    this.progress = 0;
    this.panel.style.opacity = '0';
    this.panel.style.transform = `scale(0.8) translateY(20px)`;
    this.panel.classList.remove('unfurling');
  }

  _generateVine() {
    const rect = this.panel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      pts.push(vinePath(this.ox, this.oy, cx, cy, i / 10));
    }
    return pts;
  }

  _animate() {
    if (!this.active) return;
    this.progress += 0.016 / this.duration;
    if (this.progress >= 1) {
      this.progress = 1;
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'scale(1) translateY(0)';
      return;
    }

    const e = leafEase(this.progress);
    this.panel.style.opacity = e * 0.95;
    this.panel.style.transform = `scale(${0.85 + e * 0.15}) translateY(${(1 - e) * 30}px)`;

    // Draw vine growth on a temp canvas overlay
    const canvas = document.getElementById('vine-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = `rgba(111,163,111,${e * 0.25})`;
      ctx.lineWidth = 2 * e;
      ctx.beginPath();
      ctx.moveTo(this.ox, this.oy);
      const pts = this.vinePoints;
      for (let i = 1; i < pts.length && i / pts.length <= e; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Small leaf at tip
      const tip = pts[Math.floor(e * (pts.length - 1))] || pts[0];
      ctx.fillStyle = `rgba(111,163,111,${e * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(tip.x, tip.y, 6 * e, 3 * e, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(() => this._animate());
  }
}

// Bark-like panel wrapper
class BarkPanel {
  static init() {
    const canvas = document.createElement('canvas');
    canvas.id = 'vine-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:199;pointer-events:none;';
    document.body.appendChild(canvas);
  }

  static frame(opacity) {
    return `
      border: 1px solid rgba(111,163,111,${0.03 + opacity * 0.04});
      border-radius: ${16 + opacity * 12}px;
      background: rgba(15,61,46,${0.06 + opacity * 0.04});
      backdrop-filter: blur(${12 + opacity * 28}px) saturate(1.2);
      -webkit-backdrop-filter: blur(${12 + opacity * 28}px) saturate(1.2);
      box-shadow:
        inset 0 1px 0 rgba(245,240,232,${opacity * 0.04}),
        0 ${8 + opacity * 16}px ${32 + opacity * 48}px rgba(15,30,20,${0.04 + opacity * 0.16}),
        0 0 0 1px rgba(110,88,67,${opacity * 0.02});
    `;
  }
}