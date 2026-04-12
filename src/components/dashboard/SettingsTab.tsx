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

  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState("");
  const [voiceFirstMessage, setVoiceFirstMessage] = useState("");
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState("");

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
      if (data.voiceSettings) {
        setVoiceEnabled(data.voiceSettings.voice_calls_enabled || false);
        setVoicePrompt(data.voiceSettings.voice_system_prompt || "");
        setVoiceFirstMessage(data.voiceSettings.voice_first_message || "");
      }
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

  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVoice(true);
    setVoiceMsg("");

    const res = await fetch("/api/dashboard/settings", {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        voiceSettings: {
          voice_calls_enabled: voiceEnabled,
          voice_system_prompt: voicePrompt,
          voice_first_message: voiceFirstMessage,
        },
      }),
    });

    setVoiceMsg(res.ok ? "Voice settings saved!" : "Failed to save.");
    setSavingVoice(false);
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

      {/* Voice Call Settings */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          AI Voice Calls
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Automatically call HOT and WARM leads 60 seconds after quiz
          completion. Uses Vapi AI with ElevenLabs voice.
        </p>

        <form onSubmit={handleSaveVoice} className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
            </label>
            <span className="text-sm font-medium text-gray-700">
              {voiceEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Message
            </label>
            <p className="text-xs text-gray-400 mb-1">
              What Maya says when the lead picks up. Use {`{{firstName}}`},{" "}
              {`{{percentage}}`}, {`{{orgName}}`}.
            </p>
            <textarea
              value={voiceFirstMessage}
              onChange={(e) => setVoiceFirstMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              placeholder="Hi {{firstName}}, this is Maya from {{orgName}}..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt
            </label>
            <p className="text-xs text-gray-400 mb-1">
              Instructions for the AI voice agent. Use {`{{firstName}}`},{" "}
              {`{{score}}`}, {`{{percentage}}`}, {`{{orgName}}`},{" "}
              {`{{qualification}}`}.
            </p>
            <textarea
              value={voicePrompt}
              onChange={(e) => setVoicePrompt(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              placeholder="You are Maya, a friendly performance consultant..."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingVoice}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {savingVoice ? "Saving..." : "Save Voice Settings"}
            </button>
            {voiceMsg && (
              <span className="text-sm text-gray-600">{voiceMsg}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
