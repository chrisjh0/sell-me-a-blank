"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ScoreRing } from "@/components/ScoreRing";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Pitch = {
  id: string;
  created_at: string;
  prompt: string;
  transcript: string;
  overall_score: number;
  content_score: number;
  clarity_score: number;
  persuasiveness_score: number;
  pacing_score: number;
  confidence_score: number;
};

type UserRow = {
  id: string;
  username: string;
  streak: number;
  last_pitch_date: string | null;
};

type FilterKey = "Overall" | "Content" | "Clarity" | "Persuasiveness" | "Pacing" | "Confidence";
type TimeFilter = "All Time" | "This Week" | "This Month" | "This Year";
type ViewTab = "stats" | "history";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "Overall",        label: "Overall",        color: "#059669" },
  { key: "Content",        label: "Content",        color: "#6366f1" },
  { key: "Clarity",        label: "Clarity",        color: "#f59e0b" },
  { key: "Persuasiveness", label: "Persuasiveness", color: "#ec4899" },
  { key: "Pacing",         label: "Pacing",         color: "#0284c7" },
  { key: "Confidence",     label: "Confidence",     color: "#f97316" },
];

const CATEGORIES: { key: keyof Pitch; label: string; color: string }[] = [
  { key: "content_score",        label: "Content",        color: "#6366f1" },
  { key: "clarity_score",        label: "Clarity",        color: "#f59e0b" },
  { key: "persuasiveness_score", label: "Persuasiveness", color: "#ec4899" },
  { key: "pacing_score",         label: "Pacing",         color: "#0284c7" },
  { key: "confidence_score",     label: "Confidence",     color: "#f97316" },
];

const TIME_FILTERS: TimeFilter[] = ["All Time", "This Week", "This Month", "This Year"];

