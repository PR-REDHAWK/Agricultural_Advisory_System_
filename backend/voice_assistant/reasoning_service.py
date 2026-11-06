import os
import json
import logging
from typing import Dict, Any, Optional, Tuple

try:
    from app.core.config import settings
    from inference_pipeline import run_production_inference
except ImportError:
    from backend.app.core.config import settings
    from backend.inference_pipeline import run_production_inference

logger = logging.getLogger("voice_assistant.reasoning")

# Crop names in Hindi for conversational answers
CROP_NAME_HI = {
    "Rice": "धान",
    "Wheat": "गेहूं",
    "Maize": "मक्का",
    "Cotton": "कपास",
    "Soybean": "सोयाबीन",
    "Sugarcane": "गन्ना",
    "Gram": "चना",
    "Tur (Pigeon Pea)": "अरहर",
    "Groundnut": "मूंगफली",
    "Mustard": "सरसों",
    "Bajra": "बाजरा",
    "Jowar": "ज्वार",
    "Potato": "आलू",
    "Onion": "प्याज",
    "Barley": "जौ",
    "Moong": "मूंग",
    "Urad": "उड़द",
    "Ragi": "रागी",
    "Sunflower": "सूरजमुखी",
    "Jute": "जूट"
}

STAGE_NAME_HI = {
    "Sowing": "बुआई",
    "Germination / Establishment": "अंकुरण व पौधशाला",
    "Vegetative": "वानस्पतिक बढ़वार",
    "Flowering": "पुष्पन (फूल)",
    "Grain/Fruit Development": "दाना व फल विकास",
    "Harvest": "कटाई"
}

def generate_grounded_conversational_answer(
    crop: str,
    stage: str,
    location: str,
    horizon: str,
    intent: str,
    forecast_probs: Dict[str, Any],
    advisory: Dict[str, Any],
    language: str = "hi-IN"
) -> str:
    """
    Deterministic Grounded Reasoning Explainer:
    Produces fluent, concise, farmer-friendly Hindi answers based directly on
    the actual calibrated probabilities and Phase 6 Advisory Engine output.
    """
    crop_hi = CROP_NAME_HI.get(crop, crop)
    stage_hi = STAGE_NAME_HI.get(stage, stage)
    h_days = horizon.replace("D", "").replace("d", "")

    h_key = f"{h_days}d" if f"{h_days}d" in forecast_probs.get("onset", {}) else "7d"
    onset_pct = round(forecast_probs.get("onset", {}).get(h_key, 0.0))
    break_pct = round(forecast_probs.get("break_spell", {}).get(h_key, 0.0))
    heavy_pct = round(forecast_probs.get("heavy_rain", {}).get(h_key, 0.0))

    primary_action = advisory.get("primary_action", "")
    supporting = advisory.get("supporting_actions", [])
    supp_text = f" साथ ही: {supporting[0]}।" if supporting else ""

    if intent == "CONTINGENCY":
        return (
            f"यदि {location} में अगले {h_days} दिनों में बारिश नहीं होती है या सूखा काल खिंचता है (सूखा जोखिम {break_pct}%), "
            f"तो {crop_hi} की फसल को बचाने के लिए मुख्य कदम: {primary_action}{supp_text} "
            f"कृपया नजदीकी कृषि विज्ञान केंद्र (KVK) की सलाह का भी पालन करें।"
        )
    elif intent == "FOLLOW_UP":
        return (
            f"आपके पिछले प्रश्न के संदर्भ में ({location} में {crop_hi}, {stage_hi} अवस्था), "
            f"मौसम पूर्वानुमान के अनुसार मुख्य कार्य यह है: {primary_action}{supp_text} "
            f"भारी बारिश का जोखिम {heavy_pct}% और सूखे का जोखिम {break_pct}% आंका गया है।"
        )
    else:
        # Standard grounded advisory explanation
        if break_pct >= 50:
            weather_desc = f"सूखा काल (Break-Spell) की संभावना {break_pct}% अधिक है"
        elif heavy_pct >= 50:
            weather_desc = f"भारी बारिश की संभावना {heavy_pct}% काफी अधिक है"
        elif onset_pct >= 60:
            weather_desc = f"मानसून आगमन व बारिश की संभावना {onset_pct}% अच्छी है"
        else:
            weather_desc = f"सामान्य मानसूनी परिस्थितियां रहने की संभावना है (भारी बारिश {heavy_pct}%, सूखा {break_pct}%)"

        return (
            f"{location} में अगले {h_days} दिनों के लिए {weather_desc}। "
            f"आपकी {crop_hi} की फसल ({stage_hi} अवस्था) के लिए मुख्य कृषि सलाह: {primary_action}{supp_text} "
            f"मौसम की किसी भी आकस्मिक स्थिति के लिए सतर्क रहें।"
        )

