"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ScoreRing } from "@/components/ScoreRing";

type Project = {
  id: string;
  name: string;
  description: string;
  notes: string;
  created_at: string;
};

type ProjectPitch = {
  id: string;
  created_at: string;
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

type Stage = "idle" | "recording" | "submitting";

type FilterKey = "Overall" | "Content" | "Clarity" | "Persuasiveness" | "Pacing" | "Confidence";
type TimeFilter = "All Time" | "This Week" | "This Month" | "This Year";

const FILTERS: { key: FilterKey; color: string }[] = [
  { key: "Overall",        color: "#059669" },
  { key: "Content",        color: "#6366f1" },
  { key: "Clarity",        color: "#f59e0b" },
  { key: "Persuasiveness", color: "#ec4899" },
  { key: "Pacing",         color: "#0284c7" },
  { key: "Confidence",     color: "#f97316" },
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

const CATEGORIES: { key: keyof ProjectPitch; label: string; color: string }[] = [
  { key: "content_score",        label: "Content",        color: "#6366f1" },
  { key: "clarity_score",        label: "Clarity",        color: "#f59e0b" },
  { key: "persuasiveness_score", label: "Persuasiveness", color: "#ec4899" },
  { key: "pacing_score",         label: "Pacing",         color: "#0284c7" },
  { key: "confidence_score",     label: "Confidence",     color: "#f97316" },
];

function PitchTooltip({ active, payload }: { active?: boolean; payload?: { dataKey: string; value: number; color: string; payload: { name: string } }[] }) {
  if (!active || !payload?.length) return null;
  const name = payload[0].payload.name;
  return (
    <div style={{ backgroundColor: "#1c1917", border: "1px solid #292524", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#e7e5e4", maxWidth: 200 }}>
      <p className="font-semibold mb-1.5 truncate">{name}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>{entry.dataKey}: <span className="font-semibold">{entry.value}</span></p>
      ))}
    </div>
  );
}

export default function ProjectPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [pitches, setPitches] = useState<ProjectPitch[]>([]);
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [activeTab, setActiveTab] = useState<"practice" | "stats" | "history">("practice");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(["Overall"]));
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>("All Time");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [stage, setStage] = useState<Stage>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const [latestResult, setLatestResult] = useState<ProjectPitch | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const u = JSON.parse(stored);
    setUser(u);

    async function load() {
      const [projRes, pitchRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/pitches`),
      ]);
      const proj = await projRes.json();
      const pitchData = pitchRes.ok ? await pitchRes.json() : [];
      setProject(proj);
      setEditName(proj.name ?? "");
      setEditDescription(proj.description ?? "");
      setEditNotes(proj.notes ?? "");
      setPitches(pitchData);
      setLoading(false);
    }
    load();
  }, [projectId, router]);

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDescription, notes: editNotes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProject(updated);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2000);
    }
    setSaving(false);
  }

  async function startRecording() {
    setRecordingError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.start(100);
      setElapsed(0);
      setStage("recording");
      elapsedTimerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    } catch {
      setRecordingError("Microphone access denied. Please allow microphone access.");
    }
  }

  async function submitPitch() {
    if (!mediaRecorderRef.current || !user) return;
    clearInterval(elapsedTimerRef.current!);
    setStage("submitting");

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "pitch.webm");
      formData.append("userId", user.id);

      try {
        const res = await fetch(`/api/projects/${projectId}/pitch`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const newPitch: ProjectPitch = {
          id: data.pitchId,
          created_at: new Date().toISOString(),
          transcript: data.transcript,
          words_per_minute: data.wpm,
          filler_words: data.fillerCount,
          overall_score: data.overall_score,
          overall_summary: data.overall_summary,
          content_score: data.content?.score,
          content_strengths: data.content?.strengths,
          content_improvements: data.content?.improvements,
          clarity_score: data.clarity?.score,
          clarity_strengths: data.clarity?.strengths,
          clarity_improvements: data.clarity?.improvements,
          persuasiveness_score: data.persuasiveness?.score,
          persuasiveness_strengths: data.persuasiveness?.strengths,
          persuasiveness_improvements: data.persuasiveness?.improvements,
          pacing_score: data.pacing?.score,
          pacing_strengths: data.pacing?.strengths,
          pacing_improvements: data.pacing?.improvements,
          confidence_score: data.confidence?.score,
          confidence_strengths: data.confidence?.strengths,
          confidence_improvements: data.confidence?.improvements,
        };
        setPitches((prev) => [...prev, newPitch]);
        setLatestResult(newPitch);
        setStage("idle");
      } catch {
        setRecordingError("Analysis failed. Please try again.");
        setStage("idle");
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current.stop();
  }

  const filteredPitches = applyTimeFilter(pitches, activeTimeFilter);

  const chartData = filteredPitches.map((p) => ({
    name: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    Overall: Math.round(p.overall_score),
    Content: p.content_score,
    Clarity: p.clarity_score,
    Persuasiveness: p.persuasiveness_score,
    Pacing: p.pacing_score,
    Confidence: p.confidence_score,
  }));

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

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen checker-bg text-stone-100">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-stone-100">
            sell me this <span className="text-emerald-400">___</span>
          </h1>
          <button
            onClick={() => router.push("/projects")}
            className="text-sm text-stone-500 hover:text-stone-200 transition flex items-center gap-1.5"
          >
            <span>←</span> Projects
          </button>
        </div>
        {/* Tabs */}
        <div className="flex px-6">
          {(["practice", "stats", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition ${
                activeTab === tab
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* ── Practice Tab ── */}
        {activeTab === "practice" && (
          <div className="space-y-6">
            {/* Project info */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                  Preparation Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={5}
                  placeholder="Key selling points, target audience, objections to address..."
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-stone-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                {saveMsg && <span className="text-emerald-400 text-sm">{saveMsg}</span>}
              </div>
            </div>

            {/* Recording */}
            {recordingError && (
              <div className="bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {recordingError}
              </div>
            )}

            {stage === "idle" && (
              <button
                onClick={startRecording}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-4 transition"
              >
                Start Pitch
              </button>
            )}

            {stage === "recording" && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center space-y-6">
                <div className="flex items-center justify-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="text-red-400 font-semibold tracking-wide uppercase text-sm">Recording</span>
                </div>
                <div className="text-6xl font-mono font-bold tabular-nums text-stone-100">
                  {mins}:{secs.toString().padStart(2, "0")}
                </div>
                <p className="text-stone-500 text-sm">Speak clearly. Click submit when done.</p>
                <button
                  onClick={submitPitch}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl px-4 py-4 transition"
                >
                  Submit Pitch
                </button>
              </div>
            )}

            {stage === "submitting" && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl text-center space-y-4 py-12">
                <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-stone-300 font-medium">Analyzing your pitch...</p>
                <p className="text-stone-500 text-sm">Using your project notes for context</p>
              </div>
            )}

            {/* Latest Result */}
            {latestResult && stage === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-300">Latest Result</h3>
                  <button
                    onClick={() => setLatestResult(null)}
                    className="text-xs text-stone-500 hover:text-stone-300"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="bg-stone-900 border border-emerald-800/50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-stone-500 text-sm">Overall Score</p>
                    <ScoreRing score={Math.round(latestResult.overall_score)} size={96} strokeWidth={6} />
                  </div>
                  <p className="text-stone-400 text-sm leading-relaxed">{latestResult.overall_summary}</p>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-stone-800 rounded-xl p-3">
                      <div className="text-xl font-mono font-bold text-stone-100">{latestResult.words_per_minute}</div>
                      <div className="text-stone-500 text-xs">Words / min</div>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-3">
                      <div className="text-xl font-mono font-bold text-stone-100">{latestResult.filler_words}</div>
                      <div className="text-stone-500 text-xs">Filler words</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {CATEGORIES.map(({ key, label, color }) => {
                      const score = latestResult[key] as number;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-xs text-stone-500 w-28 shrink-0">{label}</span>
                          <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-xs font-mono font-semibold text-stone-300 w-7 text-right shrink-0">{score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Stats Tab ── */}
        {activeTab === "stats" && (
          pitches.length === 0 ? (
            <div className="text-center py-20 text-stone-500">
              <p>No pitches yet. Record your first pitch to see stats.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 text-center">
                  <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Pitches</p>
                  <p className="text-stone-100 font-mono font-bold text-2xl">{pitches.length}</p>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 text-center">
                  <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Best</p>
                  <p className="text-emerald-400 font-mono font-bold text-2xl">
                    {Math.round(Math.max(...pitches.map((p) => p.overall_score)))}
                  </p>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 text-center">
                  <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">Avg</p>
                  <p className="text-sky-400 font-mono font-bold text-2xl">
                    {Math.round(pitches.reduce((s, p) => s + p.overall_score, 0) / pitches.length)}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  {FILTERS.map(({ key, color }) => {
                    const isActive = activeFilters.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleFilter(key)}
                        style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                          isActive ? "text-white" : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
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
                {filteredPitches.length === 0 && (
                  <p className="text-center text-stone-500 text-sm py-4">
                    No pitches in this time range.
                  </p>
                )}
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      {FILTERS.filter((f) => activeFilters.has(f.key)).map(({ key, color }) => (
                        <linearGradient key={key} id={`grad-project-${key}`} x1="0" y1="0" x2="0" y2="1">
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
                        fill={`url(#grad-project-${key})`}
                        dot={false}
                        activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                        isAnimationActive={true}
                        animationDuration={300}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          pitches.length === 0 ? (
            <div className="text-center py-20 text-stone-500">
              <p>No pitches yet for this project.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...pitches].reverse().map((pitch) => {
                const isExpanded = expandedIds.has(pitch.id);
                return (
                  <div key={pitch.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpanded(pitch.id)}
                      className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-stone-800/60 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-stone-300 font-mono">
                          {new Date(pitch.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5 font-mono">
                          {pitch.words_per_minute} wpm · {pitch.filler_words} filler words
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ScoreRing score={Math.round(pitch.overall_score)} size={60} strokeWidth={4} />
                        <span className="text-stone-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-stone-800 px-5 py-4 space-y-4">
                        <p className="text-sm text-stone-400 leading-relaxed">{pitch.overall_summary}</p>

                        <div>
                          <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">
                            Category Scores
                          </p>
                          <div className="space-y-2">
                            {CATEGORIES.map(({ key, label, color }) => {
                              const score = pitch[key] as number;
                              const strengths = pitch[`${key.replace("_score", "_strengths")}` as keyof ProjectPitch] as string;
                              const improvements = pitch[`${key.replace("_score", "_improvements")}` as keyof ProjectPitch] as string;
                              return (
                                <div key={key} className="space-y-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-stone-500 w-28 shrink-0">{label}</span>
                                    <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-stone-300 w-7 text-right shrink-0">{score}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pl-28 text-xs text-stone-500">
                                    <span><span className="text-emerald-400 font-medium">+ </span>{strengths}</span>
                                    <span><span className="text-amber-500 font-medium">↑ </span>{improvements}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {pitch.transcript && (
                          <div>
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
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
          )
        )}
      </main>
    </div>
  );
}
