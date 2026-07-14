/// Biquad filter section (Direct Form I)
#[derive(Clone)]
pub struct Biquad {
    b0: f64, b1: f64, b2: f64,
    a0: f64, a1: f64, a2: f64,
    x1: f64, x2: f64,
    y1: f64, y2: f64,
}

impl Biquad {
    pub fn new(b0: f64, b1: f64, b2: f64, a0: f64, a1: f64, a2: f64) -> Self {
        // Normalize by a0
        Biquad {
            b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
            a0: 1.0, a1: a1 / a0, a2: a2 / a0,
            x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0,
        }
    }

    pub fn passthrough() -> Self {
        Biquad::new(1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    }

    pub fn process(&mut self, x: f64) -> f64 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
              - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }

    pub fn reset(&mut self) {
        self.x1 = 0.0; self.x2 = 0.0;
        self.y1 = 0.0; self.y2 = 0.0;
    }
}

/// Cascade of biquad sections for higher-order filters
#[derive(Clone)]
pub struct BiquadCascade {
    sections: Vec<Biquad>,
}

impl BiquadCascade {
    pub fn new(sections: Vec<Biquad>) -> Self {
        BiquadCascade { sections }
    }

    pub fn passthrough() -> Self {
        BiquadCascade { sections: vec![Biquad::passthrough()] }
    }

    pub fn process(&mut self, x: f64) -> f64 {
        let mut y = x;
        for section in &mut self.sections {
            y = section.process(y);
        }
        y
    }

    pub fn reset(&mut self) {
        for section in &mut self.sections {
            section.reset();
        }
    }
}

// --- Filter Design Functions ---

/// Design a 2nd-order Butterworth high-pass biquad
fn butterworth_hp_section(fc: f64, fs: f64) -> Biquad {
    let w0 = 2.0 * std::f64::consts::PI * fc / fs;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let alpha = sin_w0 / (2.0_f64).sqrt(); // Q = 1/√2 for Butterworth

    let b0 = (1.0 + cos_w0) / 2.0;
    let b1 = -(1.0 + cos_w0);
    let b2 = (1.0 + cos_w0) / 2.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha;

    Biquad::new(b0, b1, b2, a0, a1, a2)
}

/// Design a 4th-order Butterworth bandpass (cascaded 2nd-order sections)
fn butterworth_bp_section(fc_lo: f64, fc_hi: f64, fs: f64, section_idx: usize) -> Biquad {
    let w0 = 2.0 * std::f64::consts::PI * (fc_lo * fc_hi).sqrt() / fs;
    let bw = 2.0 * std::f64::consts::PI * (fc_hi - fc_lo) / fs;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();

    // Butterworth pole placement for bandpass
    let q = match section_idx {
        0 => 0.5412,  // Q for 4th-order Butterworth
        1 => 1.3066,
        _ => 1.0,
    };
    let alpha = sin_w0 / (2.0 * q);

    let b0 = alpha;
    let b1 = 0.0;
    let b2 = -alpha;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha;

    Biquad::new(b0, b1, b2, a0, a1, a2)
}

/// Design a notch filter for mains hum rejection
fn notch_section(fc: f64, fs: f64) -> Biquad {
    let w0 = 2.0 * std::f64::consts::PI * fc / fs;
    let cos_w0 = w0.cos();
    let sin_w0 = w0.sin();
    let q = 30.0; // High Q for narrow notch
    let alpha = sin_w0 / (2.0 * q);

    let b0 = 1.0;
    let b1 = -2.0 * cos_w0;
    let b2 = 1.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha;

    Biquad::new(b0, b1, b2, a0, a1, a2)
}

pub fn butterworth_highpass(order: u32, fc: f64, fs: f64) -> BiquadCascade {
    let n_sections = order / 2;
    let sections: Vec<Biquad> = (0..n_sections)
        .map(|_| butterworth_hp_section(fc, fs))
        .collect();
    BiquadCascade::new(sections)
}

pub fn butterworth_bandpass(order: u32, fc_lo: f64, fc_hi: f64, fs: f64) -> BiquadCascade {
    let n_sections = order / 2;
    let sections: Vec<Biquad> = (0..n_sections)
        .map(|i| butterworth_bp_section(fc_lo, fc_hi, fs, i as usize))
        .collect();
    BiquadCascade::new(sections)
}

pub fn butterworth_notch(order: u32, fc: f64, fs: f64) -> BiquadCascade {
    let n_sections = order / 2;
    let sections: Vec<Biquad> = (0..n_sections)
        .map(|_| notch_section(fc, fs))
        .collect();
    BiquadCascade::new(sections)
}
