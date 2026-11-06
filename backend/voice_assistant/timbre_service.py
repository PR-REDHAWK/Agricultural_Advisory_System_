import re
import logging
from typing import Optional
import httpx
from fastapi import HTTPException

try:
    from app.core.config import settings
except ImportError:
    from backend.app.core.config import settings

logger = logging.getLogger("voice_assistant.timbre")

# Hindi word map for small numbers and percentages
NUM_WORDS_HI = {
    "0": "शून्य", "1": "एक", "2": "दो", "3": "तीन", "4": "चार",
    "5": "पांच", "6": "छह", "7": "सात", "8": "आठ", "9": "नौ",
    "10": "दस", "11": "ग्यारह", "12": "बारह", "13": "तेरह", "14": "चौदह",
    "15": "पंद्रह", "16": "सोलह", "17": "सत्रह", "18": "अठारह", "19": "उन्नीस",
    "20": "बीस", "21": "इक्कीस", "22": "बाईस", "23": "तेईस", "24": "चौबीस",
    "25": "पच्चीस", "26": "छब्बीस", "27": "सत्ताईस", "28": "अट्ठाईस", "29": "उनतीस",
    "30": "तीस", "40": "चालीस", "50": "पचास", "60": "साठ", "70": "सत्तर",
    "80": "अस्सी", "90": "नब्बे", "100": "सौ"
}

def normalize_text_for_hindi_speech(text: str) -> str:
    """
    Normalizes numbers, percentages, and acronyms for phonetic speech synthesis.
    E.g., "7 दिनों में 65% जोखिम" -> "सात दिनों में 65 प्रतिशत जोखिम"
    """
    if not text:
        return ""

    normalized = text

    # Replace % with प्रतिशत
    normalized = re.sub(r'(\d+)\s*%', r'\1 प्रतिशत', normalized)
    normalized = normalized.replace('%', ' प्रतिशत ')

    # Common terms
    normalized = normalized.replace('Break-Spell', 'सूखा काल ब्रेक स्पेल')
    normalized = normalized.replace('break spell', 'सूखा काल ब्रेक स्पेल')
    normalized = normalized.replace('mm', ' मिलीमीटर')
    normalized = normalized.replace('KVK', 'के वी के')

    # Replace common horizon numbers (7, 14, 21, 30) when followed by दिन
    normalized = re.sub(r'\b7\s*दिन', 'सात दिन', normalized)
    normalized = re.sub(r'\b14\s*दिन', 'चौदह दिन', normalized)
    normalized = re.sub(r'\b21\s*दिन', 'इक्कीस दिन', normalized)
    normalized = re.sub(r'\b30\s*दिन', 'तीस दिन', normalized)

    # Clean redundant whitespaces
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized

async def synthesize_speech(
    text: str,
    language_code: str = "hi-IN",
    voice: Optional[str] = None,
    speed: float = 1.0
) -> bytes:
    """
    Calls Gnani Timbre v2.5 TTS API.
    POST https://api.vachana.ai/api/v1/tts/inference
    Returns raw WAV audio bytes.
    """
    if not settings.GNANI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gnani API Key is not configured on the backend. Please check backend/.env."
        )

    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text provided for speech synthesis."
        )

    clean_text = normalize_text_for_hindi_speech(text)
    selected_voice = voice or settings.GNANI_TTS_VOICE or "Nalini"
    target_lang = "hi-IN"  # Timbre v2.5 optimal Hindi voice

    payload = {
        "text": clean_text,
        "model": settings.GNANI_TTS_MODEL or "timbre-v2.5",
        "voice": selected_voice,
        "language": target_lang,
        "speed": float(speed or settings.GNANI_TTS_SPEED or 1.0),
        "audio_config": {
            "encoding": "linear_pcm",
            "container": "wav",
            "num_channels": 1,
            "sample_rate": 24000,
            "sample_width": 2
        }
    }

    headers = {
        "X-API-Key-ID": settings.GNANI_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.GNANI_TTS_URL,
                headers=headers,
                json=payload
            )

        if response.status_code == 401 or response.status_code == 403:
            logger.error(f"Gnani TTS Auth failed: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=401,
                detail="Gnani API Key authentication failed for Timbre TTS."
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gnani TTS rate limit reached. Please wait a moment."
            )

        if not response.is_success:
            logger.error(f"Gnani TTS error ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Speech synthesis error ({response.status_code}): {response.text[:200]}"
            )

        # Timbre v2.5 returns direct audio/wav binary bytes
        audio_bytes = response.content
        if len(audio_bytes) < 100:
            raise HTTPException(
                status_code=502,
                detail="Received invalid or empty audio stream from speech synthesis service."
            )

        return audio_bytes

    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error(f"Network error calling Gnani TTS: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Unable to reach Gnani text-to-speech service. Please check your connection."
        )
    except Exception as exc:
        logger.error(f"Unexpected error in Timbre TTS service: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing speech synthesis: {str(exc)}"
        )
