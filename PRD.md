Product Requirements Document (PRD)

Product Name: Sell Me a ___ – AI Pitch Trainer

Author: Christopher Ho
Date: 2026-03-07
Version: 1.1

⸻

1. Purpose

“Sell Me a ___” is a web-based AI pitch trainer that helps users improve their sales and public speaking skills. Users can enter their own prompt or get an AI-generated prompt, have one minute to prepare, then deliver a spoken pitch. The system analyzes the pitch after submission, providing detailed feedback on multiple categories, an overall score, and tracks progress over time with line graphs and daily streaks.

This app is designed for anyone looking to improve pitching skills, from students to entrepreneurs, and provides an interactive, gamified learning experience.

⸻

2. Background / Problem Statement

People often struggle to give effective pitches due to poor pacing, unclear content, or lack of confidence. Existing tools typically analyze text only or provide generic feedback without tracking progress over time.

Solution:
	•	Hands-on pitch practice
	•	Realistic scoring on multiple public speaking traits
	•	Personalized progress tracking with graphs and streaks

⸻

3. Scope

In Scope (MVP):
	1.	Users can enter their own prompt or receive an AI-generated prompt.
	2.	1-minute preparation timer.
	3.	Pitch submission via microphone (voice recording).
	4.	Post-pitch analysis:
	•	Category scores (e.g., content, clarity, persuasiveness, pacing, confidence)
	•	Strengths + improvements per category
	•	Overall score (average of all categories)
	•	Overall summary of strengths and weaknesses
	5.	User accounts: username-only login.
	6.	User profile:
	•	Line graphs of overall and per-category scores over time
	•	Daily streak tracker
	7.	Web app hosted on Vercel, database managed via Supabase.

Out of Scope / Future Enhancements:
	•	Real-time feedback during speech
	•	Mobile-specific apps or offline functionality
	•	Multi-user comparison or leaderboards
	•	Advanced tone/pitch/emphasis analysis

⸻

4. Target Users
	•	Students practicing pitches for school or competitions
	•	Entrepreneurs preparing product pitches
	•	Individuals improving public speaking and persuasion skills
	•	Anyone seeking gamified, structured pitch practice

⸻

5. Product Overview / Features

Feature	Description	Priority
Prompt Selection	Users can enter their own prompt or generate one using AI	High
Preparation Timer	60-second countdown before pitch	High
Voice Pitch Submission	Users speak into microphone to submit pitch	High
Post-Pitch Analysis	GPT-based critique per category	High
Category Ratings	Scores out of 100 per category (content, clarity, persuasiveness, pacing, confidence)	High
Overall Score & Summary	Average score + summary of strengths/weaknesses	High
User Accounts	Login with username only	High
User Profile	Tracks scores and graphs over time	High
Daily Streak	Tracks consecutive days the user submitted a pitch	Medium
Graphs	Line charts for overall and per-category scores	High
Hosting & Database	Vercel hosting, Supabase for user and pitch data	High


⸻

6. User Flow
	1.	User visits web app → login with username.
	2.	User sees dashboard → choose enter own prompt or generate AI prompt.
	3.	Click Start Preparation → 60-second countdown.
	4.	Click Start Pitch → microphone recording begins.
	5.	Complete pitch → submit audio.
	6.	Audio sent to speech-to-text API (OpenAI Whisper) → transcript + timestamps.
	7.	Compute metrics: words per minute, pauses, filler words.
	8.	GPT receives transcript + metrics → returns:
	•	Category scores (0–100)
	•	Strengths + improvements per category
	•	Overall score & summary
	9.	Feedback displayed on dashboard: scores, category breakdown, graphs.
	10.	Daily streak updated if pitch submitted today.

⸻

7. Technical Requirements

Front-End:
	•	React or Next.js for UI
	•	Web Audio API for voice recording
	•	Chart.js or Recharts for graphs

Back-End / Database:
	•	Supabase for user data, pitch submissions, scores, streak tracking
	•	Serverless API endpoints on Vercel for pitch submission & analysis

AI / APIs:
	•	OpenAI Whisper for transcription of audio → text
	•	GPT API for scoring, critique, strengths/weaknesses summary

Performance / Constraints:
	•	Audio transcription + GPT feedback ≤ 5 seconds per pitch
	•	Handle multiple users simultaneously (basic Supabase concurrency)

⸻

8. Metrics & Success Criteria
	•	Pitch Analysis Accuracy: Feedback is coherent, useful, and relevant per category
	•	User Engagement: Users complete ≥1 pitch/day to maintain streak
	•	UI Usability: Users can start pitch, submit, and view results easily
	•	Hackathon Demo: Full cycle from prompt → pitch → AI critique → stats is visible

⸻

9. Risks & Mitigations

Risk	Mitigation
Poor audio quality	Limit recording to 60 seconds; provide instructions for clear speech
AI misinterpretation	Use Whisper timestamps for pacing; fallback sample prompts
Supabase connection issues	Local caching for demo; simple MVP structure
Real-time analysis too complex	MVP only analyzes after pitch submission


⸻

10. Hackathon MVP Timeline (~6 hours)

Step	Duration
Setup Supabase DB & Vercel hosting	0.5 hr
Front-end layout & login	0.5 hr
Prompt input & generation	0.5 hr
Audio recording & submission	1 hr
Transcription (Whisper API) & metrics calculation	1 hr
GPT critique integration	1 hr
User profile & graphs	1 hr
Testing & polish	0.5–1 hr


⸻

11. Hackathon Pitch / Key Selling Points
	•	Interactive, on-the-spot pitch practice
	•	AI-powered feedback for content and delivery
	•	Personalized stats, graphs, and daily streaks
	•	Users can generate or enter prompts for flexible practice
	•	Demo-ready: judges see prompt → pitch → critique → progress visualization