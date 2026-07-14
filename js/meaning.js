// BioEcho Meaning Engine
// Converts validated observations into explainable, evidence-backed guidance.

class MeaningEngine {
  constructor(speciesDB) {
    this.species = speciesDB;
    this.explanationHistory = [];
  }

  // Main interpretation function
  // Takes: classification, features, context, calibration result
  // Returns: full explanation with evidence chain, confidence, and optional guidance
  interpret(classification, features, context, calibrationResult) {
    const explanation = {
      timestamp: Date.now(),
      classification,
      confidence: 0,
      statement: '',
      evidence: [],
      evidenceChain: [],
      physics: [],
      scientificRef: null,
      guidance: null,
      confidenceBreakdown: {}
    };

    if (!features || !context) return explanation;

    const speciesProfile = context.species;
    const organism = context.organism;

    // 1. Build evidence chain
    explanation.evidence = this._buildEvidence(features, context);

    // 2. Calculate confidence
    const conf = this._calculateConfidence(features, context, calibrationResult);
    explanation.confidence = conf.total;
    explanation.confidenceBreakdown = conf.breakdown;

    // 3. Build physics explanation
    explanation.physics = this._buildPhysicsExplanation(features, classification);

    // 4. Generate statement
    explanation.statement = this._generateStatement(classification, features, context, conf.total);

    // 5. Scientific reference
    explanation.scientificRef = this._getReference(classification);

    // 6. Guidance
    explanation.guidance = this._generateGuidance(classification, features, context);

    // 7. Evidence chain (full reasoning path)
    explanation.evidenceChain = [
      { step: 'Signal Detection', detail: `Amplitude ${features.amplitude.toFixed(1)} µV, duration ${features.duration.toFixed(0)} ms` },
      { step: 'Feature Extraction', detail: `Freq ${features.dominantFreq.toFixed(2)} Hz, entropy ${features.spectralEntropy.toFixed(2)}, FD ${features.fractalDimension.toFixed(2)}` },
      { step: 'Classification', detail: `${classification} (${(conf.total*100).toFixed(0)}% confidence)` },
      { step: 'Context Check', detail: `Hour ${context.time.hourOfDay}, stress trend ${context.history.stressTrend}` },
      ...(speciesProfile ? [{ step: 'Species Profile', detail: `${speciesProfile.commonName}: expected range ${speciesProfile.voltageRange[0]}–${speciesProfile.voltageRange[1]} µV` }] : []),
      ...(calibrationResult ? [{ step: 'Signal Quality', detail: `Score ${calibrationResult.score}/100 (${calibrationResult.quality})` }] : [])
    ];

    this.explanationHistory.push(explanation);
    if (this.explanationHistory.length > 500) this.explanationHistory.shift();
    return explanation;
  }

  _buildEvidence(features, context) {
    const evidence = [];
    const { organism, environment, history } = context;

    // Amplitude
    const ampTrend = features.amplitude > (organism?.baselineAmplitude || 5) * 2 ? 'up' : 'normal';
    evidence.push({ label: 'Amplitude', value: `${features.amplitude.toFixed(1)} µV`, trend: ampTrend });

    // Duration
    evidence.push({ label: 'Duration', value: `${features.duration.toFixed(0)} ms`, trend: features.duration > 400 ? 'long' : 'normal' });

    // Frequency
    const freqTrend = features.dominantFreq < 0.3 ? 'down' : features.dominantFreq > 2 ? 'up' : 'normal';
    evidence.push({ label: 'Frequency', value: `${features.dominantFreq.toFixed(2)} Hz`, trend: freqTrend });

    // Rise time
    evidence.push({ label: 'Rise Time', value: `${features.riseTime.toFixed(0)} ms`, trend: features.riseTime < 50 ? 'fast' : 'normal' });

    // Entropy
    evidence.push({ label: 'Entropy', value: `${features.spectralEntropy.toFixed(2)}`, trend: features.spectralEntropy > 0.6 ? 'high' : 'normal' });

    // Environment
    if (environment.temperature !== null) evidence.push({ label: 'Temperature', value: `${environment.temperature.toFixed(1)}°C`, trend: environment.temperature > 30 ? 'up' : 'normal' });
    if (environment.soilMoisture !== null) evidence.push({ label: 'Soil Moisture', value: `${environment.soilMoisture.toFixed(0)}%`, trend: environment.soilMoisture < 30 ? 'down' : 'normal' });

    // Context
    evidence.push({ label: 'Time of Day', value: `${context.time.hourOfDay}:00`, trend: context.time.isDaytime ? 'day' : 'night' });
    evidence.push({ label: 'Stress Trend', value: history.stressTrend, trend: history.stressTrend });

    return evidence;
  }

