import time
import uuid
from typing import Dict, Any, Optional, Tuple

# In-memory session store (can be extended to Redis/DB if required in production)
_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_conversation(conv_id: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
    global _CONVERSATIONS
    if not conv_id or conv_id not in _CONVERSATIONS:
        new_id = conv_id or f"conv_{uuid.uuid4().hex[:12]}"
        _CONVERSATIONS[new_id] = {
            "conversation_id": new_id,
            "created_at": time.time(),
            "updated_at": time.time(),
            "context": {
                "location": None,
                "crop": None,
                "growth_stage": None,
                "forecast_horizon": "7D"
            },
            "last_forecast": None,
            "last_advisory": None,
            "messages": []
        }
        return new_id, _CONVERSATIONS[new_id]
    
    conv = _CONVERSATIONS[conv_id]
    conv["updated_at"] = time.time()
    return conv_id, conv

def update_conversation(
    conv_id: str,
    context: Optional[Dict[str, Any]] = None,
    last_forecast: Optional[Dict[str, Any]] = None,
    last_advisory: Optional[Dict[str, Any]] = None,
    user_msg: Optional[str] = None,
    assistant_msg: Optional[str] = None
):
    global _CONVERSATIONS
    if conv_id not in _CONVERSATIONS:
        get_or_create_conversation(conv_id)
    
    conv = _CONVERSATIONS[conv_id]
    conv["updated_at"] = time.time()

    if context:
        for k, v in context.items():
            if v is not None:
                conv["context"][k] = v

    if last_forecast:
        conv["last_forecast"] = last_forecast

    if last_advisory:
        conv["last_advisory"] = last_advisory

    if user_msg:
        conv["messages"].append({"role": "user", "text": user_msg, "time": time.time()})

    if assistant_msg:
        conv["messages"].append({"role": "assistant", "text": assistant_msg, "time": time.time()})
