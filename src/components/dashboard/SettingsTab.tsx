"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";

interface QuizInfo {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  primary_color: string;
  plan: string;
}

interface SettingsTabProps {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

export default function SettingsTab({
  user,
  accent,
  getAuthHeaders,
}: SettingsTabProps) {
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setOrg(data.org);
      setQuizzes(data.quizzes || []);
      setEditName(data.org?.name || "");
      setEditColor(data.org?.primary_color || "#6366f1");
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const res = await fetch("/api/dashboard/settings", {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, primary_color: editColor }),
    });

    if (res.ok) {
      setSaveMsg("Settings saved! Reload to see color changes.");
    } else {
      setSaveMsg("Failed to save.");
    }
    setSaving(false);
  };

  const handleToggleQuiz = async (id: string, current: boolean) => {
    await fetch(`/api/dashboard/settings/quizzes/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchSettings();
  };

  const copyQuizLink = (quiz: QuizInfo) => {
    const url = `${window.location.origin}/${user.orgSlug}/${quiz.slug}`;
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="text-gray-500 py-8 text-center">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Org Details */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Organization Details
        </h3>
        <form onSubmit={handleSaveOrg} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 w-32"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveMsg && (
              <span className="text-sm text-gray-600">{saveMsg}</span>
            )}
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p>
            Slug: <span className="font-mono">{org?.slug}</span>
          </p>
          <p>
            Plan: <span className="capitalize">{org?.plan}</span>
          </p>
        </div>
      </div>

      {/* Quizzes */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quizzes</h3>
        {quizzes.length === 0 ? (
          <p className="text-gray-500">No quizzes found.</p>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{q.name}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    /{user.orgSlug}/{q.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyQuizLink(q)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleToggleQuiz(q.id, q.is_active)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                      q.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {q.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
