// BioEcho Sound Engine — Procedural Ambient Audio
// Tiny sounds. Leaf rustle. Footsteps. Birds. Water. Distant thunder.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.currentAmbient = null;
    this.volume = 0.3;
  }

  async initialize() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.4;
      this.ambientGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
      this.enabled = true;
      return true;
    } catch { return false; }
  }

  async resume() {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  setVolume(v) { this.volume = v; if (this.masterGain) this.masterGain.gain.value = v; }

  playNote(freq, duration, type) {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (duration || 0.5));
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + (duration || 0.5));
  }

  playLeafRustle() {
    if (!this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  playWaterDrop() {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playBirdChirp() {
    if (!this.enabled) return;
    const baseFreq = 2000 + Math.random() * 2000;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq + Math.random() * 500, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      }, i * 120);
    }
  }

  playPulse() {
    if (!this.enabled) return;
    this.playNote(220, 0.8, 'sine');
    setTimeout(() => this.playNote(330, 0.6, 'sine'), 100);
  }

  playGrowth() {
    if (!this.enabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 2);
  }

  async startAmbient(type) {
    if (!this.enabled) return;
    this.stopAmbient();
    if (type === 'birds' || type === 'birds_morning' || type === 'birds_dawn' || type === 'birds_noon') {
      this.currentAmbient = setInterval(() => {
        if (Math.random() < 0.3) this.playBirdChirp();
      }, 3000 + Math.random() * 5000);
    } else if (type === 'crickets' || type === 'night_ambient') {
      this.currentAmbient = setInterval(() => {
        this.playNote(4000 + Math.random() * 1000, 0.1, 'sine');
      }, 200 + Math.random() * 300);
    } else if (type === 'water') {
      this.currentAmbient = setInterval(() => {
        if (Math.random() < 0.2) this.playWaterDrop();
      }, 2000 + Math.random() * 4000);
    }
  }

  stopAmbient() { if (this.currentAmbient) { clearInterval(this.currentAmbient); this.currentAmbient = null; } }

  playWindGust() {
    if (!this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / bufferSize * Math.PI) * 0.3;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.04;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  playFootstep() {
    if (!this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600 + Math.random() * 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.03 + Math.random() * 0.02;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  getStats() { return { enabled: this.enabled, volume: this.volume, ambient: !!this.currentAmbient }; }
}
