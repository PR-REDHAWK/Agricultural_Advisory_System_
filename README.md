# Monsoon Event Forecasting & Conversational Agricultural Intelligence System

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?logo=vercel)](https://smart-india-hackathon-2026.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render-46E3B7?logo=render)](https://monsoon-forcasting.onrender.com)
[![API Docs](https://img.shields.io/badge/API_Docs-Swagger-85EA2D?logo=swagger)](https://monsoon-forcasting.onrender.com/docs)
[![Python](https://img.shields.io/badge/Backend-FastAPI_%2F_Python_3.12-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_%2F_Tailwind_v4-cyan.svg)](https://react.dev)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost_%2F_Isotonic_Calibration-orange.svg)](https://xgboost.readthedocs.io)
[![Gnani AI](https://img.shields.io/badge/Voice_AI-Gnani_Prisma_%26_Timbre-purple.svg)](https://gnani.ai)

An end-to-end, sub-seasonal probabilistic meteorological forecasting platform and deterministic agricultural decision-support engine. Built for the Smart India Hackathon (SIH 2026), the system empowers Indian farmers, agronomists, and Krishi Vigyan Kendra (KVK) extension officers to mitigate extreme monsoon climate risks through calibrated machine learning forecasts, growth-stage advisories, and an integrated voice-first conversational AI interface powered by Gnani AI speech models.

---

## 1. System Overview & Core Capabilities

### 1.1 Sub-Seasonal Probabilistic Event Forecasting
- Multi-Horizon Predictions: Calibrated probabilities for Monsoon Onset, Break Spells (Dry Spells), and Heavy Rain Events across four lead horizons: 7 Days, 14 Days, 21 Days, and 30 Days.
- Meteorological Feature Engine: Built on 30 validated atmospheric and oceanographic parameters, including short-term rainfall lags, consecutive streak indicators, seasonality transforms, and teleconnection drivers (ENSO / Nino 3.4 SST Anomaly, Southern Oscillation Index [SOI], Oceanic Nino Index [ONI], Indian Ocean Dipole [IOD], and Madden-Julian Oscillation [MJO Phase and Amplitude]).
- Probability Calibration: Raw XGBoost predictions are calibrated using Isotonic Regression on held-out temporal validation folds to produce reliable probability scores (Brier Score: 0.042).

### 1.2 Phase 6 Agricultural Advisory Engine
- 50+ Crop Catalog: Decision support across major Indian agricultural commodities (Cereal grains, Pulses, Oilseeds, Commercial crops, Vegetables, Spices, and Plantation crops).
- 6 Growth Stages: Explicit agronomic rules mapped across Sowing, Germination / Establishment, Vegetative, Flowering, Grain/Fruit Development, and Harvest.
- Deterministic Priority Hierarchy: Enforces a 5-tier agronomic rule hierarchy to generate 1 primary recommendation and supporting secondary checklist actions.
- False-Onset Risk Protection: Detects false-onset conditions where high initial precipitation is followed by an early dry spell (Onset_14d >= 60% and Break_14d >= 50%), generating explicit warnings to prevent premature sowing and seed rot.

### 1.3 Monsoon AI Voice Assistant (Powered by Gnani AI)
- Voice-First Multilingual Interaction: Allows farmers and field workers to ask agricultural and weather queries naturally in Hindi and Hinglish using microphone audio or text.
- Speech-to-Text (STT) via Prisma v2.5: Integrated with Gnani Prisma v2.5 (`POST https://api.vachana.ai/stt/v3`). Includes an in-browser Web Audio converter that resamples and encodes microphone input into 16kHz mono 16-bit PCM WAV.
- Grounded Conversational Reasoning: Extracts crop names, growth stages, locations, and lead horizons from conversational queries. Answers are strictly grounded in live model predictions and Phase 6 rules, eliminating hallucinations.
- Multi-Turn Context Memory: Maintains conversation session context so follow-up inquiries ("What should I do then?", "Will it rain next week?") resolve seamlessly without re-asking location or crop details.
- Text-to-Speech (TTS) via Timbre v2.5: Converts the generated Hindi recommendations into natural synthetic speech via Gnani Timbre v2.5 (`POST https://api.vachana.ai/api/v1/tts/inference`), incorporating phonetic text normalization for numbers, percentages, and technical terms.

### 1.4 Geospatial Resolution & Location Honesty
- Full Geographical Resolution: Resolution support across all 28 Indian States and primary agricultural districts.
- Transparent Location Metadata: Explicitly returns metadata flags (`is_direct_match` and `location_resolution_note`) to indicate when a station has direct historical training observations versus when regional baselines are applied.

---

## 2. Technical Architecture

```text
  +-------------------------------------------------------------------------------+
  |                        Vercel Production Frontend                             |
  |                        React 19 + Vite + Tailwind v4                          |
  |             https://smart-india-hackathon-2026.vercel.app                     |
  +---------------------------------------+---------------------------------------+
                                          | HTTPS / REST API
                                          v
  +-------------------------------------------------------------------------------+
  |                         Render Production Backend                             |
  |                           FastAPI / Python 3.12                               |
  |                    https://monsoon-forcasting.onrender.com                    |
  +-------------------+---------------------------------------+-------------------+
                      |                                       |
                      v                                       v
  +---------------------------------------+   +-----------------------------------+
  |    Voice Assistant Module             |   | Production Inference Pipeline     |
  |    [backend/voice_assistant/]         |   | [backend/inference_pipeline.py]   |
  |                                       |   |                                   |
  |  - Prisma STT Service (v2.5)          |   |  - 30-Feature Temporal Extractor  |
  |  - Timbre TTS Service (v2.5)          |   |  - 12 Frozen XGBoost Classifiers  |
  |  - Context Extractor (Agro entities)  |   |  - 12 Isotonic Calibrators        |
  |  - Multi-Turn Conversation Memory     |   |  - Location Honesty Resolver      |
  |  - Grounded Reasoning Explainer       |   +-----------------+-----------------+
  +-------------------+-------------------+                     |
                      |                                         v
                      |                       +-----------------------------------+
                      |                       | Phase 6 Agricultural Engine       |
                      |                       | [backend/advisory/]               |
                      |                       |  - 50+ Crop Rule Matrix           |
                      |                       |  - 6 Growth Stage Evaluators      |
                      |                       |  - False-Onset Risk Protection    |
                      |                       +-----------------+-----------------+
                      |                                         |
                      +────────────────────<────────────────────+
```

---

## 3. Directory Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── router.py                # Central FastAPI route registry
│   │   ├── core/
│   │   │   └── config.py                # Pydantic environment settings
│   │   ├── db/                          # Database session and initialization
│   │   ├── models/                      # SQLAlchemy domain models
│   │   └── schemas/                     # Domain validation schemas
│   │
│   ├── voice_assistant/                 # Monsoon AI Voice Assistant
│   │   ├── __init__.py
│   │   ├── routes.py                    # Voice REST endpoints (/transcribe, /ask, /speak)
│   │   ├── prisma_service.py            # Gnani Prisma v2.5 STT integration
│   │   ├── timbre_service.py            # Gnani Timbre v2.5 TTS integration
│   │   ├── context_extractor.py         # Agro-entity & intent extraction
│   │   ├── conversation_service.py      # Session memory & multi-turn cache
│   │   └── reasoning_service.py         # Grounded conversational reasoning engine
│   │
│   ├── advisory/                        # Phase 6 Agricultural Decision Engine
│   │   ├── engine.py                    # Deterministic rule engine
│   │   ├── rules.py                     # Priority hierarchy and risk thresholds
│   │   ├── crops.py                     # 50+ crop catalog and stage actions
│   │   ├── schemas.py                   # Dataclasses and Pydantic models
│   │   └── state_crops_catalog.json     # State-level commodity mappings
│   │
│   ├── models/
│   │   └── event_models/                # 12 frozen XGBoost models and calibrators
│   ├── data/                            # Historical climate records and indices
│   ├── inference_pipeline.py            # End-to-end production inference pipeline
│   ├── main.py                          # FastAPI application entrypoint
│   ├── Dockerfile                       # Container deployment definition
│   └── requirements.txt                 # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── config.js                # API base URL configuration
│   │   ├── components/
│   │   │   ├── dashboard/               # HeroStatus, ForecastOutlook, AdvisoryCard, KPIStrip
│   │   │   ├── pages/                   # VoiceAssistantPage, MapPage, AdvisoryPage, ModelPage
│   │   │   └── voice/                   # AudioPlayer, ChatMessage, ForecastSummaryCard
│   │   ├── context/                     # LanguageContext (English / Hindi state)
│   │   ├── hooks/                       # useVoiceRecorder, useTextToSpeech
│   │   ├── services/                    # voiceService.js (STT, Ask, TTS API client)
│   │   └── i18n/                        # Translation dictionaries
│   ├── vercel.json                      # Vercel deployment routing and reverse proxy
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.js                   # Vite builder configuration
│
├── Monsoon_Event_Forecasting_System_Comprehensive_Report.pdf  # Comprehensive milestone report
└── README.md
```

---

## 4. REST API Reference

### 4.1 Voice Assistant Endpoints

#### `POST /api/v1/voice/transcribe`
Transcribes spoken microphone audio using Gnani Prisma v2.5.

- Request Type: `multipart/form-data`
- Parameters:
  - `file`: Binary audio recording (`audio/wav`, `audio/ogg`, `audio/m4a`, max 30 seconds).
  - `language`: Target language code (default: `hi-IN`).
- Response:
```json
{
  "transcript": "Meri gehun ki fasal ke liye agle saat din ki kya salah hai?",
  "language": "hi-IN",
  "duration": 4.2
}
```

#### `POST /api/v1/voice/ask`
Processes an agricultural question, extracts entities, retrieves live calibrated predictions, and formulates a grounded conversational response.

- Request Type: `application/json`
- Request Body:
```json
{
  "question": "Meri gehun ki fasal ke liye agle saat din ki kya salah hai?",
  "conversation_id": "conv_948f2b7a",
  "language": "hi-IN",
  "location": "Uttar Pradesh",
  "crop": "Wheat",
  "growth_stage": "Sowing"
}
```
- Response:
```json
{
  "answer": "उत्तर प्रदेश में अगले 7 दिनों के लिए सूखा काल (Break-Spell) की संभावना 96% अधिक है। आपकी गेहूं की फसल (बुआई अवस्था) के लिए मुख्य कृषि सलाह: सूखी मिट्टी में अंकुरण विफलता से बचने के लिए गेहूं की बुआई से पहले पलेवा (Pre-sowing irrigation) अवश्य करें।",
  "conversation_id": "conv_948f2b7a",
  "extracted_context": {
    "location": "Uttar Pradesh",
    "crop": "Wheat",
    "growth_stage": "Sowing",
    "forecast_horizon": "7D"
  },
  "forecast_context": {
    "onset_probability": 0.07,
    "break_spell_probability": 0.96,
    "heavy_rain_probability": 0.00,
    "risk_level": "very_high",
    "event_type": "Break Spell",
    "match": {
      "station": "Uttar Pradesh",
      "confidence": 0.95
    }
  },
  "advisory": {
    "title": "High Dry-Spell Risk",
    "primary_action": "सूखी मिट्टी में अंकुरण विफलता से बचने के लिए गेहूं की बुआई से पहले पलेवा (Pre-sowing irrigation) अवश्य करें।",
    "supporting_actions": [
      "बुआई की गहराई 3-5 सेमी बनाए रखें",
      "जड़ वृद्धि हेतु बीजों को ट्राइकोडर्मा से उपचारित करें"
    ]
  },
  "requires_clarification": false,
  "clarification_prompt": null
}
```

#### `POST /api/v1/voice/speak`
Converts text into natural spoken Hindi using Gnani Timbre v2.5.

- Request Type: `application/json`
- Request Body:
```json
{
  "text": "अगले सात दिनों में सूखे की संभावना छियानवे प्रतिशत है। बुआई से पहले पलेवा अवश्य करें।",
  "language": "hi-IN",
  "voice": "Nalini"
}
```
- Response: Binary audio stream (`Content-Type: audio/wav`).

---

### 4.2 Forecast & Pipeline Endpoints

#### `POST /api/v1/forecast/predict`
Direct programmatic execution of the full forecasting and advisory pipeline.

- Request Body:
```json
{
  "state": "Uttar Pradesh",
  "prediction_date": "2024-06-15",
  "crop_name": "Rice",
  "growth_stage": "Sowing",
  "soil_moisture_pct": 25.0,
  "lang": "en"
}
```

#### `GET /api/v1/forecast/live`
Live inference query endpoint for dashboard widgets.

#### `GET /api/v1/regions`
Fetches geographic boundary stations, coordinates, and associated telemetry.

#### `GET /api/v1/crops`
Returns supported commodity lists filtered by state or nationwide catalog.

---

## 5. Local Setup & Execution

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Node.js 18+ and npm
- Valid Gnani AI API Key (for speech-to-text and text-to-speech features)

### Step 1: Clone Repository
```bash
git clone https://github.com/PR-REDHAWK/SMART-INDIA-HACKATHON-2026.git
cd SMART-INDIA-HACKATHON-2026
```

### Step 2: Configure Environment Variables
Create `backend/.env`:
```env
GNANI_API_KEY=your_gnani_api_key_here
GNANI_STT_URL=https://api.vachana.ai/stt/v3
GNANI_STT_MODEL=prisma-v2.5
GNANI_TTS_URL=https://api.vachana.ai/api/v1/tts/inference
GNANI_TTS_MODEL=timbre-v2.5
GNANI_TTS_VOICE=Nalini
GNANI_TTS_LANGUAGE=hi-IN
GNANI_TTS_SPEED=1.0
```

### Step 3: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run verification tests
python test_inference_pipeline.py

# Launch development server
python -m uvicorn main:app --reload --port 8000
```
- Local Backend API: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Step 4: Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Launch Vite development server
npm run dev
```
- Local Frontend Application: `http://localhost:5173`

---

## 6. Evaluation Protocol & Scientific Metrics

The machine learning models are evaluated under strict chronological splits to prevent data leakage:

| Dataset Split | Temporal Range | Sample Count | Function |
| :--- | :--- | :--- | :--- |
| Train Fold | 2022-01-01 to 2023-12-31 | 6,570 records | Feature learning and gradient boosting parameter optimization |
| Validation Fold | 2024-01-01 to 2024-12-31 | 3,294 records | Probability calibration and decision threshold tuning |
| Test Fold (Held-out) | 2025-01-01 to 2025-12-01 | 3,015 records | Final out-of-sample performance assessment |

### Metric Highlights
- Post-Calibration Brier Score: `0.042` across held-out testing partitions.
- Discriminative Performance: ROC-AUC > `0.88` across sub-seasonal horizons for Onset and Dry-Spell classification.
- Reliability Calibration: Verified via reliability diagrams comparing predicted probability buckets against observed empirical event frequencies.

---

## 7. Technical PDF Report

A comprehensive 12-page technical document detailing the mathematical formulation, feature importance matrices, calibration curves, and agronomic logic is provided in the repository:
- File: `Monsoon_Event_Forecasting_System_Comprehensive_Report.pdf` (Included in repository root)

---

## 8. Agronomic Disclaimer

Notice: Recommendations generated by the Phase 6 Advisory Engine and the Monsoon AI Voice Assistant represent automated decision-support outputs based on statistical modeling and deterministic agronomic rules. All advisories are intended strictly for guidance and must be validated by local agricultural extension officers (e.g., Krishi Vigyan Kendra personnel) prior to field application.

---
