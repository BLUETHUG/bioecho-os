// BioEcho Lens — Camera-First Biological Recognition Engine
// Point camera at any organism → identify, overlay data, explain, act.

class BioEchoLens {
  constructor(knowledgeGraph, twinEngine, speciesDB, contextEngine, meaningEngine) {
    this.kg = knowledgeGraph;
    this.twinEngine = twinEngine;
    this.speciesDB = speciesDB;
    this.contextEngine = contextEngine;
    this.meaningEngine = meaningEngine;
    this.stream = null;
    this.videoEl = null;
    this.canvasEl = null;
    this.ctx = null;
    this.isCapturing = false;
    this.lastRecognition = null;
    this.recognitionHistory = [];
  }

  async initialize(videoElementId, canvasElementId) {
    this.videoEl = document.getElementById(videoElementId);
    this.canvasEl = document.getElementById(canvasElementId);
    if (this.canvasEl) this.ctx = this.canvasEl.getContext('2d');
    return true;
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (this.videoEl) {
        this.videoEl.srcObject = this.stream;
        await this.videoEl.play();
      }
      this.isCapturing = true;
      return { success: true, track: this.stream.getVideoTracks()[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.isCapturing = false;
  }

  async captureFrame() {
    if (!this.videoEl || !this.canvasEl) return null;
    this.canvasEl.width = this.videoEl.videoWidth || 640;
    this.canvasEl.height = this.videoEl.videoHeight || 480;
    this.ctx.drawImage(this.videoEl, 0, 0);
    return this.ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height);
  }

  async analyzeFrame(imageData) {
    if (!imageData) return null;
    const w = imageData.width, h = imageData.height;
    const data = imageData.data;

    const dominantColors = this._extractDominantColors(data, w, h);
    const brightness = this._calculateBrightness(data);
    const greenRatio = this._calculateGreenRatio(data);
    const edgeComplexity = this._estimateEdgeComplexity(data, w, h);

    return {
      dominantColors,
      brightness,
      greenRatio,
      edgeComplexity,
      timestamp: Date.now(),
      dimensions: { width: w, height: h }
    };
  }

  _extractDominantColors(data, w, h) {
    const r = { sum: 0, count: 0 }, g = { sum: 0, count: 0 }, b = { sum: 0, count: 0 };
    const step = 20;
    for (let i = 0; i < data.length; i += step * 4) {
      r.sum += data[i]; r.count++;
      g.sum += data[i + 1]; g.count++;
      b.sum += data[i + 2]; b.count++;
    }
    return {
      avgRed: Math.round(r.sum / (r.count || 1)),
      avgGreen: Math.round(g.sum / (g.count || 1)),
      avgBlue: Math.round(b.sum / (b.count || 1))
    };
  }

  _calculateBrightness(data) {
    let total = 0, count = 0;
    const step = 40;
    for (let i = 0; i < data.length; i += step * 4) {
      total += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      count++;
    }
    return Math.round(total / (count || 1));
  }

  _calculateGreenRatio(data) {
    let greenPixels = 0, totalPixels = 0;
    const step = 20;
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > r * 1.2 && g > b * 1.2) greenPixels++;
      totalPixels++;
    }
    return greenPixels / (totalPixels || 1);
  }

  _estimateEdgeComplexity(data, w, h) {
    let edges = 0, total = 0;
    const step = 10;
    for (let y = step; y < h - step; y += step) {
      for (let x = step; x < w - step; x += step) {
        const idx = (y * w + x) * 4;
        const idxR = (y * w + x + step) * 4;
        const idxD = ((y + step) * w + x) * 4;
        const diffH = Math.abs(data[idx] - data[idxR]) + Math.abs(data[idx + 1] - data[idxR + 1]) + Math.abs(data[idx + 2] - data[idxR + 2]);
        const diffV = Math.abs(data[idx] - data[idxD]) + Math.abs(data[idx + 1] - data[idxD + 1]) + Math.abs(data[idx + 2] - data[idxD + 2]);
        if (diffH > 150 || diffV > 150) edges++;
        total++;
      }
    }
    return edges / (total || 1);
  }

  identifySubject(analysis) {
    if (!analysis) return { type: 'unknown', confidence: 0 };

    const greenRatio = analysis.greenRatio;
    const brightness = analysis.brightness;
    const complexity = analysis.edgeComplexity;
    const colors = analysis.dominantColors;

    if (greenRatio > 0.3 && complexity > 0.05) {
      return { type: 'plant', confidence: Math.min(0.9, 0.5 + greenRatio * 0.5), greenRatio, brightness, complexity };
    }
    if (greenRatio < 0.1 && brightness > 100 && complexity < 0.02) {
      return { type: 'indoor_surface', confidence: 0.4, greenRatio, brightness, complexity };
    }
    if (brightness < 30) {
      return { type: 'dark_scene', confidence: 0.3, greenRatio, brightness, complexity };
    }
    if (complexity > 0.15) {
      return { type: 'complex_scene', confidence: 0.35, greenRatio, brightness, complexity };
    }
    return { type: 'unknown', confidence: 0.2, greenRatio, brightness, complexity };
  }

  async recognizeSubject(imageData) {
    const analysis = await this.analyzeFrame(imageData);
    const identification = this.identifySubject(analysis);

    const matchedSpecies = this._matchSpeciesFromVisual(identification);
    const matchedOrganism = this._matchOrganismFromContext(matchedSpecies);
    const knowledgeContext = this._getKnowledgeContext(matchedSpecies, matchedOrganism);

    const result = {
      analysis,
      identification,
      matchedSpecies,
      matchedOrganism,
      knowledgeContext,
      timestamp: Date.now(),
      recommendations: this._generateRecommendations(matchedOrganism, matchedSpecies)
    };

    this.lastRecognition = result;
    this.recognitionHistory.push(result);
    if (this.recognitionHistory.length > 100) this.recognitionHistory.shift();

    return result;
  }

  _matchSpeciesFromVisual(identification) {
    if (identification.type !== 'plant' || !this.speciesDB) return null;
    const profiles = Array.from(this.speciesDB.profiles.values());
    const green = identification.greenRatio || 0;
    const bright = identification.brightness || 128;
    let best = null, bestScore = -1;
    for (const p of profiles) {
      let score = 0;
      if (p.rhythm === 'diurnal' && bright > 80) score += 0.4;
      if (p.rhythm === 'nocturnal' && bright < 80) score += 0.4;
      if (green > 0.3) score += 0.3;
      if (p.leafShape === 'broad' && green > 0.2) score += 0.2;
      if (p.leafShape === 'needle' && green > 0.1) score += 0.2;
      if (p.waterNeeds === 'high' && green > 0.4) score += 0.1;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best || profiles[0] || null;
  }

  _matchOrganismFromContext(species) {
    if (!species || !this.twinEngine) return null;
    const twins = this.twinEngine.getAll();
    return twins.find(t => t.species === species.id) || twins[0] || null;
  }

  _getKnowledgeContext(species, organism) {
    if (!this.kg) return { nodes: [], edges: [] };
    const nodeId = organism?.id || species?.id;
    if (!nodeId) return { nodes: [], edges: [] };
    return this.kg.getSubgraph(nodeId, 1);
  }

  _generateRecommendations(organism, species) {
    const recs = [];
    if (organism) {
      const state = organism.state || {};
      if (state.stressIndex > 0.5) recs.push({ type: 'alert', text: 'Stress detected — check water and light', urgency: 'high' });
      if (state.healthScore < 0.6) recs.push({ type: 'alert', text: 'Health score declining — review care routine', urgency: 'medium' });
      recs.push({ type: 'action', text: 'Start monitoring', action: 'start_monitoring' });
      recs.push({ type: 'action', text: 'View timeline', action: 'view_timeline' });
    }
    if (species) {
      recs.push({ type: 'info', text: `${species.commonName} — ${species.notes?.substring(0, 80) || 'No notes'}` });
    }
    return recs;
  }

  generateOverlay(recognition) {
    if (!recognition) return [];
    const overlays = [];
    const id = recognition.identification;
    const org = recognition.matchedOrganism;
    const sp = recognition.matchedSpecies;

    overlays.push({
      type: 'identity',
      text: sp ? `${sp.commonName} (${sp.scientificName})` : id.type,
      color: '#3b82f6'
    });

    if (org) {
      const state = org.state || {};
      overlays.push({
        type: 'health',
        text: `Health: ${(state.healthScore || 0).toFixed(2)} | Stress: ${(state.stressIndex || 0).toFixed(2)}`,
        color: (state.healthScore || 0) > 0.7 ? '#22c55e' : '#f59e0b'
      });
    }

    for (const rec of recognition.recommendations) {
      overlays.push({
        type: 'recommendation',
        text: rec.text,
        color: rec.urgency === 'high' ? '#ef4444' : rec.urgency === 'medium' ? '#f59e0b' : '#3b82f6'
      });
    }

    return overlays;
  }

  renderOverlay(overlays) {
    const overlayEl = document.getElementById('lens-overlay');
    if (!overlayEl) return;
    overlayEl.innerHTML = overlays.map(o =>
      `<div style="background:rgba(0,0,0,0.7);color:${o.color};padding:4px 10px;margin:4px;border-radius:4px;font:13px/1.4 Inter,sans-serif;border-left:3px solid ${o.color}">${o.text}</div>`
    ).join('');
  }

  async scan(organismId) {
    const imageData = await this.captureFrame();
    if (!imageData) return null;
    const recognition = await this.recognizeSubject(imageData);
    const overlays = this.generateOverlay(recognition);
    this.renderOverlay(overlays);
    return { recognition, overlays };
  }

  stopScanning() {
    this.isCapturing = false;
  }

  getRecognitionHistory() { return this.recognitionHistory.slice(-50); }
  getLastRecognition() { return this.lastRecognition; }
}