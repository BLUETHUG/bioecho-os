// BioEcho Audio Capture — Microphone for bioacoustic analysis

class AudioCapture {
  constructor() {
    this.stream = null;
    this.ctx = null;
    this.processor = null;
    this.source = null;
    this.isCapturing = false;
    this.onSample = null;
    this.sampleRate = 48000;
    this.bufferSize = 2048;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: this.sampleRate, channelCount: 1,
               echoCancellation: false, noiseSuppression: false }
    });
    this.ctx = new AudioContext({ sampleRate: this.sampleRate });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(this.bufferSize, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const peak = input.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
      if (this.onSample) this.onSample(peak * 1000, Date.now());
    };

    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    this.isCapturing = true;
  }

  stop() {
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.ctx) { this.ctx.close(); this.ctx = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    this.isCapturing = false;
  }
}
