"use client";

import { defaultDateValue, type DateRangeMode } from "@/lib/dateRange";

const MODES: { key: DateRangeMode; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export type DateRangeValue = { range: DateRangeMode; date: string };

export default function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
}) {
  function selectMode(mode: DateRangeMode) {
    if (mode === value.range) return;
    onChange({ range: mode, date: mode === "all" ? "" : defaultDateValue(mode) });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-stone-300 p-0.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => selectMode(m.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value.range === m.key ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {value.range === "day" && (
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ range: "day", date: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
        />
      )}
      {value.range === "month" && (
        <input
          type="month"
          value={value.date}
          onChange={(e) => onChange({ range: "month", date: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
        />
      )}
      {value.range === "year" && (
        <input
          type="number"
          min="2000"
          max="2100"
          value={value.date}
          onChange={(e) => onChange({ range: "year", date: e.target.value })}
          className="w-24 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none"
        />
      )}
    </div>
  );
}
