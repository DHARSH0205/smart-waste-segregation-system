import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-flash-lite-latest"
SYSTEM_INSTRUCTION = """You are 'EcoBuddy,' an expert AI assistant specialized in waste segregation and sustainability.

MISSION:
Your job is to help users understand how to dispose of items correctly and suggest creative upcycling ideas for common waste.

KNOWLEDGE BASE:
- Categorize waste into: Organic (Green), Recyclable (Blue), Hazardous/Non-Recyclable (Red).
- Prioritize the '3 Rs': Reduce, Reuse, Recycle.

BEHAVIOR RULES:
- If a user mentions a specific item (e.g., 'plastic bottle'), explain if it needs rinsing first.
- If the disposal method for an item is dangerous (like E-waste), emphasize taking it to a certified collection center.
- Keep responses under 3 sentences unless the user asks for a DIY recipe.
- Stay positive and encouraging about environmental impact.
"""


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Gemini API key is not configured")
    return genai.Client(api_key=api_key)


def generate_chat_reply(message: str) -> dict:
    prompt = (message or "").strip()
    if not prompt:
        raise ValueError("Message cannot be empty")

    client = _get_client()
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0),
            system_instruction=SYSTEM_INSTRUCTION,
        ),
    )

    reply = (response.text or "").strip()
    if not reply:
        raise RuntimeError("Received empty response from Gemini")

    return {"reply": reply, "model": MODEL_NAME}