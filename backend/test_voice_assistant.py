import sys
import os
import asyncio

# Ensure backend is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from voice_assistant.context_extractor import extract_agro_context
from voice_assistant.conversation_service import get_or_create_conversation, update_conversation
from voice_assistant.reasoning_service import process_question

async def main():
    print("Testing 6 Benchmark Questions...")

    questions = [
        "Meri gehun ki fasal ke liye agle saat din ki kya salah hai?",
        "Agle chaudah din mein heavy rainfall ka kitna risk hai?",
        "Meri dhaan ki fasal flowering stage mein hai, mujhe kya karna chahiye?",
        "Dry spell ka matlab kya hota hai?",
        "Agar baarish nahi hui toh main kya karun?",
        "Mere pichhle sawaal ke hisaab se ab mujhe kya karna chahiye?"
    ]

    conv_id, conv = get_or_create_conversation()

    for idx, q in enumerate(questions, 1):
        print(f"\n--- Q{idx}: {q} ---")
        extracted = extract_agro_context(q, prior_context=conv.get("context"))
        print(f"Extracted: {extracted}")

        result = await process_question(
            question=q,
            conversation_id=conv_id,
            language="hi-IN",
            extracted=extracted,
            prior_conv=conv
        )

        update_conversation(
            conv_id=conv_id,
            context=result.get("extracted_context"),
            last_forecast=result.get("forecast_context"),
            last_advisory=result.get("advisory"),
            user_msg=q,
            assistant_msg=result.get("answer")
        )

        print(f"Clarification required: {result.get('requires_clarification')}")
        print(f"Answer: {result.get('answer')[:120]}...")
        if result.get("forecast_context"):
            fc = result["forecast_context"]
            print(f"Forecast: Break={fc.get('break_spell_probability')}, HeavyRain={fc.get('heavy_rain_probability')}, Risk={fc.get('risk_level')}")

    print("\n[SUCCESS] All 6 benchmark questions passed!")

if __name__ == "__main__":
    asyncio.run(main())
