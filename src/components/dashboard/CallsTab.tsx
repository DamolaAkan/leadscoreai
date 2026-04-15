"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthUser } from "@/lib/dashboard-types";
import KPICard from "./KPICard";

interface VoiceCall {
  id: string;
  vapi_call_id: string;
  response_id: string;
  phone_number: string;
  contact_name: string;
  qualification: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  transcript: string | null;
  summary: string | null;
  recording_url: string | null;
  cost_cents: number | null;
  triggered_at: string;
  appointment_booked: boolean | null;
  appointment_datetime: string | null;
  appointment_confirmed_by: string | null;
}

interface CallsKPIs {
  totalCalls: number;
  completedCalls: number;
  avgDurationSeconds: number;
  appointmentsBooked: number;
}

interface CallsTabProps {
  user: AuthUser;
  accent: string;
  getAuthHeaders: () => Record<string, string>;
}

function formatAppointmentDate(datetime: string | null) {
  if (!datetime) return "\u2014";
  const d = new Date(datetime);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const h = hours % 12 || 12;
  const min = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${day} ${date} ${month}, ${h}${min}${ampm}`;
}

function formatAppointmentDateFull(datetime: string | null) {
  if (!datetime) return "";
  const d = new Date(datetime);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[d.getDay()];
  const date = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const h = hours % 12 || 12;
  const min = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${day} ${date} ${month} ${year} at ${h}${min}${ampm}`;
}

interface TranscriptLine {
  speaker: string;
  text: string;
}

