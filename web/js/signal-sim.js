// BioEcho Signal Simulator — generates realistic plant bioelectric signals

class SignalSimulator {
  constructor(sampleRate = 250) {
    this.sampleRate = sampleRate;
    this.t = 0;
    // Signal components
    this.baseline = 0;
    this.driftPhase = Math.random() * 2 * Math.PI;
    // Noise model
    this.noiseFloor = 2; // µV RMS
    // Spike generator
    this.spikeTimer = 0;
    this.spikeInterval = 3 + Math.random() * 5; // seconds between spontaneous spikes
    this.spikeAmplitude = 15 + Math.random() * 30; // µV
    this.currentSpike = null; // { amplitude, peakTime, duration }
    // Low-frequency oscillations (e.g., slow wave potentials)
    this.oscAmplitude = 3 + Math.random() * 5;
    this.oscFreq = 0.05 + Math.random() * 0.1; // 0.05–0.15 Hz
    // Environment simulation
    this.temperature = 24;
    this.humidity = 55;
    this.lightLevel = 30000;
    this.soilMoisture = 45;
    this.lastStimulus = null;
    this.stimulusResponseAmplitude = 0;
    this.stimulusResponseDecay = 0.98;
  }

  setStimulus(type) {
    this.lastStimulus = type;
    switch (type) {
      case 'water':
        this.soilMoisture = Math.min(80, this.soilMoisture + 25);
        // Watering causes a mild electrical response
        this.stimulusResponseAmplitude = 20;
        break;
      case 'touch':
        this.stimulusResponseAmplitude = 40 + Math.random() * 30;
        break;
      case 'light':
        // Toggle light
        if (this.lightLevel > 20000) {
          this.lightLevel = 2000;
        } else {
          this.lightLevel = 50000;
        }
        this.stimulusResponseAmplitude = 25;
        break;
      case 'observe':
        // Just a log event, no stimulus
        this.stimulusResponseAmplitude = 8 + Math.random() * 5;
        break;
    }
  }

  updateEnvironment() {
    // Simulate diurnal cycle
    const hour = ((this.t / this.sampleRate) % 86400) / 3600; // 0–24 hours
    // Temperature follows sun
    this.temperature = 20 + 8 * Math.sin((hour - 6) / 12 * Math.PI);
    // Humidity inversely follows temperature
    this.humidity = 40 + 30 * (1 - Math.sin((hour - 6) / 12 * Math.PI));
    // Light during day
    this.lightLevel = hour > 6 && hour < 20
      ? 30000 + 20000 * Math.sin((hour - 6) / 14 * Math.PI)
      : 500;
    // Soil moisture slowly decreases
    if (this.t % (this.sampleRate * 60) < 1) { // every ~60 seconds
      this.soilMoisture = Math.max(15, this.soilMoisture - 0.05);
    }
  }

  read() {
    this.t++;
    this.updateEnvironment();

    // Slow baseline drift (0.01–0.1 Hz)
    const drift = 2 * Math.sin(2 * Math.PI * 0.01 * this.t / this.sampleRate + this.driftPhase)
                + 1 * Math.sin(2 * Math.PI * 0.03 * this.t / this.sampleRate);

    // Low-frequency oscillations (slow wave potentials)
    const osc = this.oscAmplitude * Math.sin(2 * Math.PI * this.oscFreq * this.t / this.sampleRate);

    // 50 Hz mains hum
    const hum = 0.5 * Math.sin(2 * Math.PI * 50 * this.t / this.sampleRate);

    // 60 Hz mains hum
    const hum60 = 0.3 * Math.sin(2 * Math.PI * 60 * this.t / this.sampleRate);

    // Gaussian noise (electrode noise + thermal noise)
    const noise = this.noiseFloor * (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    // 1/f flicker noise (approximated)
    const flicker = 0.5 * Math.sin(2 * Math.PI * (0.5 + Math.random() * 2) * this.t / this.sampleRate);

    // Stimulus response (decaying exponential)
    let stimulusResponse = 0;
    if (this.stimulusResponseAmplitude > 0.5) {
      stimulusResponse = this.stimulusResponseAmplitude * (Math.random() * 0.5 + 0.75)
        * Math.exp(-this.t % 100 / 20) * Math.sin(2 * Math.PI * 0.5 * (this.t % 100) / this.sampleRate);
      if (this.t % 100 < 2) this.stimulusResponseAmplitude *= this.stimulusResponseDecay;
    }

    // Spontaneous spikes
    let spike = 0;
    this.spikeTimer += 1 / this.sampleRate;
    if (this.spikeTimer > this.spikeInterval && Math.abs(stimulusResponse) < 2) {
      this.spikeTimer = 0;
      this.spikeInterval = 8 + Math.random() * 12;
      this.currentSpike = {
        amplitude: this.spikeAmplitude * (0.5 + Math.random()),
        startTime: this.t,
        duration: 0.1 + Math.random() * 0.3,
        shape: Math.random() > 0.5 ? 'ap' : 'vp'
      };
    }

    if (this.currentSpike) {
      const elapsed = (this.t - this.currentSpike.startTime) / this.sampleRate;
      if (elapsed < this.currentSpike.duration) {
        const phase = elapsed / this.currentSpike.duration;
        // Action potential shape: sharp rise, slower fall
        if (this.currentSpike.shape === 'ap') {
          spike = this.currentSpike.amplitude * Math.sin(phase * Math.PI) * Math.exp(-phase * 3);
        } else {
          // Variation potential shape: slower, broader
          spike = this.currentSpike.amplitude * (1 - Math.exp(-phase * 5)) * Math.exp(-phase * 2);
        }
      } else {
        this.currentSpike = null;
      }
    }

    const signal = drift + osc + hum + hum60 + noise + flicker + stimulusResponse + spike;
    return { signal, raw: signal, filtered: signal,
             context: { temperature: this.temperature, humidity: this.humidity,
                       lightLevel: this.lightLevel, soilMoisture: this.soilMoisture } };
  }

  getContext() {
    return { temperature: this.temperature, humidity: this.humidity,
             lightLevel: this.lightLevel, soilMoisture: this.soilMoisture };
  }

  reset() {
    this.t = 0;
    this.currentSpike = null;
    this.spikeTimer = 0;
    this.stimulusResponseAmplitude = 0;
  }
}
