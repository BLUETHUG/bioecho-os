// BioEcho Web Serial API — Real device connection

class SerialDevice {
  constructor() {
    this.port = null;
    this.reader = null;
    this.isConnected = false;
    this.onSample = null;
    this.onDisconnect = null;
    this.buffer = '';
    this.baudRate = 115200;
  }

  async connect() {
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: this.baudRate });
    this.isConnected = true;

    const decoder = new TextDecoderStream();
    const closed = this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    this._readLoop();

    this.port.addEventListener('disconnect', () => {
      this.isConnected = false;
      if (this.onDisconnect) this.onDisconnect();
    });
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
          const sample = this._parse(trimmed);
          if (sample !== null && this.onSample) this.onSample(sample.value, sample.timestamp);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error('Serial error:', e);
    } finally {
      this.isConnected = false;
      if (this.onDisconnect) this.onDisconnect();
    }
  }

  _parse(line) {
    // CSV: timestamp,voltage[,channel]
    const parts = line.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { timestamp: parts[0], value: parts[1] };
    }
    // Raw number
    const num = parseFloat(line);
    if (!isNaN(num)) return { timestamp: Date.now(), value: num };
    return null;
  }

  async disconnect() {
    if (this.reader) { await this.reader.cancel(); this.reader = null; }
    if (this.port) { await this.port.close(); this.port = null; }
    this.isConnected = false;
  }
}