function parseTranscript(
  transcript: string,
  contactName: string
): TranscriptLine[] | null {
  // Try to detect speaker labels like "AI:", "User:", "Maya:", "Bot:", or name-based labels
  const speakerPattern =
    /^(AI|User|Maya|Bot|Assistant|Agent|Human|Customer|[A-Z][a-z]+)\s*:\s*/;
  const lines = transcript.split("\n").filter((l) => l.trim());

  const parsed: TranscriptLine[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      if (currentSpeaker && currentText) {
        parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      const rawSpeaker = match[1];
      // Normalize speaker labels
      if (
        ["AI", "Bot", "Assistant", "Agent", "Maya"].includes(rawSpeaker)
      ) {
        currentSpeaker = "Maya";
      } else {
        const firstName = (contactName || "Prospect").split(" ")[0];
        currentSpeaker = firstName;
      }
      currentText = line.slice(match[0].length);
    } else {
      currentText += " " + line;
    }
  }
  if (currentSpeaker && currentText) {
    parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  // If we couldn't parse any speaker labels, return null to indicate plain text
  if (parsed.length === 0) return null;
  return parsed;
}

export default function CallsTab({
  accent,
  getAuthHeaders,
}: CallsTabProps) {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [kpis, setKpis] = useState<CallsKPIs>({
    totalCalls: 0,
    completedCalls: 0,
    avgDurationSeconds: 0,
    appointmentsBooked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);
  const [confirming, setConfirming] = useState(false);
  const pageSize = 20;

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (appointmentFilter) params.set("appointment", appointmentFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/dashboard/calls?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setCalls(data.calls || []);
      setTotal(data.total || 0);
      if (data.kpis) setKpis(data.kpis);
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [page, statusFilter, appointmentFilter, search, getAuthHeaders]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ended":
      case "completed":
        return "bg-green-100 text-green-700";
      case "in-progress":
        return "bg-blue-100 text-blue-700";
      case "queued":
        return "bg-yellow-100 text-yellow-700";
      case "ringing":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleConfirmAppointment = async (callId: string) => {
    setConfirming(true);
    try {
      const res = await fetch("/api/dashboard/calls", {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId, action: "confirm_appointment" }),
      });
      const data = await res.json();
      if (data.ok) {
        // Update local state
        const updated = {
          ...selectedCall!,
          appointment_confirmed_by: data.confirmedBy,
        };
        setSelectedCall(updated);
        setCalls((prev) =>
          prev.map((c) => (c.id === callId ? updated : c))
        );
      }
    } catch {
      // Ignore
    }
    setConfirming(false);
  };


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard
          label="Total Calls"
          value={kpis.totalCalls}
          accent={accent}
        />
        <KPICard
          label="Completed"
          value={kpis.completedCalls}
          accent={accent}
        />
        <KPICard
          label="Avg Duration"
          value={formatDuration(kpis.avgDurationSeconds)}
          accent={accent}
        />
        <KPICard
          label="Appointments Booked"
          value={kpis.appointmentsBooked}
          accent="#16a34a"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="ringing">Ringing</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="ended">Ended</option>
        </select>

        <select
          value={appointmentFilter}
          onChange={(e) => {
            setAppointmentFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
        >
          <option value="">All Appointments</option>
          <option value="booked">Booked</option>
          <option value="none">None</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or phone..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading calls...</div>
        ) : calls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No calls found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Qualification</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Appointment</th>
                  <th className="px-4 py-3 font-medium">Scheduled for</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {call.contact_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {call.phone_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {call.qualification?.replace("_", " ") || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {call.appointment_booked ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Booked
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatAppointmentDate(call.appointment_datetime)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(call.triggered_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {(call.transcript || call.summary) && (
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-100"
                          style={{ color: accent }}
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} calls)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transcript/Summary Panel */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setSelectedCall(null)}
          />
          <div className="ml-auto relative z-10 w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Call Details
                </h3>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Appointment Box */}
                {selectedCall.appointment_booked && (
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-bold text-green-800">
                      Appointment Booked
                    </p>
                    {selectedCall.appointment_datetime && (
                      <p className="text-sm text-green-700 mt-1">
                        {formatAppointmentDateFull(
                          selectedCall.appointment_datetime
                        )}
                      </p>
                    )}
                    <div className="mt-3">
                      {selectedCall.appointment_confirmed_by ? (
                        <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                          Confirmed by{" "}
                          {selectedCall.appointment_confirmed_by}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            handleConfirmAppointment(selectedCall.id)
                          }
                          disabled={confirming}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                          style={{ backgroundColor: accent }}
                        >
                          {confirming
                            ? "Confirming..."
                            : "Mark as Confirmed"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Contact</p>
                    <p className="font-medium text-gray-900">
                      {selectedCall.contact_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">
                      {selectedCall.phone_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Duration</p>
                    <p className="font-medium text-gray-900">
                      {formatDuration(selectedCall.duration_seconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Reason</p>
                    <p className="font-medium text-gray-900">
                      {selectedCall.ended_reason || "-"}
                    </p>
                  </div>
                  {selectedCall.cost_cents != null && (
                    <div>
                      <p className="text-gray-500">Cost</p>
                      <p className="font-medium text-gray-900">
                        ${(selectedCall.cost_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedCall.recording_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Recording</p>
                    <audio
                      controls
                      src={selectedCall.recording_url}
                      className="w-full"
                    />
                  </div>
                )}

                {selectedCall.summary && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Summary
                    </p>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {selectedCall.summary}
                    </p>
                  </div>
                )}

                {selectedCall.transcript && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Transcript
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto">
                      {(() => {
                        const parsed = parseTranscript(
                          selectedCall.transcript!,
                          selectedCall.contact_name
                        );
                        if (!parsed) {
                          return (
                            <div className="text-sm text-gray-600 whitespace-pre-wrap">
                              {selectedCall.transcript}
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {parsed.map((line, i) => {
                              const isMaya = line.speaker === "Maya";
                              return (
                                <div
                                  key={i}
                                  className={`pl-3 border-l-2 ${
                                    isMaya
                                      ? "border-purple-400"
                                      : "border-gray-300"
                                  }`}
                                >
                                  <p
                                    className={`text-xs font-semibold mb-0.5 ${
                                      isMaya
                                        ? "text-purple-600"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {line.speaker}
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    {line.text}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
