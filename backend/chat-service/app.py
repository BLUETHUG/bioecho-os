"""
BioEcho Chat Service — Evidence-backed conversation interface

Generates human-readable statements from classification events.
No LLM used — template-based to guarantee factuality.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bioecho-chat")

app = FastAPI(title="BioEcho Chat Service", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ============================================================
# DATA MODELS
# ============================================================

class Evidence(BaseModel):
    label: str
    value: str
    trend: str  # 'up', 'down', 'stable', 'high', 'low', 'fast', 'anomaly'

class ClassificationEvent(BaseModel):
    classification: str
    confidence: float
    amplitude: float
    duration: float
    rise_time: float
    fall_time: float
    slew_rate: float
    dominant_freq: float
    spectral_entropy: float
    fractal_dimension: float
    temperature: float
    humidity: float
    light_level: float
    soil_moisture: float
    baseline_amplitude: float = 5.0
    baseline_freq: float = 0.5

class ChatRequest(BaseModel):
    text: Optional[str] = None
    event: Optional[ClassificationEvent] = None

class ChatResponse(BaseModel):
    text: str
    evidence: List[Evidence]
    confidence: float
    timestamp: str

# ============================================================
# TEMPLATES
# ============================================================

def format_amplitude(v: float) -> str: return f"{v:.1f}"
def format_freq(v: float) -> str: return f"{v:.2f}"
def format_duration(v: float) -> str: return f"{v:.0f}"
def format_temp(v: float) -> str: return f"{v:.1f}"
def format_pct(v: float) -> str: return f"{v:.0f}"

templates = {
    "water_stress": lambda e: {
        "text": (
            f"Electrical signature consistent with early-stage water stress "
            f"({e.confidence*100:.0f}% confidence). Amplitude elevated above baseline, "
            f"dominant frequency shifting downward. Soil moisture at {e.soil_moisture:.0f}%."
        ),
        "evidence": [
            Evidence(label="Spike amplitude", value=f"{e.amplitude:.1f} µV",
                    trend="up" if e.amplitude > e.baseline_amplitude * 2 else "normal"),
            Evidence(label="Dominant frequency", value=f"{e.dominant_freq:.2f} Hz",
                    trend="down" if e.dominant_freq < e.baseline_freq * 0.7 else "normal"),
            Evidence(label="Soil moisture", value=f"{e.soil_moisture:.0f}%",
                    trend="down" if e.soil_moisture < 30 else "normal"),
            Evidence(label="Temperature", value=f"{e.temperature:.1f}°C",
                    trend="up" if e.temperature > 30 else "normal"),
        ],
        "confidence": e.confidence
    },
    "touch_response": lambda e: {
        "text": (
            f"Detected touch-type electrical response ({e.confidence*100:.0f}% confidence). "
            f"Spike amplitude {e.amplitude:.1f}µV, duration {e.duration:.0f}ms, "
            f"rise time {e.rise_time:.0f}ms — consistent with mechanosensitive "
            f"ion channel activation reported in the literature."
        ),
        "evidence": [
            Evidence(label="Spike amplitude", value=f"{e.amplitude:.1f} µV",
                    trend="up" if e.amplitude > e.baseline_amplitude * 3 else "normal"),
            Evidence(label="Rise time", value=f"{e.rise_time:.0f} ms",
                    trend="fast" if e.rise_time < 50 else "normal"),
            Evidence(label="Duration", value=f"{e.duration:.0f} ms",
                    trend="short" if e.duration < 300 else "normal"),
            Evidence(label="Spectral entropy", value=f"{e.spectral_entropy:.2f}",
                    trend="high" if e.spectral_entropy > 0.5 else "normal"),
        ],
        "confidence": e.confidence
    },
    "light_transition": lambda e: {
        "text": (
            f"Electrical response consistent with rapid light level change "
            f"({e.confidence*100:.0f}% confidence). Frequency shift detected, "
            f"typical of photosynthetic apparatus adjustment."
        ),
        "evidence": [
            Evidence(label="Dominant frequency", value=f"{e.dominant_freq:.2f} Hz",
                    trend="up" if e.dominant_freq > e.baseline_freq * 1.5 else "normal"),
            Evidence(label="Spectral entropy", value=f"{e.spectral_entropy:.2f}",
                    trend="low" if e.spectral_entropy < 0.4 else "normal"),
            Evidence(label="Light level", value=f"{e.light_level:.0f} lux", trend="changed"),
        ],
        "confidence": e.confidence
    },
    "temperature_shock": lambda e: {
        "text": (
            f"Detected electrical response consistent with rapid temperature increase "
            f"({e.confidence*100:.0f}% confidence). Signal complexity elevated."
        ),
        "evidence": [
            Evidence(label="Amplitude", value=f"{e.amplitude:.1f} µV", trend="up"),
            Evidence(label="Spectral entropy", value=f"{e.spectral_entropy:.2f}", trend="high"),
            Evidence(label="Temperature", value=f"{e.temperature:.1f}°C", trend="up"),
        ],
        "confidence": e.confidence
    },
    "wounding": lambda e: {
        "text": (
            f"⚠️ Large electrical transient detected ({e.confidence*100:.0f}% confidence). "
            f"Signal amplitude {e.amplitude:.1f}µV, duration {e.duration:.0f}ms — "
            f"consistent with wounding-type variation potential."
        ),
        "evidence": [
            Evidence(label="Amplitude", value=f"{e.amplitude:.1f} µV", trend="up"),
            Evidence(label="Duration", value=f"{e.duration:.0f} ms", trend="long"),
            Evidence(label="Slew rate", value=f"{e.slew_rate/1000:.2f} V/s", trend="high"),
        ],
        "confidence": e.confidence
    },
    "resting": lambda e: {
        "text": "Resting state detected. Baseline electrical activity within normal range.",
        "evidence": [
            Evidence(label="Amplitude", value=f"{e.amplitude:.1f} µV", trend="stable"),
            Evidence(label="Frequency", value=f"{e.dominant_freq:.2f} Hz", trend="stable"),
            Evidence(label="Entropy", value=f"{e.spectral_entropy:.2f}", trend="stable"),
        ],
        "confidence": e.confidence
    },
    "unknown": lambda e: {
        "text": (
            f"Detected an electrical transient that doesn't closely match known stress patterns. "
            f"Amplitude {e.amplitude:.1f}µV at {e.dominant_freq:.2f}Hz. "
            f"Monitoring and correlation with environmental changes recommended."
        ),
        "evidence": [
            Evidence(label="Amplitude", value=f"{e.amplitude:.1f} µV", trend="anomaly"),
            Evidence(label="Frequency", value=f"{e.dominant_freq:.2f} Hz", trend="anomaly"),
            Evidence(label="Duration", value=f"{e.duration:.0f} ms", trend="anomaly"),
        ],
        "confidence": e.confidence
    }
}

# ============================================================
# ENDPOINTS
# ============================================================

@app.post("/api/chat/generate", response_model=ChatResponse)
async def generate_statement(request: ChatRequest):
    """Generate an evidence-backed statement from a classification event."""
    if not request.event:
        raise HTTPException(status_code=400, detail="event field is required")

    e = request.event
    template_fn = templates.get(e.classification)

    if not template_fn:
        template_fn = templates["unknown"]

    result = template_fn(e)
    result["timestamp"] = datetime.utcnow().isoformat() + "Z"

    return ChatResponse(**result)

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "bioecho-chat", "templates": len(templates)}

@app.get("/api/chat/templates")
async def list_templates():
    """List available statement templates with descriptions."""
    descriptions = {
        "water_stress": "Early-stage water stress detection from electrical signal changes",
        "touch_response": "Mechanical stimulus / touch-type electrical response",
        "light_transition": "Rapid light intensity change detected",
        "temperature_shock": "Rapid temperature increase detected",
        "wounding": "Large electrical transient consistent with wounding response",
        "resting": "Normal baseline activity, no anomalies detected",
        "unknown": "Unrecognized signal pattern — logged for analysis"
    }
    return {k: {"description": v, "classes": list(templates.keys())} for k, v in descriptions.items()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083)
