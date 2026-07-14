// BioEcho Species Profiles Database
// Grounded in published plant electrophysiology literature.

class SpeciesDB {
  constructor() {
    this.profiles = new Map();
    this._initDefaults();
  }

  _initDefaults() {
    // Based on: Fromm & Lautner 2007, Zimmermann et al. 2016, Pavis et al. 2023
    this.add({
      id: 'epipremnum-aureum',
      commonName: 'Golden Pothos',
      scientificName: 'Epipremnum aureum',
      family: 'Araceae',
      type: 'plant',
      voltageRange: [2, 50],    // µV typical range for surface electrodes
      typicalSpikeDuration: [80, 300],  // ms
      typicalRiseTime: [10, 60],         // ms
      dominantFreqRange: [0.1, 2],       // Hz
      recoveryTime: 300,                 // seconds to baseline after stimulus
      rhythm: 'diurnal',                 // follows light/dark cycle
      notes: 'Common houseplant. Shows clear action potentials in response to light changes and mechanical stimuli.',
      stressIndicators: {
        water: { amplitudeIncrease: 2.5, freqDecrease: 0.4 },
        temperature: { amplitudeIncrease: 2, entropyIncrease: 0.3 }
      }
    });

    this.add({
      id: 'mimosa-pudica',
      commonName: 'Sensitive Plant',
      scientificName: 'Mimosa pudica',
      family: 'Fabaceae',
      type: 'plant',
      voltageRange: [5, 80],
      typicalSpikeDuration: [50, 250],
      typicalRiseTime: [5, 40],
      dominantFreqRange: [0.2, 3],
      recoveryTime: 600,
      rhythm: 'diurnal',
      notes: 'Rapid leaf folding response. Well-studied for plant electrical signaling. Shows both action and variation potentials.',
      stressIndicators: {
        touch: { amplitudeIncrease: 5, freqIncrease: 1 },
        water: { amplitudeIncrease: 3, freqDecrease: 0.5 }
      }
    });

    this.add({
      id: 'venus-flytrap',
      commonName: 'Venus Flytrap',
      scientificName: 'Dionaea muscipula',
      family: 'Droseraceae',
      type: 'plant',
      voltageRange: [10, 120],
      typicalSpikeDuration: [30, 200],
      typicalRiseTime: [3, 30],
      dominantFreqRange: [0.5, 5],
      recoveryTime: 1200,
      rhythm: 'diurnal',
      notes: 'Trigger hair stimulation produces action potentials. Requires 2 stimuli within 30s for trap closure.',
      stressIndicators: {
        touch: { amplitudeIncrease: 8, freqIncrease: 2 },
        wounding: { amplitudeIncrease: 10, durationIncrease: 100 }
      }
    });

    this.add({
      id: 'helianthus-anuus',
      commonName: 'Sunflower',
      scientificName: 'Helianthus annuus',
      family: 'Asteraceae',
      type: 'plant',
      voltageRange: [3, 40],
      typicalSpikeDuration: [100, 400],
      typicalRiseTime: [15, 80],
      dominantFreqRange: [0.05, 1],
      recoveryTime: 600,
      rhythm: 'diurnal',
      notes: 'Heliotropic movement tracked by electrical signals. Good model for light-response studies.',
      stressIndicators: {
        water: { amplitudeIncrease: 2, freqDecrease: 0.3 },
        temperature: { amplitudeIncrease: 1.5, entropyIncrease: 0.2 }
      }
    });

    this.add({
      id: 'solanum-lycopersicum',
      commonName: 'Tomato',
      scientificName: 'Solanum lycopersicum',
      family: 'Solanaceae',
      type: 'plant',
      voltageRange: [2, 35],
      typicalSpikeDuration: [80, 350],
      typicalRiseTime: [10, 70],
      dominantFreqRange: [0.1, 1.5],
      recoveryTime: 450,
      rhythm: 'diurnal',
      notes: 'Well-studied in greenhouse electrophysiology. Water stress detection validated (Buss et al. 2026).',
      stressIndicators: {
        water: { amplitudeIncrease: 2.5, freqDecrease: 0.4 },
        wounding: { amplitudeIncrease: 4, durationIncrease: 150 }
      }
    });
  }

  add(profile) { this.profiles.set(profile.id, profile); }
  getProfile(id) { return this.profiles.get(id); }
  getByScientificName(name) {
    return Array.from(this.profiles.values()).find(p =>
      p.scientificName.toLowerCase() === name.toLowerCase()
    );
  }
  search(query) {
    const q = query.toLowerCase();
    return Array.from(this.profiles.values()).filter(p =>
      p.commonName.toLowerCase().includes(q) ||
      p.scientificName.toLowerCase().includes(q) ||
      p.family.toLowerCase().includes(q)
    );
  }
  listAll() { return Array.from(this.profiles.values()); }
}
