import os
import google.generativeai as genai

# Configure the Gemini API key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBF2uZHkPbSIuvxzJ1_fp9JAUKoRVFgRCk")
if not GEMINI_API_KEY:
    raise ValueError("Gemini API key not found. Please set the GEMINI_API_KEY environment variable.")

genai.configure(api_key=GEMINI_API_KEY)

# Create the model
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

def generate_text(prompt: str) -> str:
    """
    Generates text using the Gemini API.

    Args:
        prompt: The prompt to send to the API.

    Returns:
        The generated text.
    """
    chat_session = model.start_chat(history=[])
    response = chat_session.send_message(prompt)
    return response.text
