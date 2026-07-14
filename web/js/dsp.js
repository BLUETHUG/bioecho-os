// BioEcho DSP Engine — Real-time signal processing in JavaScript
// Ported from Rust bioecho-dsp crate for in-browser use

class Biquad {
  constructor(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
            - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
  reset() { this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; }
  static passthrough() { return new Biquad(1, 0, 0, 1, 0, 0); }
}

class BiquadCascade {
  constructor(sections) { this.sections = sections; }
  process(x) { return this.sections.reduce((y, s) => s.process(y), x); }
  reset() { this.sections.forEach(s => s.reset()); }
  static passthrough() { return new BiquadCascade([Biquad.passthrough()]); }
}

// Filter design functions — matches Rust crate
function butterHighpass(fc, fs) {
  const w0 = 2 * Math.PI * fc / fs;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / Math.SQRT2;
  const b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = (1 + cw) / 2;
  return new Biquad(b0, b1, b2, 1 + alpha, -2 * cw, 1 - alpha);
}

function butterBandpassSection(fcLo, fcHi, fs, q) {
  const fc = Math.sqrt(fcLo * fcHi);
  const w0 = 2 * Math.PI * fc / fs;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * q);
  return new Biquad(alpha, 0, -alpha, 1 + alpha, -2 * cw, 1 - alpha);
}

function butterNotch(fc, fs) {
  const w0 = 2 * Math.PI * fc / fs;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / 60;
  return new Biquad(1, -2 * cw, 1, 1 + alpha, -2 * cw, 1 - alpha);
}

class SpikeDetector {
  constructor(sampleRate, thresholdMult = 3.5, refractoryMs = 50) {
    this.sampleRate = sampleRate;
    this.thresholdMult = thresholdMult;
    this.mean = 0; this.mad = 1;
    this.n = 0; this.alpha = 0.001;
    this.samplesSinceLast = 0;
    this.refractorySamples = sampleRate * refractoryMs / 1000;
    this.minSampleAge = sampleRate * 0.001;
  }
  process(x) {
    this.samplesSinceLast++;
    this.n++;
    const delta = x - this.mean;
    this.mean += this.alpha * delta;
    this.mad += this.alpha * (Math.abs(delta) - this.mad);
    const threshold = this.thresholdMult * this.mad;
    if (this.n > 100 && Math.abs(x) > threshold
        && Math.abs(x) > this.mad * 2
        && this.samplesSinceLast > this.refractorySamples
        && this.samplesSinceLast > this.minSampleAge) {
      this.samplesSinceLast = 0;
      return { timestamp: this.n / this.sampleRate, amplitude: x,
               threshold, noiseFloor: this.mad, snr: Math.abs(x) / this.mad };
    }
    return null;
  }
  reset() { this.mean = 0; this.mad = 1; this.n = 0; this.samplesSinceLast = 0; }
}

class DspPipeline {
  constructor(sampleRate = 250, type = 'plant') {
    this.sampleRate = sampleRate;
    this.highpass = new BiquadCascade([butterHighpass(0.01, sampleRate)]);
    this.notch = new BiquadCascade([butterNotch(50, sampleRate)]);
    const qs = type === 'plant' ? [0.5412, 1.3066] : [0.5412, 1.3066];
    this.bandpass = new BiquadCascade([
      butterBandpassSection(0.1, 100, sampleRate, qs[0]),
      butterBandpassSection(0.1, 100, sampleRate, qs[1])
    ]);
    this.detector = new SpikeDetector(sampleRate, 3.5, 50);
    this.filtersEnabled = true;
    this.notchEnabled = true;
  }
  process(x) {
    let y = x;
    if (this.filtersEnabled) {
      y = this.highpass.process(y);
      if (this.notchEnabled) y = this.notch.process(y);
      y = this.bandpass.process(y);
    }
    return { filtered: y, spike: this.detector.process(y), raw: x };
  }
  processBuffer(samples) { return samples.map(s => this.process(s)); }
  reset() { this.highpass.reset(); this.notch.reset(); this.bandpass.reset(); this.detector.reset(); }
}

