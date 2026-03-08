"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// No plurals. All roughly 7–10 characters.
const WORDS = [
  "umbrella", "notebook", "keyboard", "backpack", "suitcase",
  "cookbook", "doorbell", "armchair", "bookcase", "trashcan",
  "headband", "mandolin", "trombone", "clarinet", "recliner",
  "colander", "doorstop", "bookmark", "dumbbell", "placemat",
  "seatbelt", "flagpole", "doorknob", "blender",  "bicycle",
  "hammock",  "lantern",  "compass",  "journal",  "satchel",
  "cabinet",  "ottoman",  "cushion",  "blanket",  "sweater",
  "scooter",  "canteen",  "thermos",  "ukulele",  "sandbox",
  "mailbox",  "stapler",  "sneaker",  "slipper",  "lanyard",
  "footstool","telescope","surfboard","snowboard","stopwatch",
  "paperclip","thumbtack","hourglass","wristband","periscope",
  "megaphone","saxophone","harmonica","accordion","xylophone",
  "bookshelf","briefcase","lawnmower","mousetrap","corkscrew",
  "teakettle","dartboard","kickstand","spotlight","headlight",
  "dashboard","pitchfork","toothpick","barometer","skateboard",
  "trampoline","toothbrush","flashlight","tablecloth","basketball",
  "microphone","wristwatch","stepladder","sketchbook","pillowcase",
  "paintbrush","clothespin","chandelier","calculator","microscope",
  "protractor","nightstand","tablespoon","can opener","fire poker",
  "snow globe","phone case","hair clip", "bike lock", "rain boot",
];

// Used as the invisible sizer — keeps the word slot a fixed width
// so "sell me this" never shifts when words change.
const SIZER_WORD = "wristwatch";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [prevWord, setPrevWord] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState(0);
  const lastIdxRef = useRef(-1);
  const currentWordRef = useRef("");
  const infoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const getNextWord = useCallback(() => {
    let next: number;
    do { next = Math.floor(Math.random() * WORDS.length); }
    while (next === lastIdxRef.current);
    lastIdxRef.current = next;
    return WORDS[next];
  }, []);

  const transitionWord = useCallback(() => {
    const next = getNextWord();
    setPrevWord(currentWordRef.current);
    currentWordRef.current = next;
    setCurrentWord(next);
    setCurrentKey((k) => k + 1);
    setTimeout(() => setPrevWord(null), 500);
  }, [getNextWord]);

  useEffect(() => {
    const first = getNextWord();
    currentWordRef.current = first;
    setCurrentWord(first);
    setCurrentKey(1);

    const interval = setInterval(transitionWord, 3000);
    return () => clearInterval(interval);
  }, [getNextWord, transitionWord]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    }
    if (showInfo) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showInfo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: dbError } = await supabase
        .from("users")
        .upsert({ username: trimmed }, { onConflict: "username" })
        .select("id, username")
        .single();
      if (dbError) throw dbError;
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-8">
      {/* Hero
          The word slot uses SIZER_WORD (invisible, fixed width) so the total
          line width never changes → "sell me this" never shifts. */}
      <div className="mb-14 select-none">
        <div className="flex items-baseline gap-4 flex-wrap justify-center">
          <span className="text-6xl sm:text-7xl font-bold tracking-tight text-stone-100 whitespace-nowrap">
            sell me this
          </span>

          <div className="relative">
            {/* Invisible fixed-width sizer */}
            <span
              className="invisible block text-6xl sm:text-7xl font-bold tracking-tight whitespace-nowrap"
              aria-hidden="true"
            >
              {SIZER_WORD}
            </span>

            {prevWord && (
              <span className="absolute top-0 left-0 word-slide-out text-6xl sm:text-7xl font-bold tracking-tight text-emerald-400 whitespace-nowrap">
                {prevWord}
              </span>
            )}

            <span
              key={currentKey}
              className="absolute top-0 left-0 word-slide-in text-6xl sm:text-7xl font-bold tracking-tight text-emerald-400 whitespace-nowrap"
            >
              {currentWord}
            </span>
          </div>
        </div>
      </div>

      {/* Form — centered */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
        <div className="relative flex items-center gap-2" ref={infoRef}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter a username"
            maxLength={32}
            autoFocus
            className="flex-1 bg-stone-900 border border-stone-700 text-white placeholder-stone-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />

          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="w-9 h-9 shrink-0 rounded-full bg-stone-900 border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition flex items-center justify-center text-sm font-semibold"
          >
            ?
          </button>

          {showInfo && (
            <div className="absolute bottom-full right-0 mb-3 w-72 bg-stone-800 border border-stone-700 rounded-2xl shadow-2xl p-4 z-20">
              <p className="text-white font-semibold text-sm mb-2">How it works</p>
              <ul className="space-y-2 text-stone-300 text-sm leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">·</span>
                  No password needed — just pick any username.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">·</span>
                  Returning? Use the same username to pick up where you left off.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 shrink-0">·</span>
                  Your username tracks your pitch history, scores, and daily streak.
                </li>
              </ul>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition"
        >
          {loading ? "Loading…" : "Start Pitching →"}
        </button>
      </form>
    </div>
  );
}
