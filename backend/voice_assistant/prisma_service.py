import os
import io
import logging
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException

try:
    from app.core.config import settings
except ImportError:
    from backend.app.core.config import settings

logger = logging.getLogger("voice_assistant.prisma")

def normalize_language_code(lang: str) -> str:
    """
    Normalizes language codes from the frontend into Gnani STT supported language codes.
    hi-EN / Hinglish is processed by hi-IN with acoustic adaptation.
    """
    if not lang:
        return "hi-IN"
    clean = lang.strip().lower()
    if clean in ["hi", "hi-in", "hindi"]:
        return "hi-IN"
    elif clean in ["hi-en", "hinglish", "en-in"]:
        return "hi-IN"
    return "hi-IN"

def extract_transcript(resp_data: Any) -> str:
    """
    Extracts transcript string across possible Gnani API response schemas.
    """
    if isinstance(resp_data, str):
        return resp_data.strip()
    
    if isinstance(resp_data, dict):
        # Direct transcript field
        if "transcript" in resp_data and isinstance(resp_data["transcript"], str):
            return resp_data["transcript"].strip()
        
        # Nested under data
        if "data" in resp_data:
            data_val = resp_data["data"]
            if isinstance(data_val, str):
                return data_val.strip()
            elif isinstance(data_val, dict):
                for k in ["transcript", "text", "transcription", "result"]:
                    if k in data_val and isinstance(data_val[k], str):
                        return data_val[k].strip()
        
        # Direct text or result field
        for k in ["text", "transcription", "asr_output", "result"]:
            if k in resp_data and isinstance(resp_data[k], str):
                return resp_data[k].strip()

        # Array of results
        if "results" in resp_data and isinstance(resp_data["results"], list) and len(resp_data["results"]) > 0:
            first = resp_data["results"][0]
            if isinstance(first, dict):
                return first.get("transcript", first.get("text", "")).strip()
            elif isinstance(first, str):
                return first.strip()

    return ""

async def transcribe_audio(
    file_bytes: bytes,
    filename: str = "recording.webm",
    content_type: str = "audio/webm",
    language_code: str = "hi-IN"
) -> Dict[str, Any]:
    """
    Sends recorded audio to Gnani Prisma v2.5 STT endpoint.
    Official endpoint: POST https://api.vachana.ai/stt/v3
    Header: X-API-Key-ID: YOUR_GNANI_API_KEY
    Form fields:
      - audio_file: file bytes
      - language_code: hi-IN
    """
    if not settings.GNANI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gnani API Key is not configured on the backend. Please check your backend .env file."
        )

    if not file_bytes or len(file_bytes) < 100:
        raise HTTPException(
            status_code=400,
            detail="Empty or corrupted audio recording received. Please record again."
        )

    # 30-second audio constraint check (approx 2MB for webm/opus or wav)
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Audio recording exceeds the 30-second maximum duration limit. Please speak more concisely."
        )

    normalized_lang = normalize_language_code(language_code)
    
    headers = {
        "X-API-Key-ID": settings.GNANI_API_KEY
    }

    # Multipart form payload matching Gnani documentation
    clean_filename = filename if filename and filename.endswith(('.wav', '.ogg', '.m4a', '.mp3', '.flac', '.aac')) else "recording.wav"
    actual_content_type = "audio/wav" if clean_filename.endswith(".wav") else (content_type or "audio/wav")

    files = {
        "audio_file": (clean_filename, file_bytes, actual_content_type)
    }
    data = {
        "language_code": normalized_lang
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.GNANI_STT_URL,
                headers=headers,
                files=files,
                data=data
            )

        if response.status_code == 401 or response.status_code == 403:
            logger.error(f"Gnani authentication error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=401,
                detail="Gnani API Authentication failed. Please check the GNANI_API_KEY configured in backend/.env."
            )
        
        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gnani API rate limit reached. Please wait a few moments and try again."
            )

        if not response.is_success:
            logger.error(f"Gnani STT API error ({response.status_code}): {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Speech-to-text service error ({response.status_code}): {response.text[:200]}"
            )

        resp_json = response.json()
        logger.info(f"Gnani STT raw response: {resp_json}")

        transcript = extract_transcript(resp_json)
        
        # Calculate duration if provided, otherwise estimate
        duration = resp_json.get("duration", resp_json.get("data", {}).get("duration", 0.0))
        if not duration:
            # Rough estimation from payload size if unprovided
            duration = round(len(file_bytes) / 32000.0, 1)

        return {
            "transcript": transcript,
            "language": normalized_lang,
            "duration": duration
        }

    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error(f"Network error calling Gnani STT: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Unable to reach Gnani speech recognition service. Please check your internet connection."
        )
    except Exception as exc:
        logger.error(f"Unexpected error in Prisma STT service: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing speech recognition: {str(exc)}"
        )
