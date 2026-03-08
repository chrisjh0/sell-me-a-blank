"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  async function handleGeneratePrompt() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-prompt", { method: "POST" });
      const data = await res.json();
      router.push(
        `/pitch?mode=generated&name=${encodeURIComponent(data.name)}&description=${encodeURIComponent(data.description)}`
      );
    } catch {
      setError("Failed to generate a prompt. Please try again.");
      setGenerating(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen checker-bg text-stone-100">
      <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-stone-100">
          sell me this <span className="text-emerald-400">___</span>
        </h1>
        <button
          onClick={() => router.push("/profile")}
          className="text-sm text-stone-500 hover:text-stone-200 transition"
        >
          My Profile
        </button>
      </header>

      <main className="max-w-lg mx-auto px-4 py-14 space-y-8">
        <div className="space-y-1">
          <p className="text-stone-600 text-xs uppercase tracking-widest font-semibold">Welcome back</p>
          <h2 className="text-2xl font-mono font-bold tracking-tight text-emerald-400">@{user.username}</h2>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-widest">Quick Pitch</p>

          <button
            onClick={() => router.push("/pitch?mode=custom")}
            className="w-full bg-stone-900 border border-stone-800 hover:border-emerald-600/50 hover:bg-stone-800/80 rounded-2xl px-5 py-4 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-100 group-hover:text-emerald-400 transition text-sm">
                  Enter my own prompt
                </p>
                <p className="text-stone-500 text-xs mt-0.5">Choose a product and start practicing.</p>
              </div>
              <span className="text-stone-600 group-hover:text-emerald-400 transition text-lg">→</span>
            </div>
          </button>

          <button
            onClick={handleGeneratePrompt}
            disabled={generating}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed rounded-2xl px-5 py-4 text-left transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">
                  {generating ? "Generating…" : "Generate a prompt with AI"}
                </p>
                <p className="text-emerald-200/70 text-xs mt-0.5">Get a random creative pitch topic from GPT.</p>
              </div>
              <span className="text-emerald-300 text-lg">→</span>
            </div>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-widest">Projects</p>

          <button
            onClick={() => router.push("/projects")}
            className="w-full bg-stone-900 border border-stone-800 hover:border-emerald-600/50 hover:bg-stone-800/80 rounded-2xl px-5 py-4 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-100 group-hover:text-emerald-400 transition text-sm">
                  My Projects
                </p>
                <p className="text-stone-500 text-xs mt-0.5">
                  Track progress on a specific product over multiple sessions.
                </p>
              </div>
              <span className="text-stone-600 group-hover:text-emerald-400 transition text-lg">→</span>
            </div>
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <p className="text-center text-stone-600 text-xs">
          View your scores and streak on your{" "}
          <button
            onClick={() => router.push("/profile")}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition"
          >
            profile page
          </button>
          .
        </p>
      </main>
    </div>
  );
}