function applyTimeFilter<T extends { created_at: string }>(items: T[], filter: TimeFilter): T[] {
  const now = new Date();
  return items.filter((p) => {
    const d = new Date(p.created_at);
    if (filter === "This Week") {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      return d >= cutoff;
    }
    if (filter === "This Month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter === "This Year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function parseName(prompt: string) {
  const idx = prompt.indexOf(" – ");
  return idx !== -1 ? prompt.slice(0, idx) : prompt;
}

function PitchTooltip({ active, payload }: { active?: boolean; payload?: { dataKey: string; value: number; color: string; payload: { name: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: "#1c1917", border: "1px solid #292524", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e7e5e4", maxWidth: 220 }}>
      <p className="font-semibold mb-1.5 truncate">{payload[0].payload.name}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>{entry.dataKey}: <span className="font-semibold">{entry.value}</span></p>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRow | null>(null);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewTab>("stats");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(["Overall"]));
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("All Time");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    const local = JSON.parse(stored) as { id: string; username: string };

    async function load() {
      const [{ data: userData }, { data: pitchData }] = await Promise.all([
        supabase.from("users").select("*").eq("id", local.id).single(),
        supabase
          .from("pitches")
          .select("id, created_at, prompt, transcript, overall_score, content_score, clarity_score, persuasiveness_score, pacing_score, confidence_score")
          .eq("user_id", local.id)
          .order("created_at", { ascending: true }),
      ]);
      setUser(userData as UserRow);
      setPitches((pitchData as Pitch[]) ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filteredPitches = applyTimeFilter(pitches, activeTimeFilter);

  const chartData = filteredPitches.map((p) => ({
    name: parseName(p.prompt),
    Overall: Math.round(p.overall_score),
    Content: p.content_score,
    Clarity: p.clarity_score,
    Persuasiveness: p.persuasiveness_score,
    Pacing: p.pacing_score,
    Confidence: p.confidence_score,
  }));

  const bestScore = pitches.length > 0
    ? Math.round(Math.max(...pitches.map((p) => p.overall_score)))
    : null;
  const avgScore = pitches.length > 0
    ? Math.round(pitches.reduce((s, p) => s + p.overall_score, 0) / pitches.length)
    : null;

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen checker-bg text-stone-100">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-100">
            sell me this <span className="text-emerald-400">___</span>
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-stone-500 hover:text-stone-200 transition flex items-center gap-1.5"
          >
            <span>←</span> Dashboard
          </button>
        </div>

        {/* View tabs (Stats | History) */}
        <div className="flex px-6">
          {(["stats", "history"] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition ${
                activeView === v
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        {/* Stat cards — reflect selected type */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 border-t-2 border-t-stone-700">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2">Pitches</p>
            <p className="text-stone-100 font-mono font-bold text-2xl tabular-nums">{pitches.length}</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 border-t-2 border-t-emerald-500">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2">Streak</p>
            <p className="text-emerald-400 font-mono font-bold text-2xl tabular-nums">
              {user?.streak ?? 0} <span className="text-base font-medium">days</span>
            </p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 border-t-2 border-t-sky-500">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2">Best</p>
            <p className="text-sky-400 font-mono font-bold text-2xl tabular-nums">{bestScore ?? "—"}</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 border-t-2 border-t-indigo-400">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2">Average</p>
            <p className="text-indigo-400 font-mono font-bold text-2xl tabular-nums">{avgScore ?? "—"}</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 border-t-2 border-t-stone-700">
            <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-2">Username</p>
            <p className="text-stone-100 font-mono font-bold text-base truncate">@{user?.username}</p>
          </div>
        </div>

        {pitches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-500 mb-4">No pitches yet.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3 text-sm font-medium transition"
            >
              Start Pitching
            </button>
          </div>
        ) : activeView === "stats" ? (
          /* ── Stats ── */
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
            {filteredPitches.length === 0 && (
              <p className="text-center text-stone-500 text-sm py-4">No pitches in this time range.</p>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {FILTERS.map(({ key, label, color }) => {
                const isActive = activeFilters.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                      isActive
                        ? "text-white"
                        : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Time Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {TIME_FILTERS.map((tf) => {
                const isActive = activeTimeFilter === tf;
                return (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeFilter(tf)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                      isActive
                        ? "bg-stone-700 border-stone-600 text-stone-100"
                        : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  {FILTERS.filter((f) => activeFilters.has(f.key)).map(({ key, color }) => (
                    <linearGradient key={key} id={`grad-profile-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                <XAxis dataKey="name" stroke="#44403c" tick={false} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#44403c" fontSize={12} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "#78716c" }} />
                <Tooltip
                  content={<PitchTooltip />}
                  cursor={{ stroke: "#44403c", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                {FILTERS.filter((f) => activeFilters.has(f.key)).map(({ key, color }) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2.5}
                    fill={`url(#grad-profile-${key})`}
                    dot={false}
                    activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* ── History ── */
          <div className="space-y-2">
            {[...pitches].reverse().slice(0, 20).map((pitch) => {
              const name = parseName(pitch.prompt);
              const isExpanded = expandedIds.has(pitch.id);

              return (
                <div
                  key={pitch.id}
                  className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(pitch.id)}
                    className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-stone-800/60 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-100 font-semibold truncate">{name}</p>
                      <p className="text-xs text-stone-600 mt-1 font-mono">
                        {new Date(pitch.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreRing score={Math.round(pitch.overall_score)} size={60} strokeWidth={4} />
                      <span className="text-stone-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-stone-800 px-5 py-4 space-y-3">
                      <div className="space-y-2">
                        {CATEGORIES.map(({ key, label, color }) => {
                          const score = pitch[key] as number;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-xs text-stone-500 w-36 shrink-0">{label}</span>
                              <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-xs font-mono font-semibold text-stone-300 w-7 text-right shrink-0">
                                {score}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {pitch.transcript && (
                        <div>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2 mt-2">
                            Transcript
                          </p>
                          <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-wrap">
                            {pitch.transcript}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
