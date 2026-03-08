# sell me a ___

A sales pitch trainer that gives you a random product, records your pitch, and scores it with AI.

---

## What it does

- **Custom or AI-generated pitch prompts** — enter your own product or let GPT invent one
- **Voice recording** — record your pitch directly in the browser
- **AI scoring** — Whisper transcribes your pitch, GPT-4o-mini scores it across 5 categories
- **Results breakdown** — scores, WPM, filler word count, strengths and improvements per category
- **Projects** — track progress on a specific product over multiple sessions
- **Profile** — score history chart, streak tracking, session history with per-category breakdowns

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI Whisper (transcription) + GPT-4o-mini (scoring & prompts) |
| Charts | Recharts |

---

## Getting started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd sell-me-a/sell-me-a
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the `sell-me-a/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

- **Supabase**: Create a free project at [supabase.com](https://supabase.com). Find your URL and anon key in **Project Settings → API**.
- **OpenAI**: Get an API key at [platform.openai.com](https://platform.openai.com).

### 4. Set up the database

Run the following SQL in your Supabase SQL editor (**SQL Editor → New query**):

```sql
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  streak integer not null default 0,
  last_pitch_date date
);

-- Pitches table
create table pitches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  prompt text,
  transcript text,
  words_per_minute integer,
  filler_words integer,
  overall_score numeric,
  overall_summary text,
  content_score numeric,
  content_strengths text,
  content_improvements text,
  clarity_score numeric,
  clarity_strengths text,
  clarity_improvements text,
  persuasiveness_score numeric,
  persuasiveness_strengths text,
  persuasiveness_improvements text,
  pacing_score numeric,
  pacing_strengths text,
  pacing_improvements text,
  confidence_score numeric,
  confidence_strengths text,
  confidence_improvements text
);

-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  description text
);
```

You may also want to enable Row Level Security (RLS) and add policies if you plan to expose this publicly. For a private/personal deployment the defaults are fine.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to use

### Logging in
Enter any username — no password needed. Returning users get their history back automatically by using the same username.

### Pitching
1. From the dashboard, choose **Enter my own prompt** or **Generate a prompt with AI**
2. Read the prep card, then hit **Start Recording** when you're ready
3. Pitch for up to 2 minutes, then hit **Stop**
4. Wait for AI analysis (transcription + scoring takes ~10–20 seconds)
5. View your results

### Scores
Each pitch is graded across 5 categories (0–100):

| Category | What it measures |
|---|---|
| Content | Value proposition, product knowledge, structure |
| Clarity | How easy your pitch is to follow |
| Persuasiveness | Ability to convince and handle objections |
| Pacing | Speaking speed (ideal: 120–160 WPM) |
| Confidence | Delivery, tone, and authority |

### Projects
Create a project for a specific product you want to improve at. Each session under a project is tracked separately so you can see your progress over time.

### Profile
View your pitch history, score trends over time, best and average scores, and daily streak.

---

## Project structure

```
sell-me-a/
├── app/
│   ├── page.tsx                  # Login page
│   ├── dashboard/page.tsx        # Home dashboard
│   ├── pitch/page.tsx            # Recording flow
│   ├── results/page.tsx          # Score results
│   ├── profile/page.tsx          # Stats & history
│   ├── projects/page.tsx         # Projects list
│   ├── projects/[id]/page.tsx    # Individual project
│   └── api/
│       ├── analyze/route.ts      # Whisper + GPT scoring
│       ├── analyze-pitch/route.ts
│       ├── generate-prompt/route.ts  # AI prompt generation
│       └── projects/             # Project CRUD endpoints
├── components/
│   └── ScoreRing.tsx             # SVG circular score component
├── lib/
│   ├── supabase.ts               # Supabase client
│   └── openai.ts                 # OpenAI client
└── .env.local                    # Your secrets (not committed)
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Notes

- Audio is recorded using the browser's MediaRecorder API and sent as a blob to the `/api/analyze` endpoint. Your browser must allow microphone access.
- OpenAI Whisper requires audio files — the pitch page records in `audio/webm` format which Whisper accepts.
- The Supabase free tier pauses projects after 1 week of inactivity. If login fails with a certificate error, restore the project from the [Supabase dashboard](https://supabase.com/dashboard).
