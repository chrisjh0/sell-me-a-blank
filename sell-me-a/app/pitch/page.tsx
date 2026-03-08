"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Stage = "input" | "prep" | "recording" | "submitting";

function PitchFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [description, setDescription] = useState(searchParams.get("description") ?? "");
  const [error, setError] = useState("");

  const prompt = name.trim() && description.trim()
    ? `${name.trim()} – ${description.trim()}`
    : name.trim();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  function startPrep() {
    if (!name.trim()) return;
    setError("");
    setStage("prep");
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(100);
      setStage("recording");
    } catch {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  async function submitPitch() {
    if (!mediaRecorderRef.current || !user) return;
    setStage("submitting");

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "pitch.webm");
      formData.append("prompt", prompt);
      formData.append("userId", user.id);

      try {
        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        router.push(`/results?pitchId=${data.pitchId}`);
      } catch {
        setError("Failed to analyze pitch. Please try again.");
        setStage("input");
      }

      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current.stop();
  }

  if (!user) return null;

  return (
    <div className="min-h-screen checker-bg text-stone-100">
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-stone-100">
          sell me this <span className="text-emerald-400">___</span>
        </h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-stone-500 hover:text-stone-200 transition flex items-center gap-1.5"
        >
          <span>←</span> Dashboard
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {stage === "input" && (
          <InputStage
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onStart={startPrep}
          />
        )}

        {stage === "prep" && (
          <PrepStage prompt={prompt} onStartRecording={startRecording} />
        )}

        {stage === "recording" && (
          <RecordingStage onSubmit={submitPitch} />
        )}

        {stage === "submitting" && <SubmittingStage />}
      </main>
    </div>
  );
}

export default function PitchPage() {
  return (
    <Suspense>
      <PitchFlow />
    </Suspense>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputStage({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onStart,
}: {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-stone-100">What are you selling?</h2>
        <p className="text-stone-500 text-sm">Fill in your product details, then start your prep timer.</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
            Product Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder='e.g. "FoldMate"'
            autoFocus
            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder='e.g. "an umbrella that folds itself with the press of a button"'
            rows={4}
            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition text-sm"
          />
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={!name.trim()}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3.5 text-sm transition"
      >
        Start Preparation →
      </button>
    </div>
  );
}

function PrepStage({
  prompt,
  onStartRecording,
}: {
  prompt: string;
  onStartRecording: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const urgent = timeLeft <= 10;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Preparation</p>
        <h2 className="text-xl font-bold tracking-tight text-emerald-400">{prompt}</h2>
      </div>

      <div
        className={`rounded-2xl px-6 py-8 text-center transition-colors border ${
          urgent
            ? "bg-red-950/40 border-red-800"
            : "bg-stone-900 border-stone-800"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-stone-500">
          Time remaining
        </p>
        <div
          className={`text-7xl font-mono font-bold tabular-nums tracking-tight ${
            urgent ? "text-red-400" : "text-stone-100"
          }`}
        >
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your hook, key points, call to action..."
          rows={6}
          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-600 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
      </div>

      <button
        onClick={onStartRecording}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-3.5 text-sm transition"
      >
        Start Recording →
      </button>
    </div>
  );
}

function RecordingStage({ onSubmit }: { onSubmit: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center space-y-8">
      <div className="flex items-center justify-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-red-400 font-semibold text-sm tracking-wide uppercase">Recording</span>
      </div>

      <div className="text-7xl font-mono font-bold tabular-nums tracking-tight text-stone-100">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>

      <p className="text-stone-500 text-sm">Speak clearly and confidently. Click submit when finished.</p>

      <button
        onClick={onSubmit}
        className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl px-4 py-3.5 text-sm transition"
      >
        Submit Pitch
      </button>
    </div>
  );
}

function SubmittingStage() {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-16 text-center space-y-5">
      <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <div>
        <p className="text-stone-100 font-semibold">Analyzing your pitch…</p>
        <p className="text-stone-500 text-sm mt-1">Transcribing audio and scoring your delivery</p>
      </div>
    </div>
  );
}
