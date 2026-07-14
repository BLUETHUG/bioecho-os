// BioEcho Chart Engine — Scientific instrument-style real-time rendering

class WaveformChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0; this.height = 0;
    this.data = [];
    this.maxPoints = 600;
    this.yMin = -10; this.yMax = 10;
    this.autoScale = true;
    this.spikes = [];
    this.threshold = 0;
    this.filteredData = [];
    this.bgColor = '#0a0e14';
    this.gridColor = '#141a24';
    this.gridLineColor = '#1a2233';
    this.waveColor = '#22c55e';
    this.waveFilteredColor = '#3b82f6';
    this.spikeColor = '#ef4444';
    this.thresholdColor = 'rgba(245,158,11,0.25)';
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.width = r.width - 8;
    this.height = r.height - 8;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  push(raw, filtered) {
    this.data.push(raw);
    this.filteredData.push(filtered);
    if (this.data.length > this.maxPoints) { this.data.shift(); this.filteredData.shift(); }
  }

  addSpike(index, amplitude) {
    this.spikes.push({ index, amplitude, age: 0 });
    if (this.spikes.length > 50) this.spikes.shift();
  }

  setThreshold(t) { this.threshold = t; }

  clear() { this.data = []; this.filteredData = []; this.spikes = []; }

  render() {
    const { ctx, width: w, height: h, data, filteredData } = this;
    if (w < 10 || h < 10) return;

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    const len = data.length;
    if (len < 2) { this._drawAxes(ctx, w, h); return; }

    // Auto-scale
    if (this.autoScale) {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < len; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
      const pad = Math.max((max - min) * 0.15, 1);
      this.yMin = min - pad;
      this.yMax = max + pad;
      if (this.yMax - this.yMin < 2) { this.yMin = -1; this.yMax = 1; }
    }

    const yRange = this.yMax - this.yMin;
    const tY = (v) => h - ((v - this.yMin) / yRange) * h;
    const tX = (i) => (i / this.maxPoints) * w;

    // Grid
    this._drawGrid(ctx, w, h, tY, yRange);

    // Threshold
    if (this.threshold > 0) {
      ctx.strokeStyle = this.thresholdColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, tY(this.threshold)); ctx.lineTo(w, tY(this.threshold)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, tY(-this.threshold)); ctx.lineTo(w, tY(-this.threshold)); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Spike markers
    for (const s of this.spikes) {
      const xi = tX(s.index % this.maxPoints);
      if (xi > 0 && xi < w) {
        ctx.strokeStyle = 'rgba(239,68,68,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xi, 0); ctx.lineTo(xi, h); ctx.stroke();
        ctx.fillStyle = this.spikeColor;
        ctx.beginPath(); ctx.arc(xi, tY(s.amplitude), 2.5, 0, Math.PI * 2); ctx.fill();
      }
      s.age++;
    }
    this.spikes = this.spikes.filter(s => s.age < this.maxPoints);

    // Raw waveform (dim)
    ctx.strokeStyle = 'rgba(34,197,94,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = tX(i + this.maxPoints - len);
      const y = tY(data[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Filtered waveform (primary)
    ctx.strokeStyle = this.waveFilteredColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = tX(i + this.maxPoints - len);
      const y = tY(filteredData[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    this._drawAxes(ctx, w, h);
  }

  _drawGrid(ctx, w, h, tY, yRange) {
    ctx.strokeStyle = this.gridLineColor;
    ctx.lineWidth = 0.5;
    // Horizontal grid (voltage)
    const nLines = 6;
    for (let i = 0; i <= nLines; i++) {
      const y = h * i / nLines;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      // Voltage label
      const v = this.yMax - (yRange * i / nLines);
      ctx.fillStyle = '#3a4558';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(v.toFixed(1), 4, y - 2);
    }
    // Vertical grid (time)
    const nVLines = 5;
    for (let i = 0; i <= nVLines; i++) {
      const x = w * i / nVLines;
      ctx.strokeStyle = this.gridLineColor;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      // Time label (seconds ago)
      const secAgo = ((nVLines - i) / nVLines * (this.maxPoints / 250)).toFixed(1);
      ctx.fillStyle = '#3a4558';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(secAgo + 's', x, h - 4);
    }
  }

  _drawAxes(ctx, w, h) {
    // Zero line
    if (this.yMin < 0 && this.yMax > 0) {
      const zeroY = h - ((0 - this.yMin) / (this.yMax - this.yMin)) * h;
      ctx.strokeStyle = '#2a3548';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
    }
  }
}

class SpectrogramChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0; this.height = 0;
    this.spectrum = [];
    this.maxRows = 300;
    this.maxFreq = 50;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.width = r.width - 8;
    this.height = r.height - 8;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  pushFrame(freqs) {
    this.spectrum.push(freqs);
    if (this.spectrum.length > this.maxRows) this.spectrum.shift();
  }

  render() {
    const { ctx, width: w, height: h, spectrum } = this;
    if (w < 10 || h < 10) return;

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);
    if (spectrum.length < 2) return;

    const rows = spectrum.length;
    const cols = spectrum[0].length;

    for (let x = 0; x < w; x++) {
      const rowIdx = Math.floor((rows - 1) * (1 - x / w));
      if (rowIdx < 0 || rowIdx >= rows) continue;
      const row = spectrum[rowIdx];

      for (let y = 0; y < h; y++) {
        const binIdx = Math.floor((y / h) * row.length);
        if (binIdx >= row.length) continue;
        const power = Math.min(1, Math.max(0, row[binIdx] / 80));

        const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
        // Scientific colormap: black → dark blue → teal → yellow → red
        if (power < 0.01) {
          ctx.fillStyle = '#0a0e14';
        } else if (power < 0.15) {
          const t = power / 0.15;
          ctx.fillStyle = `rgb(${Math.floor(t*15)},${Math.floor(t*30)},${Math.floor(20+t*40)})`;
        } else if (power < 0.4) {
          const t = (power - 0.15) / 0.25;
          ctx.fillStyle = `rgb(${Math.floor(t*20)},${Math.floor(80+t*40)},${Math.floor(60+t*30)})`;
        } else if (power < 0.7) {
          const t = (power - 0.4) / 0.3;
          ctx.fillStyle = `rgb(${Math.floor(20+t*180)},${Math.floor(120-t*20)},${Math.floor(90-t*60)})`;
        } else {
          const t = (power - 0.7) / 0.3;
          ctx.fillStyle = `rgb(${Math.floor(200+t*55)},${Math.floor(100-t*80)},${Math.floor(30-t*20)})`;
        }
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }
    }

    // Frequency axis labels
    ctx.fillStyle = '#3a4558';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    const nLabels = 5;
    for (let i = 0; i <= nLabels; i++) {
      const y = h * i / nLabels;
      const freq = (this.maxFreq - this.maxFreq * i / nLabels).toFixed(0);
      ctx.fillText(freq + 'Hz', 4, y - 2);
    }
  }
}

class SpikeChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.width = 0; this.height = 0;
    this.data = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.width = r.width - 8;
    this.height = r.height - 24;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setData(d) { this.data = d || []; }

  render() {
    const { ctx, width: w, height: h, data } = this;
    if (w < 10 || h < 10) return;

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);
    if (data.length < 2) return;

    let min = Infinity, max = -Infinity;
    for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
    const pad = Math.max((max - min) * 0.2, 0.5);
    min -= pad; max += pad;
    const range = max - min;

    // Zero line
    if (min < 0 && max > 0) {
      const zeroY = h - ((0 - min) / range) * h;
      ctx.strokeStyle = '#2a3548';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY); ctx.stroke();
    }

    // Spike waveform
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const y = h - ((data[i] - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Peak marker
    let peakIdx = 0, peakVal = 0;
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > Math.abs(peakVal)) { peakIdx = i; peakVal = data[i]; }
    }
    const px = (peakIdx / data.length) * w;
    const py = h - ((peakVal - min) / range) * h;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  }
}
