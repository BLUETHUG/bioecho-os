// BioEcho Evidence Validation Layer
// Validates every event BEFORE it reaches classification or chat.
// Detects artifacts, rejects noise, ensures scientific integrity.

class EvidenceValidator {
  constructor() {
    // Artifact detection thresholds
    this.saturationThreshold = 4.9;    // ADC rail (5V)
    this.cableMovementWindow = 5;       // samples
    this.cableMovementThreshold = 50;   // µV jump in cableMovementWindow samples
    this.mainsHarmonicRatio = 0.4;      // 50/60Hz power / total power
    this.touchSpikeThreshold = 200;     // µV — likely electrode touch, not biology
    this.impossibleSpeedThreshold = 500; // mm/s — faster than any known plant signal
    this.burstThreshold = 10;           // spikes in 1 second = likely noise burst
    this.burstWindow = 1000;            // ms

    this.validationHistory = [];
  }

  // Main validation entry point
  // Returns: { valid, confidence, artifacts, rejectionReason }
  validate(event, signalStats, context) {
    const artifacts = [];
    let confidencePenalty = 0;

    // 1. Saturation check
    if (event.features && event.features.amplitude > this.saturationThreshold * 1000) {
      artifacts.push({ type: 'saturation', detail: 'Signal at ADC rail — likely sensor fault', severity: 'high' });
      confidencePenalty += 0.3;
    }

    // 2. Cable movement detection
    // Rapid, large-amplitude, irregular fluctuations
    if (event.features) {
      const f = event.features;
      if (f.amplitude > this.cableMovementThreshold &&
          f.spectralEntropy > 0.8 &&
          f.fractalDimension > 1.7) {
        artifacts.push({ type: 'cable_movement', detail: 'Irregular high-amplitude pattern consistent with cable/electrode movement', severity: 'high' });
        confidencePenalty += 0.25;
      }
    }

    // 3. Mains interference (50/60Hz dominance)
    if (event.features) {
      const freq = event.features.dominantFreq;
      const isMainsHarmonic = (freq > 48 && freq < 52) || (freq > 58 && freq < 62) ||
                              (freq > 96 && freq < 104) || (freq > 116 && freq < 124);
      if (isMainsHarmonic && event.features.spectralEntropy < 0.3) {
        artifacts.push({ type: 'mains_interference', detail: `Dominant frequency ${freq.toFixed(1)}Hz matches mains power harmonic`, severity: 'medium' });
        confidencePenalty += 0.15;
      }
    }

    // 4. Electrode touch (extremely large, sharp spike)
    if (event.features && event.features.amplitude > this.touchSpikeThreshold) {
      artifacts.push({ type: 'electrode_touch', detail: `Amplitude ${event.features.amplitude.toFixed(0)}µV exceeds biological range — likely electrode contact`, severity: 'high' });
      confidencePenalty += 0.35;
    }

    // 5. Burst detection (too many spikes in short window)
    if (signalStats && signalStats.recentSpikeCount > this.burstThreshold) {
      artifacts.push({ type: 'noise_burst', detail: `${signalStats.recentSpikeCount} spikes in ${this.burstWindow}ms — likely electrical noise`, severity: 'high' });
      confidencePenalty += 0.3;
    }

    // 6. Impossible signal characteristics
    if (event.features) {
      const f = event.features;
      // Rise time too fast for plant biology (plant APs: 3-100ms)
      if (f.riseTime < 1 && f.amplitude > 20) {
        artifacts.push({ type: 'impossible生物physics', detail: `Rise time ${f.riseTime.toFixed(1)}ms too fast for plant electrophysiology`, severity: 'medium' });
        confidencePenalty += 0.15;
      }
      // Negative duration (shouldn't happen)
      if (f.duration < 0) {
        artifacts.push({ type: 'data_corruption', detail: 'Negative spike duration', severity: 'critical' });
        confidencePenalty += 0.5;
      }
    }

    // 7. USB electrical interference pattern
    // Periodic spikes at ~1ms intervals (USB polling)
    if (signalStats && signalStats.periodicity > 0.8 && signalStats.periodicityFreq > 900 && signalStats.periodicityFreq < 1100) {
      artifacts.push({ type: 'usb_interference', detail: 'Periodic spikes at ~1kHz consistent with USB polling', severity: 'medium' });
      confidencePenalty += 0.2;
    }

    // 8. Environmental inconsistency
    if (context && event.classification) {
      const env = context.environment;
      if (event.classification === 'temperature_shock' && env.temperature !== null && env.temperature < 25) {
        artifacts.push({ type: 'env_inconsistent', detail: `Temperature shock claimed but ambient is ${env.temperature.toFixed(1)}°C`, severity: 'low' });
        confidencePenalty += 0.1;
      }
      if (event.classification === 'water_stress' && env.soilMoisture !== null && env.soilMoisture > 60) {
        artifacts.push({ type: 'env_inconsistent', detail: `Water stress claimed but soil moisture is ${env.soilMoisture.toFixed(0)}%`, severity: 'low' });
        confidencePenalty += 0.1;
      }
    }

    // Determine if valid
    const highSeverityArtifacts = artifacts.filter(a => a.severity === 'high' || a.severity === 'critical');
    const valid = highSeverityArtifacts.length === 0;
    const adjustedConfidence = Math.max(0.05, (event.confidence || 0.5) - confidencePenalty);

    const result = {
      valid,
      originalConfidence: event.confidence || 0.5,
      adjustedConfidence: Math.round(adjustedConfidence * 1000) / 1000,
      confidencePenalty: Math.round(confidencePenalty * 1000) / 1000,
      artifacts,
      artifactCount: artifacts.length,
      highSeverityCount: highSeverityArtifacts.length,
      rejectionReason: highSeverityArtifacts.length > 0
        ? highSeverityArtifacts.map(a => a.detail).join('; ')
        : null,
      timestamp: Date.now()
    };

    this.validationHistory.push(result);
    if (this.validationHistory.length > 1000) this.validationHistory.shift();

    return result;
  }

