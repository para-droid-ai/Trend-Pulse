# Session Handoff: TrendPulse to V2 Architecture

**To the Local IDE Agent:**
This document summarizes a deep architectural planning session between the primary user and a previous agent instance. Your objective is to absorb this context to guide the rebuilding and evolution of the `para-droid-ai-trendpulse` repository.

## 1. Core Reading Material
You **MUST** read the newly generated document in this repository:
*   `docs/context_management_2026.md`

This document contains a comprehensive breakdown of:
*   The current state of context management (SQLite, tiktoken truncation, text concatenation).
*   The comparison to the `Gemini-Topic-Streamer` (GTS) sandbox project (noting the client-side/IndexedDB architecture of GTS as a red flag/anti-pattern).
*   The UI/UX design differences (TP is highly styled with Tailwind configs and atomic components; GTS was a raw testing ground).

## 2. The Architectural Pivot (V2 Vision)

The application is moving away from a strict Perplexity (`sonar`) Hackathon architecture to a **Multi-Model, BYOK, Local-First** paradigm.

### Key Mandates for the Rewrite:
1.  **Decouple from Perplexity:** The hard reliance on Perplexity API for simultaneous search and synthesis must be broken.
2.  **Multi-Model Ecosystem:** Build abstraction layers (`LLMProvider`) to support:
    *   **Google Gemini API** (Text, TTS, Imagen).
    *   **DeepSeek API** (v4, R1 for reasoning).
    *   **OpenRouter** (Targeting free models like Llama 3.3, Qwen, Gemma).
    *   **IBM Granite & Moonshot Kimi**.
    *   **Local Ollama Instances** (Crucial for free, private background processing).
3.  **The Retrieval Problem:** Because Perplexity is gone, you must build an independent Retrieval-Augmented Generation (RAG) / Search pipeline.
    *   Implement **RSS Ingestion** as a primary, deterministic "Targeted Stream".
    *   Implement Search API integrations (Tavily, Serper) or Gemini Grounding for broad web scans.
    *   Implement Scraping capabilities (Jina AI Reader, Playwright) for deep dives.
4.  **The Smart Persistent Agent:** Replace the dumb time-based cron scheduler (`scheduler.py`) with an autonomous agent. This agent will use local models (like `llama3.2` via Ollama) to monitor RSS feeds, perform context hygiene, summarize tangents, and trigger updates only when a genuine delta occurs in the data.
5.  **Reasoning UI:** Port the `<think>` tag visibility feature from the GTS sandbox into the polished UI of TP.
6.  **The Audio RSS Pinnacle:** Port the "Podcast Studio" concept from the GTS sandbox into TP's backend. The system must be able to synthesize the rolling context of multiple streams into a single narrative script and generate an audio episode (via Gemini TTS or similar).

## 3. The overarching Philosophy
This is no longer a simple API summarizer. It is a **Private, Agentic OSINT Platform**. It uses the structural DNA of RSS feeds to fuel a Smart Agent that curates, synthesizes, and outputs a highly refined "Super RSS" text feed, culminating in the ability to generate a synthesized "Audio RSS" podcast. Ensure strict OPSEC capabilities by prioritizing local model execution for context hygiene.
