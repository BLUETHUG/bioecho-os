// BioEcho Firefly — AI Embodiment Guide
// Not a chatbot. A glowing firefly that quietly helps.

class FireflyGuide {
  constructor(world, soundEngine) {
    this.world = world;
    this.sound = soundEngine;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.visible = false;
    this.phase = 0;
    this.glowIntensity = 0.8;
    this.message = null;
    this.messageTimeout = null;
    this.hints = [
      { trigger: 'first_visit', text: 'Welcome. Touch the tree to begin.', delay: 2000 },
      { trigger: 'no_organism', text: 'Select an organism to see its world.', delay: 5000 },
      { trigger: 'idle_30s', text: 'Try the Lens to identify plants around you.', delay: 30000 },
      { trigger: 'first_event', text: 'Your organism just spoke. Listen.', delay: 1000 },
      { trigger: 'stress_detected', text: 'Something is wrong. Check the readings.', delay: 2000 },
      { trigger: 'night', text: 'The garden rests. But the data never stops.', delay: 3000 },
      { trigger: 'morning', text: 'Dawn. Your plants are waking up.', delay: 2000 },
      { trigger: 'achievement', text: 'You just contributed to science.', delay: 3000 }
    ];
    this.shownHints = new Set();
    this.idleTimer = null;
    this._resetIdle();
  }

  _resetIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.showHint('idle_30s'), 30000);
  }

  async appear(x, y) {
    this.x = x || (this.world ? this.world.width * 0.8 : 100);
    this.y = y || (this.world ? this.world.height * 0.3 : 100);
    this.targetX = this.x;
    this.targetY = this.y;
    this.visible = true;
    this._startGlow();
    return this;
  }

  disappear() {
    this.visible = false;
    this.message = null;
  }

  moveTo(x, y, duration) {
    this.targetX = x;
    this.targetY = y;
    const dur = duration || 2000;
    const startX = this.x;
    const startY = this.y;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min(1, (now - startTime) / dur);
      const eased = LIL.easing.grow(progress);
      this.x = startX + (x - startX) * eased;
      this.y = startY + (y - startY) * eased;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  say(text, duration) {
    this.message = text;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => { this.message = null; }, duration || 5000);
    if (this.sound) this.sound.playNote(800, 0.15, 'sine');
  }

  showHint(hintId) {
    if (this.shownHints.has(hintId)) return;
    const hint = this.hints.find(h => h.trigger === hintId);
    if (!hint) return;
    this.shownHints.add(hintId);
    setTimeout(() => this.say(hint.text, 6000), hint.delay || 1000);
  }

  _startGlow() {
    const glow = () => {
      if (!this.visible) return;
      this.phase += 0.05;
      this.glowIntensity = 0.5 + Math.sin(this.phase) * 0.3;
      this.x += (this.targetX - this.x) * 0.03;
      this.y += (this.targetY - this.y) * 0.03;
      this.x += Math.sin(this.phase * 0.7) * 0.3;
      this.y += Math.cos(this.phase * 0.5) * 0.2;
      requestAnimationFrame(glow);
    };
    requestAnimationFrame(glow);
  }

  render(ctx) {
    if (!this.visible || !ctx) return;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 30);
    grad.addColorStop(0, `rgba(250,204,21,${this.glowIntensity})`);
    grad.addColorStop(0.4, `rgba(250,204,21,${this.glowIntensity * 0.4})`);
    grad.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
    ctx.fillStyle = `rgba(255,255,220,${this.glowIntensity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();

    if (this.message) {
      ctx.font = '13px Inter, sans-serif';
      const metrics = ctx.measureText(this.message);
      const tw = metrics.width + 20;
      const tx = this.x - tw / 2;
      const ty = this.y - 45;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(this.message, this.x, ty + 18);
      ctx.textAlign = 'start';
    }
  }

  onInteraction() { this._resetIdle(); }
  getStats() { return { visible: this.visible, message: this.message, shownHints: this.shownHints.size }; }
}
