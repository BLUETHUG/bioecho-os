// BioEcho Web Serial API — Connect to SpikerBox or ESP32 over USB

class SerialDevice {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.onSample = null;  // callback(sample)
    this.onDisconnect = null;
    this.buffer = '';
    this.baudRate = 115200;
  }

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported. Use Chrome or Edge.');
    }
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: this.baudRate });
      this.isConnected = true;

      // Start reading
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      this._readLoop();

      // Listen for disconnect
      this.port.addEventListener('disconnect', () => {
        this.isConnected = false;
        if (this.onDisconnect) this.onDisconnect();
      });

      return true;
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  async _readLoop() {
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += value;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const sample = this._parseLine(trimmed);
          if (sample !== null && this.onSample) {
            this.onSample(sample);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Serial read error:', err);
      }
    } finally {
      this.isConnected = false;
      if (this.onDisconnect) this.onDisconnect();
    }
  }

  _parseLine(line) {
    // Supports multiple formats:
    // "1234,12.34" — timestamp, voltage
    // "1234,12.34,0" — timestamp, voltage, channel
    // Raw number — just voltage
    const parts = line.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { timestamp: parts[0], value: parts[1], channel: parts[2] || 0 };
    }
    const num = parseFloat(line);
    if (!isNaN(num)) {
      return { timestamp: Date.now(), value: num, channel: 0 };
    }
    return null;
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    this.isConnected = false;
  }

  async sendCommand(cmd) {
    if (!this.port || !this.port.writable) return;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(cmd + '\n'));
    } finally {
      writer.releaseLock();
    }
  }
}
