// BioEcho Calibration & Signal Integrity Engine
// Validates signal quality before any classification happens.

class CalibrationEngine {
  constructor() {
    this.state = 'idle'; // idle | measuring | done | failed
    this.result = null;
    this.progress = 0;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  // Run full calibration sequence on a connected source
  async runCalibration(source, durationMs = 3000) {
    this.state = 'measuring';
    this.progress = 0;
    this.result = null;

    const samples = [];
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const handler = (s) => {
        samples.push({ value: s.value, timestamp: s.timestamp });
        this.progress = Math.min(0.9, (Date.now() - startTime) / durationMs);
        if (this.onProgress) this.onProgress(this.progress, 'Collecting samples...');
      };

      source.onSample(handler);

      setTimeout(() => {
        source.onSample(() => {}); // clear handler
        try {
          this.result = this._analyze(samples, source.sampleRate);
          this.state = 'done';
          this.progress = 1;
          if (this.onComplete) this.onComplete(this.result);
          resolve(this.result);
        } catch (e) {
          this.state = 'failed';
          if (this.onError) this.onError(e.message);
          reject(e);
        }
      }, durationMs);
    });
  }

  _analyze(samples, sampleRate) {
    if (samples.length < sampleRate) {
      throw new Error('Insufficient samples for calibration');
    }

    const values = samples.map(s => s.value);
    const n = values.length;

    // 1. DC offset
    const dcOffset = values.reduce((s, v) => s + v, 0) / n;

    // 2. Noise floor (RMS of AC-coupled signal)
    const ac = values.map(v => v - dcOffset);
    const rms = Math.sqrt(ac.reduce((s, v) => s + v * v, 0) / n);

    // 3. Peak-to-peak
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const peakToPeak = maxVal - minVal;

    // 4. 50/60 Hz interference detection (FFT)
    const fftSize = Math.min(1024, 1 << Math.floor(Math.log2(n)));
    const fft = new FFT(fftSize);
    const complex = fft.createComplexArray();
    fft.toComplexArray(ac.slice(0, fftSize), complex);
    fft.transform(complex, complex);
    const half = fftSize / 2;
    let power50 = 0, power60 = 0, totalPower = 0;
    for (let i = 1; i < half; i++) {
      const freq = i * sampleRate / fftSize;
      const p = Math.sqrt(complex[2*i]**2 + complex[2*i+1]**2);
      totalPower += p;
      if (freq > 48 && freq < 52) power50 += p;
      if (freq > 58 && freq < 62) power60 += p;
    }
    const mainsInterference = Math.max(power50, power60) / totalPower;

    // 5. Baseline drift (low-freq component)
    let drift = 0;
    for (let i = 1; i < n; i++) drift += Math.abs(ac[i] - ac[i-1]);
    const baselineDrift = drift / n;

    // 6. Saturation check
    const saturationPct = (values.filter(v => v >= 5.0 || v <= 0).length / n) * 100;

    // 7. Signal-to-noise ratio estimate
    const signalPower = rms;
    const noisePower = rms; // Will be refined with baseline
    const snrEstimate = signalPower > 0 ? 20 * Math.log10(signalPower / Math.max(noisePower, 0.001)) : 0;

    // 8. Overall quality score (0-100)
    let score = 100;
    if (mainsInterference > 0.3) score -= 30;
    else if (mainsInterference > 0.1) score -= 15;
    if (saturationPct > 1) score -= 25;
    if (rms < 0.5) score -= 20; // Very low signal
    if (rms > 100) score -= 20; // Likely noise, not biology
    if (baselineDrift > 10) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // 9. Recommendations
    const recommendations = [];
    if (mainsInterference > 0.1) recommendations.push('Enable 50/60Hz notch filter — mains hum detected');
    if (saturationPct > 1) recommendations.push('Check electrode connections — signal saturating');
    if (rms < 0.5) recommendations.push('Very low signal — verify electrodes are making contact');
    if (rms > 100) recommendations.push('High noise — check for loose connections or nearby electronics');
    if (baselineDrift > 10) recommendations.push('Significant baseline drift — high-pass filter active');
    if (score >= 80) recommendations.push('Signal quality is good — ready for monitoring');

    return {
      timestamp: Date.now(),
      sampleRate,
      samplesCollected: n,
      durationMs: (samples[n-1].timestamp - samples[0].timestamp) || durationMs,
      dcOffset: roundTo(dcOffset, 2),
      rmsNoise: roundTo(rms, 2),
      peakToPeak: roundTo(peakToPeak, 2),
      mainsInterference: roundTo(mainsInterference, 4),
      baselineDrift: roundTo(baselineDrift, 4),
      saturationPct: roundTo(saturationPct, 2),
      snrEstimate: roundTo(snrEstimate, 1),
      score: Math.round(score),
      quality: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor',
      recommendations
    };
  }

  reset() { this.state = 'idle'; this.result = null; this.progress = 0; }
}

function roundTo(n, d) { const f = 10**d; return Math.round(n*f)/f; }
