# BioEcho OS

**Real-Time Biological Intelligence Platform**

Measure, model, predict, and interact with living organisms using physics, signal processing, AI, and robotics.

## Quick Start

### Web App (no build step, works immediately)

```bash
cd web
# Serve with any HTTP server:
python -m http.server 8080
# Or: npx serve .
# Or: npx live-server
```

Open http://localhost:8080 in Chrome or Edge.

The web app works immediately with:
- **Simulated plant signal** — realistic synthetic data with drift, noise, and spikes
- **USB serial** — connect a Backyard Brains SpikerBox or DIY ESP32 node via Web Serial API
- **Microphone** — live audio capture for bioacoustic analysis

### ESP32 DIY Hardware

See `firmware/esp32-diy/README.md` for wiring, calibration, and flashing instructions.

### Backend (optional — for multi-user and ML)

```bash
cd backend
docker compose up -d
```

Starts: API (:8081), ML Service (:8082), Chat Service (:8083), InfluxDB, PostgreSQL, MinIO, NATS, Grafana (:3000).

### DSP Core (shared Rust library)

```bash
cd dsp-core
cargo build --release
wasm-pack build --target web  # for browser use
```

## Project Structure

```
bioecho/
├── web/                    # Web app (HTML/CSS/JS, no build required)
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── app.js          # Main controller
│       ├── dsp.js          # DSP pipeline (filters, FFT, spike detector)
│       ├── signal-sim.js   # Realistic plant signal generator
│       ├── chart.js        # Canvas waveform + spectrogram rendering
│       ├── serial.js       # Web Serial API (SpikerBox/ESP32)
│       ├── audio-capture.js# Microphone via Web Audio API
│       ├── chat.js         # Evidence-backed chat interface
│       ├── twin.js         # Digital twin state management
│       ├── organism.js     # Organism list UI
│       └── ui.js           # UI helpers
├── dsp-core/               # Rust DSP library (shared: WASM + native)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── filters.rs      # Butterworth biquad filters
│       ├── spike_detector.rs
│       └── feature_extract.rs
├── firmware/
│   ├── spikerbox-compat/   # BYB-compatible Arduino firmware
│   └── esp32-diy/          # ESP32 + ADS1115 plant node
├── backend/
│   ├── api/                # Rust API (Actix-web)
│   ├── ml-service/         # Python ML (FastAPI + BirdNET)
│   ├── chat-service/       # Python chat (FastAPI, template-based)
│   ├── docker-compose.yml
│   └── init.sql
└── bioecho-os-architecture.md  # Full architecture document
```

## Architecture Principles

1. **Nothing without physics** — every signal goes through real DSP before any AI touches it
2. **Evidence-backed chat** — every statement in the chat references specific measurements
3. **Confidence-rated** — nothing is presented as absolute; everything has a confidence score
4. **Falsifiable** — every prediction can be validated against reality
5. **Multi-platform** — same Rust DSP core compiles to WASM (browser), native (Flutter), and server

## Hardware Paths

| Path | Cost | Difficulty | Time to Signal |
|------|------|------------|----------------|
| Simulated (web app) | $0 | None | Immediate |
| Backyard Brains SpikerBox | $150 | Easy (USB) | Day 1 |
| DIY ESP32 + ADS1115 | ~$50 | Medium (soldering) | Weekend |
| Custom (any ADC + serial) | Varies | Advanced | Varies |

## License

MIT
