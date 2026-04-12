"use client";

import { useState, useRef, useEffect } from "react";

// Step counts per track
const TRACK_TOTAL_STEPS: Record<string, number> = {
  hot: 3,
  warm: 4,
  cold: 3,
  not_qualified: 1,
};

interface EmailSequenceInfo {
  current_step: number;
  completed: boolean;
  next_send_at: string | null;
  sequence_track: string;
}

interface EmailStatusIndicatorProps {
  sequence: EmailSequenceInfo | undefined;
}

export default function EmailStatusIndicator({
  sequence,
}: EmailStatusIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!sequence) {
    return (
      <svg
        className="w-4 h-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="No email sequence"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    );
  }

  const totalSteps = TRACK_TOTAL_STEPS[sequence.sequence_track] || 1;
  const stepsSent = Math.min(sequence.current_step, totalSteps);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setShowPopover(!showPopover)}
        title={`Step ${stepsSent} of ${totalSteps}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="#0077B6"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>

      {showPopover && (
        <div className="absolute z-30 left-0 top-6 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-xs">
          <p className="font-semibold text-gray-900 mb-1">Email Sequence</p>
          <p className="text-gray-600">
            Track:{" "}
            <span className="font-medium capitalize">
              {sequence.sequence_track.replace("_", " ").toLowerCase()}
            </span>
          </p>
          <p className="text-gray-600">
            Progress:{" "}
            <span className="font-medium">
              {stepsSent} of {totalSteps} sent
            </span>
          </p>
          <p className="text-gray-600">
            Status:{" "}
            <span
              className={`font-medium ${
                sequence.completed ? "text-green-600" : "text-blue-600"
              }`}
            >
              {sequence.completed ? "Completed" : "Active"}
            </span>
          </p>
          {!sequence.completed && sequence.next_send_at && (
            <p className="text-gray-500 mt-1">
              Next email:{" "}
              {new Date(sequence.next_send_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
