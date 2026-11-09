# Monsoon AI: Sub-Seasonal Meteorological Forecasting & Conversational Agricultural Advisory System

**Challenge:** The Great Indian AI Internship Challenge 2026 by Gnani AI  
**Track:** Voice AI & Applied Machine Learning  
**Live Demo:** [agricultural-advisory-system.vercel.app](https://agricultural-advisory-system.vercel.app/) | **API Docs:** [monsoon-forcasting.onrender.com/docs](https://monsoon-forcasting.onrender.com/docs) | **Repo:** [github.com/PR-REDHAWK/Agricultural_Advisory_System](https://github.com/PR-REDHAWK/Agricultural_Advisory_System_)

---

### 1. Problem Statement
Over 140 million Indian farmers depend on the southwest monsoon, yet climate volatility triggers frequent crop failures due to unpredictable onsets, prolonged dry spells, and unseasonal downpours. Smallholder farmers face two critical bottlenecks:
* **The Decision Gap:** Conventional forecasts deliver raw millimeter numbers rather than actionable agronomic guidance mapped to specific crops and growth stages.
* **The Literacy & Digital Divide:** Complex text interfaces fail rural users who need hands-free, vernacular voice interaction in their spoken dialect.

---

### 2. Solution Overview
**Monsoon AI** is an end-to-end, voice-first decision support system combining sub-seasonal machine learning forecasts with a deterministic agronomic advisory engine. Farmers speak naturally in Hindi through any mobile browser, receiving instant spoken and written guidance calibrated to their district, crop, and growth stage.

---

### 3. Key Innovations & Technical Architecture

#### A. Voice AI Pipeline (Powered by Gnani AI)
* **Speech-to-Text (STT) via Gnani Prisma v2.5:** Audio recorded in-browser is resampled client-side to 16 kHz mono 16-bit PCM WAV and streamed to Gnani Prisma (`api.vachana.ai/stt/v3`), enabling robust transcription of rural Hindi and Hinglish.
* **Grounded Reasoning Engine:** Extracts entities (crop, growth stage, district, lead time) using bilingual patterns. The engine queries validated ML forecasts and deterministic agronomic rules, eliminating LLM hallucinations.
* **Context Memory:** Maintains session state across turns, enabling fluid follow-ups (*"What should I do then?"*) without re-asking location or crop.
* **Text-to-Speech (TTS) via Gnani Timbre v2.5:** Synthesizes recommendations into clear, natural Hindi speech (`api.vachana.ai/api/v1/tts/inference`) with phonetic normalization for numbers, percentages, and agricultural units.

#### B. Machine Learning Forecasting Engine
* **12 Calibrated XGBoost Models:** Predicts probabilities for Monsoon Onset, Break Spells, and Heavy Rain at 7, 14, 21, and 30-day horizons.
* **30 Ocean-Atmosphere Features:** Merges teleconnection drivers (ENSO Nino 3.4, SOI, ONI, IOD, MJO phase/amplitude) with local precipitation streak indicators.
* **Isotonic Calibration:** Produces strictly reliable probabilities with a high-precision **Brier Score of 0.042** on out-of-time validation folds.

#### C. Agronomic Advisory Engine
* **Coverage:** Validated operational rules for **50+ crops** across **6 growth stages** (Sowing to Harvest).
* **False-Onset Protection:** Flags high early rainfall followed by projected dry spells (Onset >= 60% and Break >= 50%), actively preventing premature sowing and catastrophic seed rot.

---

### 4. Real-World Impact & Production Status
* **Inclusivity:** Replaces text-heavy dashboards with native voice conversations, bringing AI to smallholder farmers.
* **Economic Defense:** Safeguards seasonal working capital through pre-sowing and harvest risk alerts.
* **Production Deployment:** Live on Vercel (React 19) and Render (FastAPI / Python 3.12) with sub-second voice API responses.

---

### 5. Team & Contributions
* **Priyanshu Panwar:** ML pipeline engineering, XGBoost training, isotonic calibration, and Gnani AI voice integration (Prisma STT, Timbre TTS, and reasoning engine).
* **Vishwajeet Nehra:** Frontend architecture, responsive UI/UX, in-browser audio capture/resampling, and interactive forecasting charts.
* **Collaborative:** REST API architecture, database schemas, and production cloud infrastructure.
