# Implementation Guide: Agentic Research and Podcast Synthesizer

This document serves as a builder contract, outlining the specific coding tasks required to implement the agentic research and podcast synthesizer features.

## Phase 1: Core Agentic Framework

### Task 1.1: Create the `Agent` model
- **File:** `src/backend/models.py`
- **Action:** Create a new SQLAlchemy model named `Agent`.
- **Columns:**
    - `id`: Integer, primary key
    - `name`: String, not nullable
    - `role`: String, not nullable (e.g., "summarizer", "researcher")
    - `topic_stream_id`: Integer, ForeignKey to `topic_streams.id`
    - `last_report`: Text
    - `created_at`: DateTime, default `datetime.utcnow`

### Task 1.2: Create the `AgentRecruiter`
- **File:** `src/backend/agent_recruiter.py`
- **Action:** Create a new class `AgentRecruiter`.
- **Methods:**
    - `recruit_summarizer(topic_stream_id)`: Creates a new `Agent` with the role "summarizer" for the given `topic_stream_id`.
    - `recruit_researcher(topic_stream_id)`: Creates a new `Agent` with the role "researcher" for the given `topic_stream_id`.

### Task 1.3: Integrate Agent Recruitment into Stream Updates
- **File:** `src/backend/scheduler.py`
- **Action:** In the `update_topic_stream` function, after a new summary is created, call the `AgentRecruiter` to recruit a "summarizer" agent for the topic stream.

## Phase 2: Podcast Synthesizer

### Task 2.1: Implement `podcast_episodes` table
- **File:** `src/backend/models.py`
- **Action:** Create the `PodcastEpisode` model as defined in `docs/podcast_synth_plan.md`.
- **File:** `alembic/`
- **Action:** Generate and apply a new alembic migration for the `podcast_episodes` table.

### Task 2.2: Implement Content Condensation
- **File:** `src/backend/podcast_synthesizer.py`
- **Action:** Create a new class `PodcastSynthesizer`.
- **Methods:**
    - `condense_summaries(user_id)`:
        1. Get all topic streams for the given `user_id`.
        2. Get the latest summary for each topic stream.
        3. Use the Gemini API to generate a condensed summary of all the latest summaries.
        4. Return the condensed summary.

### Task 2.3: Implement Text-to-Speech
- **File:** `src/backend/podcast_synthesizer.py`
- **Action:**
    - Add a new method `generate_audio(text)` to the `PodcastSynthesizer` class.
    - This method will use a TTS service (e.g., Google Cloud Text-to-Speech) to convert the given text into an MP3 audio file.
    - The audio file will be stored in a cloud storage service (e.g., Google Cloud Storage).
    - The method will return the public URL of the audio file.

### Task 2.4: Implement Podcast Episode Generation
- **File:** `src/backend/podcast_synthesizer.py`
- **Action:**
    - Add a new method `create_podcast_episode(user_id)` to the `PodcastSynthesizer` class.
    - This method will:
        1. Call `condense_summaries(user_id)` to get the condensed summary.
        2. Call `generate_audio()` to convert the summary to audio and get the URL.
        3. Create a new `PodcastEpisode` record in the database with the title, description, and audio URL.

### Task 2.5: Implement RSS Feed Generation
- **File:** `src/backend/app.py`
- **Action:**
    - Create a new endpoint `/api/podcast/rss/{user_id}`.
    - This endpoint will:
        1. Get all podcast episodes for the given `user_id`.
        2. Generate a valid RSS feed in XML format.
        3. Return the RSS feed as an XML response.

### Task 2.6: Automate Podcast Generation
- **File:** `src/backend/scheduler.py`
- **Action:**
    - Create a new scheduled job that runs once a day.
    - This job will call the `create_podcast_episode` method for each user.

## Phase 3: Frontend Integration

### Task 3.1: Display Podcast RSS Feed
- **File:** `src/frontend/src/pages/Dashboard.jsx`
- **Action:**
    - Add a new section to the dashboard to display the user's podcast RSS feed URL.
    - The URL will be `/api/podcast/rss/{user_id}`.

This guide provides a clear set of tasks to be executed. Each task is specific and can be implemented without further planning.
