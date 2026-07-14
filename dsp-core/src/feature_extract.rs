use num_complex::Complex;

/// Features extracted from a spike waveform window
#[derive(Clone, Debug)]
pub struct SpikeFeatures {
    // Time-domain features
    pub amplitude: f64,        // Peak-to-peak µV
    pub duration: f64,         // Width at half-max (ms)
    pub rise_time: f64,        // 10% to 90% rise (ms)
    pub fall_time: f64,        // 90% to 10% fall (ms)
    pub area: f64,             // Integral µV·ms
    pub slew_rate: f64,        // Max dV/dt (V/s)

    // Frequency-domain features
    pub dominant_freq: f64,    // Hz
    pub power_ratio_lf_hf: f64, // Low/high frequency ratio
    pub spectral_entropy: f64, // 0-1

    // Complexity features
    pub fractal_dimension: f64, // 1-2 (Higuchi method)
}

/// Extract features from a spike waveform window
pub fn extract_spike_features(waveform: &[f64], sample_rate: f64) -> SpikeFeatures {
    let n = waveform.len();
    if n < 10 {
        return SpikeFeatures::default();
    }

    // Find peak index (positive or negative)
    let peak_idx = waveform.iter()
        .enumerate()
        .max_by(|a, b| a.1.abs().partial_cmp(&b.1.abs()).unwrap())
        .map(|(i, _)| i)
        .unwrap_or(n / 2);
    let peak_val = waveform[peak_idx];

    // Amplitude (peak-to-peak in window)
    let max_val = waveform.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let min_val = waveform.iter().cloned().fold(f64::INFINITY, f64::min);
    let amplitude = max_val - min_val;

    // Half-max width (duration)
    let half_max = peak_val.abs() / 2.0;
    let mut left_idx = 0;
    let mut right_idx = n - 1;
    for i in (0..peak_idx).rev() {
        if waveform[i].abs() <= half_max {
            left_idx = i;
            break;
        }
    }
    for i in peak_idx..n {
        if waveform[i].abs() <= half_max {
            right_idx = i;
            break;
        }
    }
    let duration = (right_idx - left_idx) as f64 / sample_rate * 1000.0;

    // Rise time (10% to 90%)
    let ten_pct = peak_val.abs() * 0.1;
    let ninety_pct = peak_val.abs() * 0.9;
    let mut rise_start = 0;
    let mut rise_end = peak_idx;
    for i in 0..peak_idx {
        if waveform[i].abs() >= ten_pct {
            rise_start = i;
            break;
        }
    }
    for i in rise_start..peak_idx {
        if waveform[i].abs() >= ninety_pct {
            rise_end = i;
            break;
        }
    }
    let rise_time = (rise_end - rise_start) as f64 / sample_rate * 1000.0;

    // Fall time (90% to 10%)
    let mut fall_start = peak_idx;
    let mut fall_end = n - 1;
    for i in peak_idx..n {
        if waveform[i].abs() <= ninety_pct {
            fall_start = i;
            break;
        }
    }
    for i in fall_start..n {
        if waveform[i].abs() <= ten_pct {
            fall_end = i;
            break;
        }
    }
    let fall_time = (fall_end - fall_start) as f64 / sample_rate * 1000.0;

    // Area under curve
    let area = waveform.iter().map(|&x| x.abs()).sum::<f64>() / sample_rate * 1000.0;

    // Slew rate (max dV/dt)
    let mut max_slew = 0.0;
    for i in 1..n {
        let slew = (waveform[i] - waveform[i-1]) * sample_rate / 1_000_000.0; // V/s
        max_slew = max_slew.max(slew.abs());
    }

    // FFT-based features
    let fft_size = n.next_power_of_two();
    let mut signal: Vec<Complex<f64>> = waveform.iter()
        .chain(std::iter::repeat(&0.0))
        .take(fft_size)
        .map(|&x| Complex::new(x, 0.0))
        .collect();

    let mut planner = rustfft::FftPlanner::new();
    let fft = planner.plan_fft_forward(fft_size);
    fft.process(&mut signal);

    // Power spectrum
    let half = fft_size / 2;
    let mut power: Vec<f64> = (0..half)
        .map(|i| signal[i].norm_sqr())
        .collect();
    let total_power: f64 = power.iter().sum();

    // Dominant frequency
    let (dominant_bin, _) = power.iter()
        .enumerate()
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
        .unwrap_or((0, &0.0));
    let dominant_freq = dominant_bin as f64 * sample_rate / fft_size as f64;

    // Low/high frequency power ratio (split at median freq)
    let mid = half / 2;
    let low_power: f64 = power[0..mid].iter().sum();
    let high_power: f64 = power[mid..half].iter().sum();
    let power_ratio_lf_hf = if high_power > 0.0 { low_power / high_power } else { 1.0 };

    // Spectral entropy
    let spectral_entropy = if total_power > 0.0 {
        -power.iter()
            .map(|&p| { let norm = p / total_power; if norm > 0.0 { norm * norm.ln() } else { 0.0 } })
            .sum::<f64>() / (half as f64).ln()
    } else {
        0.0
    };

    // Fractal dimension (Higuchi method)
    let fractal_dimension = higuchi_fd(waveform, 10);

    SpikeFeatures {
        amplitude,
        duration,
        rise_time,
        fall_time,
        area,
        slew_rate: max_slew,
        dominant_freq,
        power_ratio_lf_hf,
        spectral_entropy,
        fractal_dimension,
    }
}

/// Higuchi fractal dimension
fn higuchi_fd(signal: &[f64], k_max: usize) -> f64 {
    let n = signal.len();
    if n < k_max + 1 {
        return 1.0;
    }

    let mut lengths = Vec::new();

    for k in 1..=k_max {
        let mut total_length = 0.0;
        for m in 0..k {
            let mut sum = 0.0;
            let mut count = 0;
            let mut i = m;
            while i + k < n {
                sum += (signal[i + k] - signal[i]).abs();
                count += 1;
                i += k;
            }
            if count > 0 {
                let scale = (n as f64 - 1.0) / (count as f64 * k as f64);
                total_length += sum * scale;
            }
        }
        let avg_length = total_length / k as f64;
        lengths.push((k as f64, avg_length));
    }

    // Linear regression: log(length) vs log(1/k)
    let n_points = lengths.len() as f64;
    let sum_x: f64 = lengths.iter().map(|(k, _)| (1.0 / k).ln()).sum();
    let sum_y: f64 = lengths.iter().map(|(_, l)| l.ln()).sum();
    let sum_xy: f64 = lengths.iter().map(|(k, l)| (1.0 / k).ln() * l.ln()).sum();
    let sum_x2: f64 = lengths.iter().map(|(k, _)| (1.0 / k).ln().powi(2)).sum();

    if (n_points * sum_x2 - sum_x * sum_x).abs() < 1e-10 {
        return 1.0;
    }

    let slope = (n_points * sum_xy - sum_x * sum_y) / (n_points * sum_x2 - sum_x * sum_x);
    slope // FD = slope (for Higuchi method)
}

impl Default for SpikeFeatures {
    fn default() -> Self {
        SpikeFeatures {
            amplitude: 0.0,
            duration: 0.0,
            rise_time: 0.0,
            fall_time: 0.0,
            area: 0.0,
            slew_rate: 0.0,
            dominant_freq: 0.0,
            power_ratio_lf_hf: 1.0,
            spectral_entropy: 1.0,
            fractal_dimension: 1.0,
        }
    }
}
