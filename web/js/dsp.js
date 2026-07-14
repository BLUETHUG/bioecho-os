// BioEcho DSP Engine — Production signal processing

class Biquad {
  constructor(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0/a0; this.b1 = b1/a0; this.b2 = b2/a0;
    this.a1 = a1/a0; this.a2 = a2/a0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
  process(x) {
    const y = this.b0*x + this.b1*this.x1 + this.b2*this.x2 - this.a1*this.y1 - this.a2*this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
  reset() { this.x1=this.x2=this.y1=this.y2=0; }
  static passthrough() { return new Biquad(1,0,0,1,0,0); }
}

class BiquadCascade {
  constructor(s) { this.sections = s; }
  process(x) { return this.sections.reduce((y,s) => s.process(y), x); }
  reset() { this.sections.forEach(s => s.reset()); }
  static passthrough() { return new BiquadCascade([Biquad.passthrough()]); }
}

function biquadCoeffs(type, fc, fs, Q, gain) {
  const w0 = 2*Math.PI*fc/fs, cw=Math.cos(w0), sw=Math.sin(w0);
  const alpha = sw/(2*Q);
  switch(type) {
    case 'highpass':
      return new Biquad((1+cw)/2, -(1+cw), (1+cw)/2, 1+alpha, -2*cw, 1-alpha);
    case 'lowpass':
      return new Biquad((1-cw)/2, 1-cw, (1-cw)/2, 1+alpha, -2*cw, 1-alpha);
    case 'bandpass':
      return new Biquad(alpha, 0, -alpha, 1+alpha, -2*cw, 1-alpha);
    case 'notch':
      return new Biquad(1, -2*cw, 1, 1+alpha, -2*cw, 1-alpha);
    case 'peaking': {
      const A = Math.pow(10, gain/40);
      const b0 = 1+alpha*A, b2 = 1-alpha*A;
      return new Biquad(b0, -2*cw, b2, 1+alpha/A, -2*cw, 1-alpha/A);
    }
    default: return Biquad.passthrough();
  }
}

class SpikeDetector {
  constructor(sampleRate, thresholdMult=3.5, refractoryMs=50) {
    this.sampleRate = sampleRate;
    this.thresholdMult = thresholdMult;
    this.mean = 0; this.mad = 1; this.n = 0;
    this.alpha = 0.0005;
    this.sinceLast = 0;
    this.refract = sampleRate * refractoryMs / 1000;
    this.minAge = sampleRate * 0.001;
  }

  process(x) {
    this.sinceLast++;
    this.n++;
    const delta = x - this.mean;
    this.mean += this.alpha * delta;
    this.mad += this.alpha * (Math.abs(delta) - this.mad);
    const thresh = this.thresholdMult * this.mad;

    if (this.n > 200 && Math.abs(x) > thresh && Math.abs(x) > this.mad * 2
        && this.sinceLast > this.refract && this.sinceLast > this.minAge) {
      this.sinceLast = 0;
      return {
        timestamp: this.n / this.sampleRate,
        amplitude: x,
        threshold: thresh,
        noiseFloor: this.mad,
        snr: Math.abs(x) / this.mad
      };
    }
    return null;
  }

  reset() { this.mean=0; this.mad=1; this.n=0; this.sinceLast=0; }
}

class DspPipeline {
  constructor(sampleRate=250) {
    this.sampleRate = sampleRate;
    this.highpass = new BiquadCascade([biquadCoeffs('highpass', 0.01, sampleRate, 0.707)]);
    this.notch50 = new BiquadCascade([biquadCoeffs('notch', 50, sampleRate, 30)]);
    this.notch60 = new BiquadCascade([biquadCoeffs('notch', 60, sampleRate, 30)]);
    this.bandpass = new BiquadCascade([
      biquadCoeffs('bandpass', 0.5, sampleRate, 0.5412),
      biquadCoeffs('bandpass', 0.5, sampleRate, 1.3066)
    ]);
    this.detector = new SpikeDetector(sampleRate, 3.5, 50);
    this.filtersOn = true;
    this.notchOn = true;
    this.calibrated = false;
    this.offset = 0;
    this.gain = 1.0;
    this.calSamples = 0;
    this.calSum = 0;
  }

  calibrate() {
    this.offset = 0;
    this.calSamples = 0;
    this.calSum = 0;
  }

  process(x) {
    // Apply gain and subtract calibration offset
    let y = (x - this.offset) * this.gain;

    if (this.filtersOn) {
      y = this.highpass.process(y);
      if (this.notchOn) {
        y = this.notch50.process(y);
        y = this.notch60.process(y);
      }
      y = this.bandpass.process(y);
    }
    return { filtered: y, spike: this.detector.process(y), raw: x };
  }

  reset() {
    this.highpass.reset(); this.notch50.reset(); this.notch60.reset();
    this.bandpass.reset(); this.detector.reset();
  }
}

// Feature extraction from spike window
function extractSpikeFeatures(waveform, sampleRate) {
  const n = waveform.length;
  if (n < 10) return null;

  const peakIdx = waveform.reduce((best,v,i,a) => Math.abs(v)>Math.abs(a[best])?i:best,0);
  const peakVal = waveform[peakIdx];
  const maxV = Math.max(...waveform), minV = Math.min(...waveform);
  const amplitude = maxV - minV;

  // Duration (half-max width)
  const halfMax = Math.abs(peakVal)/2;
  let left=0, right=n-1;
  for (let i=peakIdx-1;i>=0;i--) { if(Math.abs(waveform[i])<=halfMax){left=i;break;} }
  for (let i=peakIdx;i<n;i++) { if(Math.abs(waveform[i])<=halfMax){right=i;break;} }
  const duration = (right-left)/sampleRate*1000;

  // Rise time
  const t10=Math.abs(peakVal)*0.1, t90=Math.abs(peakVal)*0.9;
  let rs=0, re=peakIdx;
  for(let i=0;i<peakIdx;i++){if(Math.abs(waveform[i])>=t10){rs=i;break;}}
  for(let i=rs;i<peakIdx;i++){if(Math.abs(waveform[i])>=t90){re=i;break;}}
  const riseTime = (re-rs)/sampleRate*1000;

  // Fall time
  let fs=peakIdx, fe=n-1;
  for(let i=peakIdx;i<n;i++){if(Math.abs(waveform[i])<=t90){fs=i;break;}}
  for(let i=fs;i<n;i++){if(Math.abs(waveform[i])<=t10){fe=i;break;}}
  const fallTime = (fe-fs)/sampleRate*1000;

  // Area
  const area = waveform.reduce((s,v)=>s+Math.abs(v),0)/sampleRate*1000;

  // Slew rate
  let maxSlew=0;
  for(let i=1;i<n;i++){const s=Math.abs((waveform[i]-waveform[i-1])*sampleRate/1e6);if(s>maxSlew)maxSlew=s;}

  // FFT features
  const fftSize = 1<<Math.ceil(Math.log2(n));
  const fft = new FFT(fftSize);
  const complex = fft.createComplexArray();
  fft.toComplexArray(waveform, complex);
  fft.transform(complex, complex);
  const half = fftSize/2;
  const power=[]; let totalPower=0;
  for(let i=0;i<half;i++){const p=complex[2*i]**2+complex[2*i+1]**2;power.push(p);totalPower+=p;}
  const domBin = power.reduce((b,v,i)=>v>power[b]?i:b,0);
  const dominantFreq = domBin*sampleRate/fftSize;
  const mid=Math.floor(half/2);
  const lowP=power.slice(0,mid).reduce((s,p)=>s+p,0);
  const highP=power.slice(mid).reduce((s,p)=>s+p,0);
  const powerRatio = highP>0?lowP/highP:1;
  const specEntropy = totalPower>0
    ? -power.reduce((s,p)=>{const n=p/totalPower;return s+(n>0?n*Math.log(n):0);},0)/Math.log(half)
    : 0;

  return { amplitude, duration, riseTime, fallTime, area, slewRate: maxSlew,
           dominantFreq, powerRatioLFHF: powerRatio, spectralEntropy: specEntropy };
}

class FFT {
  constructor(size) { this.N=size; this.costable=new Float64Array(size); this.sintable=new Float64Array(size);
    for(let i=0;i<size;i++){this.costable[i]=Math.cos(-2*Math.PI*i/size);this.sintable[i]=Math.sin(-2*Math.PI*i/size);}
  }
  transform(out, data) {
    const N=this.N;
    // Bit reversal
    const bits = Math.log2(N);
    for(let i=0;i<N;i++){
      let r=0, x=i;
      for(let j=0;j<bits;j++){r=(r<<1)|(x&1);x>>=1;}
      out[2*i]=data[2*r]; out[2*i+1]=data[2*r+1];
    }
    for(let len=2;len<=N;len<<=1){
      const half=len>>1;
      for(let i=0;i<N;i+=len){
        for(let j=0;j<half;j++){
          const step=N/len, idx=j*step;
          const c=this.costable[idx], s=this.sintable[idx];
          const tR=out[2*(i+j+half)]*c-out[2*(i+j+half)+1]*s;
          const tI=out[2*(i+j+half)+1]*c+out[2*(i+j+half)]*s;
          out[2*(i+j+half)]=out[2*(i+j)]-tR;
          out[2*(i+j+half)+1]=out[2*(i+j)+1]-tI;
          out[2*(i+j)]+=tR; out[2*(i+j)+1]+=tI;
        }
      }
    }
  }
  createComplexArray(){return new Float64Array(2*this.N);}
  toComplexArray(input,out){for(let i=0;i<this.N;i++){out[2*i]=i<input.length?input[i]:0;out[2*i+1]=0;}}
}
