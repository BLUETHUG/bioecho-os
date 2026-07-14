pub mod filters;
pub mod spike_detector;
pub mod feature_extract;

use filters::BiquadCascade;
use spike_detector::{SpikeEvent, SpikeDetector};
use feature_extract::SpikeFeatures;

/// Complete DSP pipeline for one sample
pub struct DspPipeline {
    pub highpass: BiquadCascade,
    pub notch: BiquadCascade,
    pub bandpass: BiquadCascade,
    pub detector: SpikeDetector,
    sample_rate: f64,
}

impl DspPipeline {
    pub fn new(sample_rate: f64, signal_type: SignalType) -> Self {
        use filters::*;

        let (hp_cutoff, notch_freq, bp_lo, bp_hi) = match signal_type {
            SignalType::Plant => (0.01, 50.0, 0.1, 100.0),
            SignalType::Audio => (20.0, 0.0, 20.0, 20000.0),
        };

        DspPipeline {
            highpass: butterworth_highpass(2, hp_cutoff, sample_rate),
            notch: if notch_freq > 0.0 {
                butterworth_notch(2, notch_freq, sample_rate)
            } else {
                BiquadCascade::passthrough()
            },
            bandpass: butterworth_bandpass(4, bp_lo, bp_hi, sample_rate),
            detector: SpikeDetector::new(sample_rate, 3.5, 50.0),
            sample_rate,
        }
    }

    /// Process a single sample through the entire pipeline
    pub fn process(&mut self, sample: f64) -> ProcessedSample {
        let x1 = self.highpass.process(sample);
        let x2 = self.notch.process(x1);
        let x3 = self.bandpass.process(x2);
        let spike = self.detector.process(x3);

        ProcessedSample {
            filtered: x3,
            spike,
        }
    }

    /// Process a buffer of samples
    pub fn process_buffer(&mut self, samples: &[f64]) -> Vec<ProcessedSample> {
        samples.iter().map(|&s| self.process(s)).collect()
    }
}

pub enum SignalType {
    Plant,
    Audio,
}

pub struct ProcessedSample {
    pub filtered: f64,
    pub spike: Option<SpikeEvent>,
}
