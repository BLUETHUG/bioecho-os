// BioEcho Chat Engine — Evidence-backed conversation interface

class ChatEngine {
  constructor(containerId, organismSelectId, inputId, sendBtnId, statusId) {
    this.container = document.getElementById(containerId);
    this.organismSelect = document.getElementById(organismSelectId);
    this.input = document.getElementById(inputId);
    this.sendBtn = document.getElementById(sendBtnId);
    this.statusEl = document.getElementById(statusId);
    this.messages = [];
    this.onSendMessage = null;
    this.maxMessages = 200;
    this._setup();
    // Templates for evidence-backed statements
    this.templates = {
      resting: {
        high: (ctx) => ({ text: `Resting state detected. Baseline electrical activity at ${ctx.amp}µV, ${ctx.freq}Hz dominant frequency. No anomalies.`, confidence: ctx.conf })
      },
      touch_response: {
        high: (ctx) => ({
          text: `Detected touch-type electrical response (${(ctx.conf*100).toFixed(0)}% confidence). Spike amplitude ${ctx.amp}µV, duration ${ctx.dur}ms, rise time ${ctx.rise}ms — consistent with mechanosensitive ion channel activation reported in the literature.`,
          evidence: [
            { label: 'Spike amplitude', value: `${ctx.amp} µV`, trend: ctx.amp > ctx.baselineAmp * 3 ? 'up' : 'normal' },
            { label: 'Rise time', value: `${ctx.rise} ms`, trend: ctx.rise < 50 ? 'fast' : 'normal' },
            { label: 'Duration', value: `${ctx.dur} ms`, trend: ctx.dur < 300 ? 'short' : 'normal' },
            { label: 'Spectral entropy', value: ctx.entropy.toFixed(2), trend: ctx.entropy > 0.5 ? 'high' : 'normal' }
          ], confidence: ctx.conf
        })
      },
      water_stress: {
        high: (ctx) => ({
          text: `Electrical signature consistent with early-stage water stress (${(ctx.conf*100).toFixed(0)}% confidence). Amplitude elevated above baseline, dominant frequency shifting downward. Soil moisture at ${ctx.soilMoisture}%.`,
          evidence: [
            { label: 'Spike amplitude', value: `${ctx.amp} µV`, trend: ctx.amp > ctx.baselineAmp * 2 ? 'up' : 'normal' },
            { label: 'Dominant frequency', value: `${ctx.freq} Hz`, trend: ctx.freq < ctx.baselineFreq * 0.7 ? 'down' : 'normal' },
            { label: 'Soil moisture', value: `${ctx.soilMoisture}%`, trend: ctx.soilMoisture < 30 ? 'down' : 'normal' },
            { label: 'Temperature', value: `${ctx.temp}°C`, trend: ctx.temp > 30 ? 'up' : 'normal' }
          ], confidence: ctx.conf
        })
      },
      light_transition: {
        high: (ctx) => ({
          text: `Electrical response consistent with rapid light level change (${(ctx.conf*100).toFixed(0)}% confidence). Frequency shift detected, typical of photosynthetic apparatus adjustment.`,
          evidence: [
            { label: 'Dominant frequency', value: `${ctx.freq} Hz`, trend: ctx.freq > ctx.baselineFreq * 1.5 ? 'up' : 'normal' },
            { label: 'Spectral entropy', value: ctx.entropy.toFixed(2), trend: ctx.entropy < 0.4 ? 'low' : 'normal' },
            { label: 'Light level', value: `${ctx.lightLevel} lux`, trend: 'changed' }
          ], confidence: ctx.conf
        })
      },
      temperature_shock: {
        high: (ctx) => ({
          text: `Detected electrical response consistent with rapid temperature increase (${(ctx.conf*100).toFixed(0)}% confidence). Signal complexity elevated.`,
          evidence: [
            { label: 'Amplitude', value: `${ctx.amp} µV`, trend: 'up' },
            { label: 'Spectral entropy', value: ctx.entropy.toFixed(2), trend: 'high' },
            { label: 'Temperature', value: `${ctx.temp}°C`, trend: 'up' }
          ], confidence: ctx.conf
        })
      },
      wounding: {
        high: (ctx) => ({
          text: `⚠️ Large electrical transient detected (${(ctx.conf*100).toFixed(0)}% confidence). Signal amplitude ${ctx.amp}µV, duration ${ctx.dur}ms — consistent with wounding-type variation potential.`,
          evidence: [
            { label: 'Amplitude', value: `${ctx.amp} µV`, trend: 'up' },
            { label: 'Duration', value: `${ctx.dur} ms`, trend: 'long' },
            { label: 'Slew rate', value: `${(ctx.slew/1000).toFixed(2)} V/s`, trend: 'high' }
          ], confidence: ctx.conf
        })
      },
      unknown: {
        high: (ctx) => ({
          text: `Detected an electrical transient that doesn't closely match known stress patterns. Amplitude ${ctx.amp}µV at ${ctx.freq}Hz. Monitoring and correlation with environmental changes recommended.`,
          evidence: [
            { label: 'Amplitude', value: `${ctx.amp} µV`, trend: 'anomaly' },
            { label: 'Frequency', value: `${ctx.freq} Hz`, trend: 'anomaly' },
            { label: 'Duration', value: `${ctx.dur} ms`, trend: 'anomaly' }
          ], confidence: ctx.conf
        })
      }
    };
  }