// FFT wrapper using fft.js-compatible API
class FFT {
  constructor(size) { this.size = size; this.N = size; this.bitrev = new Uint32Array(size); this.sintable = new Float64Array(size); this.costable = new Float64Array(size); this._init(); }
  _init() {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      this.bitrev[i] = i;
      this.costable[i] = Math.cos(-2 * Math.PI * i / N);
      this.sintable[i] = Math.sin(-2 * Math.PI * i / N);
    }
  }
  transform(out, data) {
    const N = this.N;
    for (let i = 0; i < N; i++) {
      const r = this.bitrev[i];
      out[2*i] = data[2*r]; out[2*i+1] = data[2*r+1];
    }
    for (let len = 2; len <= N; len <<= 1) {
      const halfLen = len >> 1;
      for (let i = 0; i < N; i += len) {
        for (let j = 0; j < halfLen; j++) {
          const step = N / len;
          const idx = j * step;
          const c = this.costable[idx], s = this.sintable[idx];
          const tmpR = out[2*(i+j+halfLen)] * c - out[2*(i+j+halfLen)+1] * s;
          const tmpI = out[2*(i+j+halfLen)+1] * c + out[2*(i+j+halfLen)] * s;
          out[2*(i+j+halfLen)] = out[2*(i+j)] - tmpR;
          out[2*(i+j+halfLen)+1] = out[2*(i+j)+1] - tmpI;
          out[2*(i+j)] += tmpR;
          out[2*(i+j)+1] += tmpI;
        }
      }
    }
  }
  createComplexArray() { return new Float64Array(2 * this.N); }
  toComplexArray(input, out) {
    for (let i = 0; i < this.N; i++) {
      out[2*i] = i < input.length ? input[i] : 0;
      out[2*i+1] = 0;
    }
  }
}

// Feature extraction — matches Rust crate
function extractSpikeFeatures(waveform, sampleRate) {
  const n = waveform.length;
  if (n < 10) return null;
  const peakIdx = waveform.reduce((best, v, i, a) => Math.abs(v) > Math.abs(a[best]) ? i : best, 0);
  const peakVal = waveform[peakIdx];
  const maxVal = Math.max(...waveform), minVal = Math.min(...waveform);
  const amplitude = maxVal - minVal;
  const halfMax = Math.abs(peakVal) / 2;
  let leftIdx = 0, rightIdx = n - 1;
  for (let i = peakIdx - 1; i >= 0; i--) { if (Math.abs(waveform[i]) <= halfMax) { leftIdx = i; break; } }
  for (let i = peakIdx; i < n; i++) { if (Math.abs(waveform[i]) <= halfMax) { rightIdx = i; break; } }
  const duration = (rightIdx - leftIdx) / sampleRate * 1000;
  const tenPct = Math.abs(peakVal) * 0.1, ninetyPct = Math.abs(peakVal) * 0.9;
  let riseStart = 0, riseEnd = peakIdx;
  for (let i = 0; i < peakIdx; i++) { if (Math.abs(waveform[i]) >= tenPct) { riseStart = i; break; } }
  for (let i = riseStart; i < peakIdx; i++) { if (Math.abs(waveform[i]) >= ninetyPct) { riseEnd = i; break; } }
  const riseTime = (riseEnd - riseStart) / sampleRate * 1000;
  let fallStart = peakIdx, fallEnd = n - 1;
  for (let i = peakIdx; i < n; i++) { if (Math.abs(waveform[i]) <= ninetyPct) { fallStart = i; break; } }
  for (let i = fallStart; i < n; i++) { if (Math.abs(waveform[i]) <= tenPct) { fallEnd = i; break; } }
  const fallTime = (fallEnd - fallStart) / sampleRate * 1000;
  const area = waveform.reduce((s, v) => s + Math.abs(v), 0) / sampleRate * 1000;
  let maxSlew = 0;
  for (let i = 1; i < n; i++) { const slew = Math.abs((waveform[i] - waveform[i-1]) * sampleRate / 1000000); if (slew > maxSlew) maxSlew = slew; }
  const fftSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const fft = new FFT(fftSize);
  const complex = fft.createComplexArray();
  fft.toComplexArray(waveform, complex);
  fft.transform(complex, complex);
  const half = fftSize / 2;
  const power = [];
  let totalPower = 0;
  for (let i = 0; i < half; i++) { const p = complex[2*i]**2 + complex[2*i+1]**2; power.push(p); totalPower += p; }
  const dominantBin = power.reduce((best, v, i) => v > power[best] ? i : best, 0);
  const dominantFreq = dominantBin * sampleRate / fftSize;
  const mid = Math.floor(half / 2);
  const lowPower = power.slice(0, mid).reduce((s, p) => s + p, 0);
  const highPower = power.slice(mid).reduce((s, p) => s + p, 0);
  const powerRatio = highPower > 0 ? lowPower / highPower : 1;
  const specEntropy = totalPower > 0
    ? -power.reduce((s, p) => { const n = p / totalPower; return s + (n > 0 ? n * Math.log(n) : 0); }, 0) / Math.log(half)
    : 0;
  const fd = higuchiFD(waveform, Math.min(10, Math.floor(n/2)));
  return { amplitude, duration, riseTime, fallTime, area, slewRate: maxSlew, dominantFreq, powerRatioLFHF: powerRatio, spectralEntropy: specEntropy, fractalDimension: fd };
}

