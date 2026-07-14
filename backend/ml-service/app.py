"""
BioEcho ML Service — Plant stress classification and bioacoustic inference

Endpoints:
  POST /api/classify/plant — Classify plant signal features
  POST /api/classify/audio — Classify audio recording (BirdNET)
  GET  /api/health         — Health check
"""

import os
import io
import json
import logging
import tempfile
from typing import Optional
from datetime import datetime

import numpy as np
import joblib
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bioecho-ml")

app = FastAPI(title="BioEcho ML Service", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ============================================================
# Plant Signal Classifier
# ============================================================

class PlantFeatures(BaseModel):
    amplitude: float
    duration: float
    rise_time: float
    fall_time: float
    area: float
    slew_rate: float
    dominant_freq: float
    power_ratio_lf_hf: float
    spectral_entropy: float
    fractal_dimension: float
    temperature: float
    humidity: float
    light_level: float
    soil_moisture: float

class PlantResponse(BaseModel):
    classification: str
    confidence: float
    features_used: dict

# Load trained model if available
MODEL_PATH = os.environ.get("MODEL_PATH", "/models/plant_classifier.pkl")
plant_model = None
plant_label_encoder = None

def load_plant_model():
    global plant_model, plant_label_encoder
    if os.path.exists(MODEL_PATH):
        try:
            data = joblib.load(MODEL_PATH)
            plant_model = data.get("model")
            plant_label_encoder = data.get("label_encoder")
            logger.info("Loaded plant classifier model")
        except Exception as e:
            logger.warning(f"Failed to load model: {e}")

load_plant_model()

# Fallback rule-based classifier (used when no model is available)
def rule_based_classify(features: PlantFeatures) -> tuple:
    """Simple threshold-based classifier — matches JS PlantClassifier"""
    amp = features.amplitude
    freq = features.dominant_freq
    dur = features.duration
    rise = features.rise_time
    entropy = features.spectral_entropy
    temp = features.temperature
    soil = features.soil_moisture
    light = features.light_level

    scores = {}

    # Water stress
    if amp > 15 and freq < 0.3 and soil < 30:
        scores["water_stress"] = min(0.95, 0.3 + amp/50 * 0.3 + (1 - soil/30) * 0.3)

    # Touch response
    if amp > 20 and rise < 50 and dur < 200 and entropy > 0.5:
        scores["touch_response"] = min(0.93, 0.4 + amp/40 * 0.3 + (1 - rise/50) * 0.2)

    # Light transition
    if freq > 1.0 and entropy < 0.4:
        scores["light_transition"] = min(0.90, 0.3 + freq/2.5 * 0.3 + (1 - entropy) * 0.3)

    # Temperature shock
    if amp > 12 and entropy > 0.7 and temp > 35:
        scores["temperature_shock"] = min(0.92, 0.3 + amp/30 * 0.3 + max(0, temp-35)/15 * 0.3)

    # Wounding
    if amp > 30 and dur > 500:
        scores["wounding"] = min(0.99, 0.5 + amp/50 * 0.3 + dur/1000 * 0.2)

    # Resting
    if amp < 10 and freq > 0.25 and freq < 1.0:
        scores["resting"] = min(1.0, 0.6 + (1 - amp/10) * 0.4)

    if not scores:
        scores["unknown"] = 0.5

    best = max(scores.items(), key=lambda x: x[1])
    return best[0], best[1]

@app.post("/api/classify/plant", response_model=PlantResponse)
async def classify_plant(features: PlantFeatures):
    if plant_model:
        # Use trained ML model
        feature_array = np.array([[
            features.amplitude, features.duration, features.rise_time,
            features.fall_time, features.area, features.slew_rate,
            features.dominant_freq, features.power_ratio_lf_hf,
            features.spectral_entropy, features.fractal_dimension,
            features.temperature, features.humidity,
            features.light_level, features.soil_moisture
        ]])
        try:
            pred = plant_model.predict(feature_array)[0]
            proba = np.max(plant_model.predict_proba(feature_array)[0])
            cls = plant_label_encoder.inverse_transform([pred])[0] if plant_label_encoder else pred
            return PlantResponse(
                classification=str(cls),
                confidence=float(proba),
                features_used=features.model_dump()
            )
        except Exception as e:
            logger.error(f"Model prediction failed: {e}, falling back to rules")

    cls, conf = rule_based_classify(features)
    return PlantResponse(
        classification=cls,
        confidence=conf,
        features_used=features.model_dump()
    )

# ============================================================
# Audio / Bioacoustic Classifier (BirdNET)
# ============================================================

class AudioResponse(BaseModel):
    species: str
    confidence: float
    common_name: Optional[str] = None
    scientific_name: Optional[str] = None

@app.post("/api/classify/audio", response_model=AudioResponse)
async def classify_audio(
    file: UploadFile = File(...),
    lat: float = 0.0,
    lon: float = 0.0,
    week: int = 1
):
    """
    Classify an audio recording using BirdNET.

    Accepts WAV files (3-second segments recommended).
    Returns species prediction with confidence.
    """
    try:
        # Save uploaded file temporarily
        contents = await file.read()
        suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # Run BirdNET
        try:
            from birdnet import analyze_file
            results = analyze_file(
                tmp_path,
                lat=lat,
                lon=lon,
                week=week
            )
            os.unlink(tmp_path)

            if results and len(results) > 0:
                top = results[0]
                return AudioResponse(
                    species=top.get("species", "unknown"),
                    confidence=float(top.get("confidence", 0)),
                    common_name=top.get("common_name"),
                    scientific_name=top.get("scientific_name")
                )
            else:
                return AudioResponse(
                    species="no_detection",
                    confidence=0.0
                )

        except ImportError:
            logger.warning("BirdNET not installed, returning placeholder")
            os.unlink(tmp_path)
            return AudioResponse(
                species="birdnet_unavailable",
                confidence=0.0
            )

    except Exception as e:
        logger.error(f"Audio classification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Training Endpoint (for model retraining)
# ============================================================

class TrainingData(BaseModel):
    features: list[PlantFeatures]
    labels: list[str]

@app.post("/api/train/plant")
async def train_plant(data: TrainingData):
    """Train or retrain the plant classifier"""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder

    X = np.array([[
        f.amplitude, f.duration, f.rise_time, f.fall_time, f.area,
        f.slew_rate, f.dominant_freq, f.power_ratio_lf_hf,
        f.spectral_entropy, f.fractal_dimension,
        f.temperature, f.humidity, f.light_level, f.soil_moisture
    ] for f in data.features])

    le = LabelEncoder()
    y = le.fit_transform(data.labels)

    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump({"model": model, "label_encoder": le}, MODEL_PATH)

    global plant_model, plant_label_encoder
    plant_model = model
    plant_label_encoder = le

    return {"status": "trained", "samples": len(X), "classes": list(le.classes_)}

# ============================================================
# Health
# ============================================================

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "bioecho-ml",
        "model_loaded": plant_model is not None,
        "birdnet_available": False  # Will be True if import succeeds
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)