  // Get recent validation stats
  getStats() {
    const recent = this.validationHistory.slice(-100);
    const valid = recent.filter(v => v.valid).length;
    const artifacts = recent.reduce((s, v) => s + v.artifactCount, 0);
    return {
      total: recent.length,
      valid,
      rejected: recent.length - valid,
      validRate: recent.length > 0 ? valid / recent.length : 1,
      avgArtifacts: recent.length > 0 ? artifacts / recent.length : 0
    };
  }

  // Check if a recent window of samples contains artifacts
  validateWindow(samples) {
    if (samples.length < 10) return { valid: true, artifacts: [] };
    const artifacts = [];
    const values = samples.map(s => s.value || s);

    // Check for saturation
    const saturated = values.filter(v => Math.abs(v) > this.saturationThreshold * 1000).length;
    if (saturated > values.length * 0.1) {
      artifacts.push({ type: 'saturation', detail: `${saturated} saturated samples` });
    }

    // Check for cable movement (rapid large jumps)
    let maxJump = 0;
    for (let i = 1; i < values.length; i++) {
      const jump = Math.abs(values[i] - values[i-1]);
      if (jump > maxJump) maxJump = jump;
    }
    if (maxJump > this.cableMovementThreshold) {
      artifacts.push({ type: 'cable_movement', detail: `Max sample jump: ${maxJump.toFixed(1)}µV` });
    }

    // Check for periodic interference
    const mean = values.reduce((s,v) => s+v, 0) / values.length;
    const ac = values.map(v => v - mean);
    const zeroCrossings = ac.filter((v,i) => i > 0 && ac[i-1] * v < 0).length;
    const crossingRate = zeroCrossings / values.length;
    if (crossingRate > 0.8) {
      artifacts.push({ type: 'high_freq_noise', detail: `Zero-crossing rate: ${crossingRate.toFixed(2)}` });
    }

    return { valid: artifacts.length === 0, artifacts };
  }
}
