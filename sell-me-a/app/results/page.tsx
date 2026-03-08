"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ScoreRing } from "@/components/ScoreRing";

type CategoryKey = "content" | "clarity" | "persuasiveness" | "pacing" | "confidence";

type Pitch = {
  id: string;
  prompt: string;
  transcript: string;
  words_per_minute: number;
  filler_words: number;
  overall_score: number;
  overall_summary: string;
  content_score: number;
  content_strengths: string;
  content_improvements: string;
  clarity_score: number;
  clarity_strengths: string;
  clarity_improvements: string;
  persuasiveness_score: number;
  persuasiveness_strengths: string;
  persuasiveness_improvements: string;
  pacing_score: number;
  pacing_strengths: string;
  pacing_improvements: string;
  confidence_score: number;
  confidence_strengths: string;
  confidence_improvements: string;
};

const CATEGORIES: { key: CategoryKey; label: string; color: string }[] = [
  { key: "content",        label: "Content",        color: "#6366f1" },
  { key: "clarity",        label: "Clarity",        color: "#f59e0b" },
  { key: "persuasiveness", label: "Persuasiveness", color: "#ec4899" },
  { key: "pacing",         label: "Pacing",         color: "#0284c7" },
  { key: "confidence",     label: "Confidence",     color: "#f97316" },
];

function parsePitchPrompt(prompt: string) {
  const idx = prompt.indexOf(" – ");
  if (idx !== -1) return { name: prompt.slice(0, idx), description: prompt.slice(idx + 3) };
  return { name: prompt, description: "" };
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pitchId = searchParams.get("pitchId");

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!pitchId) { router.push("/dashboard"); return; }
    supabase
      .from("pitches")
      .select("*")
      .eq("id", pitchId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push("/dashboard"); return; }
        setPitch(data as Pitch);
        setLoading(false);
      });
  }, [pitchId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pitch) return null;

  const overall = Math.round(pitch.overall_score);
  const { name, description } = parsePitchPrompt(pitch.prompt);

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

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Hero — product + score */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center space-y-6">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Pitch Results</p>
            <h2 className="text-2xl font-bold tracking-tight text-stone-100">{name}</h2>
            {description && (
              <p className="text-stone-400 text-sm mt-1">{description}</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <ScoreRing score={overall} size={148} strokeWidth={8} />
            <p className="text-stone-500 text-sm font-medium">Overall Score</p>
          </div>

          <p className="text-stone-400 text-sm leading-relaxed max-w-md mx-auto">
            {pitch.overall_summary}
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 text-center">
            <div className="text-3xl font-mono font-bold text-stone-100 tabular-nums">{pitch.words_per_minute}</div>
            <div className="text-stone-500 text-sm mt-1 font-medium">Words / min</div>
            <div className="text-stone-600 text-xs mt-0.5">Ideal: 120–160</div>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 text-center">
            <div className="text-3xl font-mono font-bold text-stone-100 tabular-nums">{pitch.filler_words}</div>
            <div className="text-stone-500 text-sm mt-1 font-medium">Filler words</div>
            <div className="text-stone-600 text-xs mt-0.5">um, uh, like…</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h2 className="font-semibold text-stone-400 tracking-tight text-sm uppercase tracking-widest">Category Breakdown</h2>
          {CATEGORIES.map(({ key, label, color }) => {
            const score = pitch[`${key}_score`] as number;
            const strengths = pitch[`${key}_strengths`] as string;
            const improvements = pitch[`${key}_improvements`] as string;

            return (
              <div
                key={key}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-5 border-l-4"
                style={{ borderLeftColor: color }}
              >
                <div className="flex items-start gap-5">
                  <ScoreRing score={score} size={76} strokeWidth={5} color={color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-100 mb-3">{label}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                          Strengths
                        </p>
                        <p className="text-stone-400 leading-relaxed">{strengths}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                          Improve
                        </p>
                        <p className="text-stone-400 leading-relaxed">{improvements}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transcript */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-stone-300 hover:bg-stone-800/60 transition"
          >
            <span>View Transcript</span>
            <span className="text-stone-500 text-xs">{showTranscript ? "▲" : "▼"}</span>
          </button>
          {showTranscript && (
            <div className="px-5 pb-5 border-t border-stone-800">
              <p className="text-stone-400 text-sm leading-relaxed whitespace-pre-wrap pt-4">
                {pitch.transcript}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 bg-stone-900 border border-stone-700 hover:border-stone-500 hover:bg-stone-800 text-stone-300 font-medium rounded-xl px-4 py-3 text-sm transition"
          >
            Pitch Again
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-3 text-sm transition"
          >
            View My Stats
          </button>
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
