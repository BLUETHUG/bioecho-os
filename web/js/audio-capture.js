// BioEcho Audio Capture — Microphone input for bioacoustic classification

class AudioCapture {
  constructor() {
    this.stream = null;
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.isCapturing = false;
    this.onSample = null;  // callback(sampleValue)
    this.onAudioData = null; // callback(Float32Array) — full buffer for BirdNET
    this.sampleRate = 48000;
    this.bufferSize = 2048;
    this.recordingBuffer = [];
    this.recordingDuration = 3; // seconds, for BirdNET segments
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.sampleRate, channelCount: 1,
                echoCancellation: false, noiseSuppression: false }
      });
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      // Use ScriptProcessor for broad compatibility
      this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
      this.processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        // Send peak sample for waveform display
        if (this.onSample) {
          const peak = input.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
          this.onSample(peak * 1000); // Scale to µV-equivalent for consistent UI
        }
        // Buffer for BirdNET-style analysis
        this.recordingBuffer.push(new Float32Array(input));
        const totalSamples = this.recordingBuffer.reduce((s, b) => s + b.length, 0);
        if (totalSamples >= this.sampleRate * this.recordingDuration && this.onAudioData) {
          const combined = new Float32Array(totalSamples);
          let offset = 0;
          for (const buf of this.recordingBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
          }
          this.onAudioData(combined, this.sampleRate);
          this.recordingBuffer = [];
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isCapturing = true;
      return true;
    } catch (err) {
      this.isCapturing = false;
      throw err;
    }
  }

  stop() {
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    this.isCapturing = false;
    this.recordingBuffer = [];
  }

  getSampleRate() { return this.audioContext ? this.audioContext.sampleRate : this.sampleRate; }
}