function higuchiFD(signal, kMax) {
  const n = signal.length;
  if (n < kMax + 1) return 1;
  const lengths = [];
  for (let k = 1; k <= kMax; k++) {
    let totalLength = 0;
    for (let m = 0; m < k; m++) {
      let sum = 0, count = 0;
      for (let i = m; i + k < n; i += k) { sum += Math.abs(signal[i + k] - signal[i]); count++; }
      if (count > 0) totalLength += sum * (n - 1) / (count * k);
    }
    lengths.push({ k: Math.log(1/k), l: Math.log(totalLength / k) });
  }
  const xSum = lengths.reduce((s, v) => s + v.k, 0);
  const ySum = lengths.reduce((s, v) => s + v.l, 0);
  const xySum = lengths.reduce((s, v) => s + v.k * v.l, 0);
  const x2Sum = lengths.reduce((s, v) => s + v.k * v.k, 0);
  const m = lengths.length;
  const denom = m * x2Sum - xSum * xSum;
  if (Math.abs(denom) < 1e-10) return 1;
  return (m * xySum - xSum * ySum) / denom;
}

// Plant stress classifier (AutoML-style ensemble)
class PlantClassifier {
  constructor() {
    // Simple threshold-based classifier for initial use
    // In production: replace with auto-sklearn ONNX model
  }
  classify(features, context, baseline) {
    const scores = { resting: 0, touch_response: 0, light_transition: 0, water_stress: 0, wounding: 0, temperature_shock: 0, unknown: 0.05 };
    const { amplitude, dominantFreq, duration, riseTime, spectralEntropy } = features;
    const { temperature, humidity, lightLevel, soilMoisture } = context;
    const restingAmp = baseline.restingAmplitude || 5;
    const restingFreq = baseline.restingFrequency || 0.5;

    // Water stress: amplitude increases, dominant freq drops, soil moisture low
    if (amplitude > restingAmp * 3 && dominantFreq < restingFreq * 0.6 && soilMoisture < 30) {
      scores.water_stress = Math.min(0.95, 0.3 + (amplitude / (restingAmp * 10)) * 0.3 + (1 - soilMoisture / 30) * 0.3);
    }
    // Touch response: sharp spike, fast rise, short duration
    if (amplitude > restingAmp * 4 && riseTime < 50 && duration < 200 && spectralEntropy > 0.5) {
      scores.touch_response = Math.min(0.93, 0.4 + (amplitude / (restingAmp * 8)) * 0.3 + (1 - riseTime / 50) * 0.2);
    }
    // Light transition: correlated with light change
    if (dominantFreq > restingFreq * 2 && spectralEntropy < 0.4) {
      scores.light_transition = Math.min(0.90, 0.3 + (dominantFreq / (restingFreq * 5)) * 0.3 + (1 - spectralEntropy) * 0.3);
    }
    // Temperature shock: correlated with rapid temp change
    if (amplitude > restingAmp * 2.5 && spectralEntropy > 0.7 && temperature > 35) {
      scores.temperature_shock = Math.min(0.92, 0.3 + (amplitude / (restingAmp * 6)) * 0.3 + (Math.max(0, temperature - 35) / 15) * 0.3);
    }
    // Wounding: very large amplitude, long duration
    if (amplitude > restingAmp * 6 && duration > 500) {
      scores.wounding = Math.min(0.99, 0.5 + (amplitude / (restingAmp * 10)) * 0.3 + (duration / 1000) * 0.2);
    }
    // Baseline: if nothing triggered and amplitude is near baseline
    if (amplitude < restingAmp * 2 && dominantFreq > restingFreq * 0.5 && dominantFreq < restingFreq * 2) {
      scores.resting = Math.min(1.0, 0.6 + (1 - amplitude / (restingAmp * 2)) * 0.4);
    }

    const best = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return { classification: best[0], confidence: Math.round(best[1] * 1000) / 1000 };
  }
}