async def process_question(
    question: str,
    conversation_id: str,
    language: str,
    extracted: Dict[str, Any],
    prior_conv: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main reasoning pipeline orchestrator:
    1. Resolves clarification requirement if vital context is completely missing
    2. Answers definition questions immediately
    3. Calls run_production_inference() with active crop and location
    4. Formulates grounded response and returns data matching frontend contracts
    """
    location = extracted.get("location") or prior_conv.get("context", {}).get("location")
    crop = extracted.get("crop") or prior_conv.get("context", {}).get("crop")
    growth_stage = extracted.get("growth_stage") or prior_conv.get("context", {}).get("growth_stage") or "Sowing"
    horizon = extracted.get("forecast_horizon") or prior_conv.get("context", {}).get("forecast_horizon") or "7D"
    intent = extracted.get("intent", "GENERAL")

    # 1. Handle Definition Questions directly
    if intent == "DEFINITION":
        q_low = question.lower()
        if "dry spell" in q_low or "break" in q_low or "सूखा" in q_low:
            answer = (
                "सूखा काल (Dry Spell या Break Spell) मानसून के मौसम में उस शुष्क अवधि को कहते हैं "
                "जब लगातार कई दिनों तक बारिश रुक जाती है और मिट्टी में नमी की भारी कमी होने लगती है। "
                "इस स्थिति में फसलों में पुष्पन या दाना बनने पर विपरीत प्रभाव पड़ता है, "
                "अतः किसानों को संरक्षित या ड्रिप सिंचाई की तैयारी रखने की सलाह दी जाती है।"
            )
        elif "heavy rain" in q_low or "भारी बारिश" in q_low:
            answer = (
                "भारी बारिश (Heavy Rainfall Event) वह स्थिति है जब 24 घंटों में 64.5 मिलीमीटर से अधिक बारिश दर्ज होती है। "
                "इससे खेतों में जलभराव, जड़ सड़न और पोषक तत्वों का बहाव हो सकता है। "
                "इसके लिए खेतों में जल निकासी नाली खुली रखने की सलाह दी जाती है।"
            )
        else:
            answer = (
                "मानसून पूर्वानुमान प्रणाली में ऑनसेट (आगमन), ब्रेक-स्पेल (सूखा काल) और भारी बारिश के "
                "7, 14, 21 और 30 दिवसीय जोखिम का अग्रिम आकलन किया जाता है ताकि किसान समय पर सही निर्णय ले सकें।"
            )
        return {
            "answer": answer,
            "conversation_id": conversation_id,
            "extracted_context": {
                "location": location,
                "crop": crop,
                "growth_stage": growth_stage,
                "forecast_horizon": horizon
            },
            "forecast_context": prior_conv.get("last_forecast"),
            "advisory": prior_conv.get("last_advisory"),
            "requires_clarification": False,
            "clarification_prompt": None
        }

    # 2. Check Clarification requirement
    # If both crop and location are completely unknown and cannot be inferred:
    if not crop and not location:
        return {
            "answer": "",
            "conversation_id": conversation_id,
            "extracted_context": {
                "location": None,
                "crop": None,
                "growth_stage": None,
                "forecast_horizon": horizon
            },
            "forecast_context": None,
            "advisory": None,
            "requires_clarification": True,
            "clarification_prompt": "कृपया बताएं कि आप किस जिले और कौनसी फसल (जैसे धान, गेहूं, मक्का, कपास) के बारे में जानकारी चाहते हैं?"
        }

    # Default fallbacks if one is known
    eff_crop = crop or "Rice"
    eff_location = location or "Uttar Pradesh"

    # 3. Retrieve Ground Truth via Production Inference Pipeline
    lang_code = "hi" if "hi" in language.lower() else "en"
    inference_result = run_production_inference(
        state=eff_location,
        prediction_date_str="2024-06-15",
        crop_name=eff_crop,
        growth_stage=growth_stage,
        soil_moisture_pct=25.0,
        lang=lang_code
    )

    probs = inference_result.get("probabilities", {})
    metadata = inference_result.get("metadata", {})
    adv_output = inference_result.get("advisory", {})

    h_num = horizon.replace("D", "").replace("d", "")
    h_key = f"{h_num}d" if f"{h_num}d" in probs.get("onset", {}) else "7d"

    onset_prob = probs.get("onset", {}).get(h_key, 0.0) / 100.0
    break_prob = probs.get("break_spell", {}).get(h_key, 0.0) / 100.0
    heavy_prob = probs.get("heavy_rain", {}).get(h_key, 0.0) / 100.0

    risk_lvl = adv_output.get("risk_level", "NORMAL").lower()
    event_type = adv_output.get("event_type", "NORMAL").replace("_", " ").title()

    forecast_context = {
        "onset_probability": round(onset_prob, 2),
        "break_spell_probability": round(break_prob, 2),
        "heavy_rain_probability": round(heavy_prob, 2),
        "risk_level": risk_lvl,
        "event_type": event_type,
        "match": {
            "station": metadata.get("resolved_state", eff_location),
            "confidence": 0.95 if metadata.get("is_direct_match") else 0.85
        }
    }

    advisory_data = {
        "title": adv_output.get("title", ""),
        "primary_action": adv_output.get("primary_action", ""),
        "supporting_actions": adv_output.get("supporting_actions", [])
    }

    # 4. Synthesize Conversational Answer
    answer = generate_grounded_conversational_answer(
        crop=eff_crop,
        stage=growth_stage,
        location=eff_location,
        horizon=horizon,
        intent=intent,
        forecast_probs=probs,
        advisory=adv_output,
        language=language
    )

    return {
        "answer": answer,
        "conversation_id": conversation_id,
        "extracted_context": {
            "location": eff_location,
            "crop": eff_crop,
            "growth_stage": growth_stage,
            "forecast_horizon": horizon
        },
        "forecast_context": forecast_context,
        "advisory": advisory_data,
        "requires_clarification": False,
        "clarification_prompt": None
    }
