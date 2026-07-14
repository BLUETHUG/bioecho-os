/// Adaptive spike detector for bioelectric signals
pub struct SpikeDetector {
    sample_rate: f64,
    threshold_mult: f64,
    refractory_ms: f64,

    // Running stats for adaptive threshold
    mean: f64,
    mad: f64,   // Median absolute deviation (approximated via running)
    n_samples: f64,
    alpha: f64, // Smoothing factor for running stats

    // Refractory period tracking
    samples_since_last_spike: f64,
    refractory_samples: f64,
}

impl SpikeDetector {
    pub fn new(sample_rate: f64, threshold_mult: f64, refractory_ms: f64) -> Self {
        SpikeDetector {
            sample_rate,
            threshold_mult,
            refractory_ms,
            mean: 0.0,
            mad: 1.0,
            n_samples: 0.0,
            alpha: 0.001,
            samples_since_last_spike: 0.0,
            refractory_samples: sample_rate * refractory_ms / 1000.0,
        }
    }

    /// Process one sample, return SpikeEvent if a spike is detected
    pub fn process(&mut self, x: f64) -> Option<SpikeEvent> {
        self.samples_since_last_spike += 1.0;
        self.n_samples += 1.0;

        // Update running mean and MAD (robust noise estimation)
        let delta = x - self.mean;
        self.mean += self.alpha * delta;
        self.mad += self.alpha * (delta.abs() - self.mad);

        let threshold = self.threshold_mult * self.mad;

        // Check for spike peak (exceeds threshold, past refractory period)
        if self.n_samples > 100.0
            && x.abs() > threshold
            && x.abs() > self.mad * 2.0  // Minimum SNR requirement
            && self.samples_since_last_spike > self.refractory_samples
            && self.samples_since_last_spike > self.sample_rate * 0.001 // 1ms min
        {
            let amplitude = x;
            self.samples_since_last_spike = 0.0;

            let event = SpikeEvent {
                timestamp: self.n_samples / self.sample_rate,
                amplitude,
                threshold,
                noise_floor: self.mad,
                snr: amplitude.abs() / self.mad,
            };

            return Some(event);
        }

        None
    }

    pub fn reset(&mut self) {
        self.mean = 0.0;
        self.mad = 1.0;
        self.n_samples = 0.0;
        self.samples_since_last_spike = 0.0;
    }
}

#[derive(Clone, Debug)]
pub struct SpikeEvent {
    pub timestamp: f64,   // seconds
    pub amplitude: f64,   // µV
    pub threshold: f64,   // µV (detection threshold at time of spike)
    pub noise_floor: f64, // µV
    pub snr: f64,         // signal-to-noise ratio
}
