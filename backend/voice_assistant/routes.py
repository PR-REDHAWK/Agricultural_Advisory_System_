import io
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel, Field

from voice_assistant.prisma_service import transcribe_audio
from voice_assistant.timbre_service import synthesize_speech
from voice_assistant.context_extractor import extract_agro_context
from voice_assistant.conversation_service import get_or_create_conversation, update_conversation
from voice_assistant.reasoning_service import process_question

logger = logging.getLogger("voice_assistant.routes")

router = APIRouter(prefix="/voice", tags=["Voice Assistant"])

class AskRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    language: Optional[str] = "hi-IN"
    location: Optional[str] = None
    crop: Optional[str] = None
    growth_stage: Optional[str] = None

class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = "hi-IN"
    voice: Optional[str] = None

@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    language: str = Form("hi-IN")
):
    """
    Transcribes farmer spoken audio using Gnani Prisma v2.5 STT.
    Accepts: audio/webm, audio/ogg, audio/wav, audio/m4a up to 30s.
    Returns: { transcript: str, language: str, duration: float }
    """
    try:
        file_bytes = await file.read()
        res = await transcribe_audio(
            file_bytes=file_bytes,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "audio/webm",
            language_code=language
        )
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error in /transcribe route: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/ask")
async def ask_voice(req: AskRequest):
    """
    Conversational Intelligence endpoint grounded in multi-horizon forecast & Phase 6 advisory engine.
    Maintains multi-turn conversation memory and handles follow-up inquiries.
    """
    try:
        conv_id, conv = get_or_create_conversation(req.conversation_id)

        # 1. Extract context from query and prior state
        extracted = extract_agro_context(req.question, prior_context=conv.get("context"))

        # Explicit overrides from frontend only if NOT detected in the query
        if not extracted.get("location") and req.location:
            extracted["location"] = req.location
        if not extracted.get("crop") and req.crop:
            extracted["crop"] = req.crop
        if not extracted.get("growth_stage") and req.growth_stage:
            extracted["growth_stage"] = req.growth_stage

        # 2. Run Grounded Reasoning Engine
        result = await process_question(
            question=req.question,
            conversation_id=conv_id,
            language=req.language or "hi-IN",
            extracted=extracted,
            prior_conv=conv
        )

        # 3. Update Conversation Session
        update_conversation(
            conv_id=conv_id,
            context=result.get("extracted_context"),
            last_forecast=result.get("forecast_context"),
            last_advisory=result.get("advisory"),
            user_msg=req.question,
            assistant_msg=result.get("answer") or result.get("clarification_prompt")
        )

        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error in /ask route: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/speak")
async def speak_voice(req: SpeakRequest):
    """
    Converts assistant response text to natural Hindi speech using Gnani Timbre v2.5.
    Returns streaming binary audio/wav.
    """
    try:
        audio_bytes = await synthesize_speech(
            text=req.text,
            language_code=req.language or "hi-IN",
            voice=req.voice
        )
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=speech.wav",
                "Cache-Control": "no-cache"
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error in /speak route: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
