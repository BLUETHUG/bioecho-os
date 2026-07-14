// BioEcho Chart Engine — Real-time canvas-based waveform rendering

class ChartEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.options = Object.assign({
      bgColor: '#0a0e14', gridColor: '#111820', waveColor: '#00d4aa',
      lineWidth: 1.5, autoScale: true, maxPoints: 500, yRange: null,
      showSpikes: true, spikeColor: '#ff4444', thresholdColor: '#ff880044'
    }, options);
    this.data = [];
    this.spikes = [];
    this.threshold = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  push(value) {
    this.data.push(value);
    if (this.data.length > this.options.maxPoints) this.data.shift();
  }

  setThreshold(t) { this.threshold = t; }

  addSpike(spike) {
    this.spikes.push(spike);
    if (this.spikes.length > 100) this.spikes.shift();
  }

  clear() { this.data = []; this.spikes = []; }

  render() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const data = this.data;
    const len = data.length;
    if (len < 2) return;

    // Auto-scale Y range
    let yMin = -10, yMax = 10;
    if (this.options.autoScale) {
      yMin = Math.min(...data) * 1.2;
      yMax = Math.max(...data) * 1.2;
      if (yMax - yMin < 5) { yMin = -5; yMax = 5; }
    } else if (this.options.yRange) {
      yMin = this.options.yRange[0]; yMax = this.options.yRange[1];
    }

    // Clear
    ctx.fillStyle = this.options.bgColor;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 0.5;
    const nGridY = 5;
    for (let i = 0; i <= nGridY; i++) {
      const y = h * i / nGridY;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Threshold lines
    if (this.threshold > 0 && yMax - yMin > 0) {
      const threshY = h - ((this.threshold - yMin) / (yMax - yMin)) * h;
      const negThreshY = h - ((-this.threshold - yMin) / (yMax - yMin)) * h;
      ctx.strokeStyle = this.options.thresholdColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, threshY); ctx.lineTo(w, threshY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, negThreshY); ctx.lineTo(w, negThreshY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Waveform
    ctx.strokeStyle = this.options.waveColor;
    ctx.lineWidth = this.options.lineWidth;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = (i / len) * w;
      const y = h - ((data[i] - yMin) / (yMax - yMin)) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Spike markers
    if (this.options.showSpikes) {
      for (const spike of this.spikes) {
        const x = ((spike.sampleIndex || spike.index || 0) / this.options.maxPoints) * w;
        if (x > 0 && x < w) {
          ctx.fillStyle = this.options.spikeColor;
          ctx.beginPath();
          ctx.arc(x, 0, 3, 0, 2 * Math.PI);
          ctx.fill();
          // Vertical line
          ctx.strokeStyle = this.options.spikeColor + '44';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
      }
    }
  }
}

class SpectrogramEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0; this.height = 0;
    this.fftSize = 128;
    this.spectrum = []; // rows of frequency bins
    this.maxFreq = 50; // Hz (for plant signals)
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  pushFrame(freqs) {
    this.spectrum.push(freqs);
    if (this.spectrum.length > this.width) this.spectrum.shift();
  }

  render() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const rows = this.spectrum;
    if (rows.length < 2) return;

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let x = 0; x < w; x++) {
      const rowIdx = Math.floor((rows.length - 1) * (1 - x / w));
      if (rowIdx < 0 || rowIdx >= rows.length) continue;
      const row = rows[rowIdx];
      for (let y = 0; y < h; y++) {
        const binIdx = Math.floor((y / h) * row.length);
        if (binIdx >= row.length) continue;
        const power = Math.min(1, Math.max(0, row[binIdx] / 100));
        const idx = (y * w + x) * 4;
        // Heatmap colormap: black → blue → cyan → yellow → red
        if (power < 0.01) {
          data[idx] = 10; data[idx+1] = 14; data[idx+2] = 20;
        } else if (power < 0.2) {
          data[idx] = 0; data[idx+1] = power * 5 * 80; data[idx+2] = 80 + power * 5 * 80;
        } else if (power < 0.5) {
          const t = (power - 0.2) / 0.3;
          data[idx] = 0; data[idx+1] = 200 - t * 100; data[idx+2] = 200 - t * 100;
        } else {
          const t = (power - 0.5) / 0.5;
          data[idx] = 100 + t * 155; data[idx+1] = 100 - t * 100; data[idx+2] = 20;
        }
        data[idx+3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

class MiniChart {
  constructor(canvasId, color = '#00d4aa', maxPoints = 100) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.data = [];
    this.color = color;
    this.maxPoints = maxPoints;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  push(value) {
    this.data.push(value);
    if (this.data.length > this.maxPoints) this.data.shift();
  }

  render() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const data = this.data;
    if (data.length < 2) { ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, w, h); return; }
    const min = Math.min(...data) * 0.9, max = Math.max(...data) * 1.1;
    const range = Math.max(max - min, 0.1);
    ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = this.color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const y = h - ((data[i] - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
