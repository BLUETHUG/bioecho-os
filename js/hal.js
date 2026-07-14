// BioEcho Hardware Abstraction Layer
// Any sensor implements DeviceSource. The app never touches hardware directly.

class DeviceSource {
  constructor(id, name, type, sampleRate, channels) {
    this.id = id;
    this.name = name;
    this.type = type;         // 'spikerbox' | 'esp32' | 'audio' | 'simulated'
    this.sampleRate = sampleRate;
    this.channels = channels;
    this.connected = false;
    this._onSample = null;
    this._onDisconnect = null;
    this._onError = null;
    this.metadata = {};
  }
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
  onSample(cb) { this._onSample = cb; }
  onDisconnect(cb) { this._onDisconnect = cb; }
  onError(cb) { this._onError = cb; }
  _emit(value, timestamp, channel) {
    if (this._onSample) this._onSample({ value, timestamp, channel, source: this.id });
  }
  getInfo() {
    return { id: this.id, name: this.name, type: this.type,
             sampleRate: this.sampleRate, channels: this.channels,
             connected: this.connected, metadata: this.metadata };
  }
}

// ─── USB Serial (SpikerBox / ESP32) ────────────────────────

class SerialSource extends DeviceSource {
  constructor() {
    super('serial', 'USB Serial', 'spikerbox', 250, 1);
    this.port = null;
    this.reader = null;
    this.buffer = '';
  }

  async connect() {
    if (!('serial' in navigator)) throw new Error('Web Serial not supported. Use Chrome or Edge.');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });
    this.connected = true;
    this.metadata.firmware = await this._identify();
    const dec = new TextDecoderStream();
    this.port.readable.pipeTo(dec.writable);
    this.reader = dec.readable.getReader();
    this._readLoop();
    this.port.addEventListener('disconnect', () => this._handleDisconnect());
  }

  async _identify() {
    try {
      const w = this.port.writable.getWriter();
      await w.write(new TextEncoder().encode('b:\n'));
      w.releaseLock();
      await new Promise(r => setTimeout(r, 200));
      const lines = this.buffer.split('\n');
      for (const l of lines) {
        if (l.includes('CURRENT_SHIELD_TYPE')) return l.split(':')[1]?.trim() || 'unknown';
      }
    } catch {}
    return 'unknown';
  }

  async _readLoop() {
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += value;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(',').map(s => parseFloat(s.trim()));
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            this._emit(parts[1], parts[0], parts[2] || 0);
          } else {
            const num = parseFloat(trimmed);
            if (!isNaN(num)) this._emit(num, Date.now(), 0);
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError' && this._onError) this._onError(e);
    } finally {
      this._handleDisconnect();
    }
  }

  _handleDisconnect() {
    this.connected = false;
    if (this._onDisconnect) this._onDisconnect();
  }

  async disconnect() {
    if (this.reader) { try { await this.reader.cancel(); } catch {} this.reader = null; }
    if (this.port) { try { await this.port.close(); } catch {} this.port = null; }
    this.connected = false;
  }
}

// ─── Microphone ─────────────────────────────────────────────

class AudioSource extends DeviceSource {
  constructor() {
    super('audio', 'Microphone', 'audio', 48000, 1);
    this.stream = null;
    this.ctx = null;
    this.processor = null;
    this.source = null;
  }

  async connect() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 48000, channelCount: 1, echoCancellation: false, noiseSuppression: false }
    });
    this.ctx = new AudioContext({ sampleRate: 48000 });
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const peak = input.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
      this._emit(peak * 1000, Date.now(), 0);
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    this.connected = true;
    this.metadata.deviceLabel = this.stream.getTracks()[0]?.label || 'unknown';
  }

  async disconnect() {
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.source) { this.source.disconnect(); this.source = null; }
    if (this.ctx) { await this.ctx.close(); this.ctx = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    this.connected = false;
  }
}

// ─── HAL Manager ────────────────────────────────────────────

class HardwareAbstractionLayer {
  constructor() {
    this.sources = new Map();
    this.activeSource = null;
    this.onSourceConnected = null;
    this.onSourceDisconnected = null;
    this.onSample = null;
    this._registerDefaults();
  }

  _registerDefaults() {
    this.sources.set('serial', new SerialSource());
    this.sources.set('audio', new AudioSource());
  }

  registerSource(id, source) { this.sources.set(id, source); }
  getSource(id) { return this.sources.get(id); }
  getActive() { return this.activeSource; }

  async connect(id) {
    const source = this.sources.get(id);
    if (!source) throw new Error(`Unknown source: ${id}`);
    if (this.activeSource && this.activeSource.connected) {
      await this.activeSource.disconnect();
    }
    source.onSample((s) => { if (this.onSample) this.onSample(s); });
    source.onDisconnect(() => {
      if (this.activeSource === source) {
        this.activeSource.connected = false;
        if (this.onSourceDisconnected) this.onSourceDisconnected(source);
      }
    });
    await source.connect();
    this.activeSource = source;
    if (this.onSourceConnected) this.onSourceConnected(source);
    return source;
  }

  async disconnect() {
    if (this.activeSource) {
      await this.activeSource.disconnect();
      this.activeSource = null;
    }
  }

  listSources() {
    return Array.from(this.sources.values()).map(s => s.getInfo());
  }
}