  _calculateConfidence(features, context, calibrationResult) {
    const breakdown = {};
    let total = 0.5; // base

    // Calibration quality bonus
    if (calibrationResult) {
      if (calibrationResult.score >= 80) { total += 0.1; breakdown.calibration = 0.1; }
      else if (calibrationResult.score >= 50) { total += 0.05; breakdown.calibration = 0.05; }
      else { total -= 0.1; breakdown.calibration = -0.1; }
    }

    // Feature clarity
    if (features.amplitude > 20) { total += 0.1; breakdown.amplitude = 0.1; }
    else if (features.amplitude < 3) { total -= 0.1; breakdown.amplitude = -0.1; }

    // Context consistency
    if (context.history.stressTrend === 'increasing') { total += 0.05; breakdown.context = 0.05; }
    if (context.history.recentEvents > 5) { total += 0.05; breakdown.history = 0.05; }

    // Entropy (high = complex signal, more information)
    if (features.spectralEntropy > 0.5) { total += 0.05; breakdown.entropy = 0.05; }

    total = Math.max(0.1, Math.min(0.95, total));
    return { total, breakdown };
  }

  _buildPhysicsExplanation(features, classification) {
    const explanations = {
      water_stress: [
        'Reduced turgor pressure affects ion channel activity',
        'Cell membrane depolarization pattern consistent with osmotic stress',
        'Dominant frequency shift suggests altered xylem transport dynamics'
      ],
      touch_response: [
        'Rapid depolarization consistent with mechanosensitive ion channel activation',
        'All-or-nothing response pattern matches action potential propagation',
        'Signal morphology matches literature reports for touch-induced responses'
      ],
      wounding: [
        'Large-amplitude variation potential from wound-induced membrane damage',
        'Slow propagation consistent with hydraulic signal in xylem',
        'Decaying waveform matches passive spread model'
      ],
      resting: [
        'Baseline electrical activity within normal physiological range',
        'No anomalous depolarization events detected',
        'Steady-state membrane potential maintained'
      ],
      unknown: [
        'Signal detected but does not closely match known response patterns',
        'May represent uncharacterized physiological state or measurement artifact',
        'Further observation recommended'
      ]
    };
    return explanations[classification] || explanations.unknown;
  }

  _generateStatement(classification, features, context, confidence) {
    const confPct = (confidence * 100).toFixed(0);
    const labels = {
      water_stress: `Electrical signature consistent with water stress (${confPct}% confidence). Amplitude ${features.amplitude.toFixed(1)} µV at ${features.dominantFreq.toFixed(2)} Hz.`,
      touch_response: `Detected touch-type electrical response (${confPct}% confidence). Rapid depolarization with ${features.riseTime.toFixed(0)} ms rise time.`,
      wounding: `Large electrical transient detected (${confPct}% confidence). Signal amplitude ${features.amplitude.toFixed(1)} µV, duration ${features.duration.toFixed(0)} ms.`,
      resting: `Resting state. Baseline activity at ${features.amplitude.toFixed(1)} µV within normal range.`,
      unknown: `Electrical transient detected (${confPct}% confidence). Pattern does not closely match known responses.`
    };
    return labels[classification] || labels.unknown;
  }

  _getReference(classification) {
    const refs = {
      water_stress: { paper: 'Buss et al. 2026, arXiv:2604.28038', title: 'Early detection of water stress via plant electrophysiology' },
      touch_response: { paper: 'Zhou et al. 2025, Biosensors & Bioelectronics', title: 'ML-assisted implantable plant electrophysiology sensor' },
      wounding: { paper: 'Fromm & Lautner 2007, Plant, Cell & Environment', title: 'Electrical signals and their physiological significance in plants' },
      resting: { paper: 'Standard plant electrophysiology', title: 'Normal baseline membrane potential' }
    };
    return refs[classification] || null;
  }

  _generateGuidance(classification, features, context) {
    if (classification === 'water_stress') {
      return {
        action: 'Check soil moisture and consider watering',
        urgency: features.amplitude > 30 ? 'soon' : 'when convenient',
        rationale: `Electrical stress indicators active. Soil moisture: ${context.environment.soilMoisture ?? 'unknown'}%.`
      };
    }
    if (classification === 'wounding') {
      return {
        action: 'Inspect plant for physical damage',
        urgency: 'check now',
        rationale: 'Large transient consistent with membrane damage.'
      };
    }
    return null;
  }

  getExplanationHistory() { return this.explanationHistory; }
  getLatest() { return this.explanationHistory[this.explanationHistory.length - 1] || null; }
}