  _setup() {
    this.sendBtn.addEventListener('click', () => this._send());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });
  }

  _send() {
    const text = this.input.value.trim();
    if (!text) return;
    this.addMessage({ role: 'user', text });
    this.input.value = '';
    if (this.onSendMessage) this.onSendMessage(text);
  }

  addMessage(msg) {
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) this.messages.shift();
    this._render();
  }

  addSystemMessage(text, evidence, confidence) {
    this.addMessage({ role: 'system', text, evidence, confidence, timestamp: Date.now() });
  }

  // Generate a statement from a classification event
  generateStatement(event, organism) {
    const { classification, confidence, featureVector, context } = event;
    const baseline = organism ? organism.baseline : { restingAmplitude: 5, restingFrequency: 0.5 };
    const ctx = {
      amp: featureVector.amplitude.toFixed(1),
      freq: featureVector.dominantFreq.toFixed(2),
      dur: featureVector.duration.toFixed(0),
      rise: featureVector.riseTime.toFixed(0),
      fall: featureVector.fallTime.toFixed(0),
      slew: featureVector.slewRate,
      entropy: featureVector.spectralEntropy,
      fd: featureVector.fractalDimension.toFixed(2),
      baselineAmp: baseline.restingAmplitude,
      baselineFreq: baseline.restingFrequency,
      soilMoisture: context.soilMoisture.toFixed(0),
      temp: context.temperature.toFixed(1),
      lightLevel: context.lightLevel.toFixed(0),
      conf: confidence
    };

    const templateSet = this.templates[classification];
    if (!templateSet) return null;

    // Choose template based on confidence
    const template = confidence > 0.85 ? templateSet.high : (templateSet.medium || templateSet.high);
    const result = template(ctx);

    this.addSystemMessage(result.text, result.evidence, result.confidence);
    return result;
  }

  _render() {
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const msg of this.messages) {
      const el = document.createElement('div');
      el.className = `chat-msg ${msg.role}`;

      const body = document.createElement('div');
      body.className = 'msg-body';
      body.textContent = msg.text;

      if (msg.timestamp) {
        const header = document.createElement('div');
        header.className = 'msg-header';
        const d = new Date(msg.timestamp);
        header.textContent = `${msg.role === 'system' ? '🪴 Plant' : 'You'} · ${d.toLocaleTimeString()}`;
        el.appendChild(header);
      }

      el.appendChild(body);

      // Evidence table
      if (msg.evidence && msg.evidence.length > 0) {
        const table = document.createElement('div');
        table.className = 'evidence-table';
        let html = '<table>';
        for (const ev of msg.evidence) {
          const cls = ev.trend === 'up' || ev.trend === 'high' || ev.trend === 'fast'
            ? 'ev-up' : ev.trend === 'down' || ev.trend === 'low'
            ? 'ev-down' : 'ev-stable';
          const arrow = ev.trend === 'up' ? '↑' : ev.trend === 'down' ? '↓' : '→';
          html += `<tr><td>${ev.label}</td><td>${ev.value}</td><td class="${cls}">${arrow} ${ev.trend}</td></tr>`;
        }
        if (msg.confidence !== undefined) {
          const confClass = msg.confidence > 0.85 ? 'confidence-high' : msg.confidence > 0.7 ? 'confidence-med' : 'confidence-low';
          html += `<tr><td>Confidence</td><td class="${confClass}">${(msg.confidence * 100).toFixed(0)}%</td><td></td></tr>`;
        }
        html += '</table>';
        table.innerHTML = html;
        el.appendChild(table);
      }

      fragment.appendChild(el);
    }

    this.container.appendChild(fragment);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() { this.messages = []; this._render(); }

  setStatus(text, className) {
    this.statusEl.textContent = text;
    this.statusEl.className = className || 'status-ok';
  }

  enableInput(enabled) {
    this.input.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
  }

  updateOrganisms(organisms, activeId) {
    this.organismSelect.innerHTML = '';
    for (const org of organisms) {
      const opt = document.createElement('option');
      opt.value = org.id;
      opt.textContent = `${org.name} (${org.species})`;
      if (org.id === activeId) opt.selected = true;
      this.organismSelect.appendChild(opt);
    }
  }
}
