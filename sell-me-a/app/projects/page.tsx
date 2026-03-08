"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string;
  notes: string;
  created_at: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    const u = JSON.parse(stored);
    setUser(u);

    fetch(`/api/projects?userId=${u.id}`)
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !user) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
      setCreating(false);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-100">Projects</h2>
            <p className="text-stone-500 text-sm mt-1">
              Save a product and track your improvement over time.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            {showForm ? "Cancel" : "New Project"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4"
          >
            <h3 className="font-semibold text-stone-100">New Project</h3>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                Product Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='e.g. "FoldMate"'
                autoFocus
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder='e.g. "an umbrella that folds itself at the press of a button"'
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Key selling points, target audience, talking points..."
                rows={3}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !form.name.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </form>
        )}

        {/* Project List */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p>No projects yet. Create one to start tracking a specific product.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-6 py-5 text-left hover:border-emerald-600/50 hover:bg-stone-800/80 transition group"
              >
                <p className="font-semibold text-stone-100 group-hover:text-emerald-400 transition">
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-stone-500 text-sm mt-1 line-clamp-1">
                    {project.description}
                  </p>
                )}
                <p className="text-stone-600 text-xs mt-2 font-mono">
                  Created{" "}
                  {new Date(project.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
