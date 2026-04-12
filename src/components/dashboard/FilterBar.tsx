"use client";

import { QUALIFICATION_LABELS } from "@/lib/dashboard-types";

interface FilterBarProps {
  qualification: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  onQualificationChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onExport: () => void;
  accent: string;
}

export default function FilterBar({
  qualification,
  dateFrom,
  dateTo,
  search,
  onQualificationChange,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onExport,
  accent,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Qualification
        </label>
        <select
          value={qualification}
          onChange={(e) => onQualificationChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
        >
          <option value="">All</option>
          {Object.entries(QUALIFICATION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          From
        </label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          To
        </label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
        />
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Search
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Name, email, or phone..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
        />
      </div>

      <button
        onClick={onExport}
        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
      >
        Export CSV
      </button>
    </div>
  );
}
