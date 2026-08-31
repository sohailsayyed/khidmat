export type DateRangeMode = "all" | "day" | "month" | "year";

export function defaultDateValue(mode: DateRangeMode, base: Date = new Date()): string {
  if (mode === "day") return base.toISOString().slice(0, 10);
  if (mode === "month") return base.toISOString().slice(0, 7);
  if (mode === "year") return String(base.getFullYear());
  return "";
}

/** Returns a half-open [gte, lt) range for the given mode/value, or null for "all"/invalid input. */
export function computeDateBounds(mode: DateRangeMode, value: string): { gte: Date; lt: Date } | null {
  if (mode === "all" || !value) return null;

  if (mode === "day") {
    const start = new Date(`${value}T00:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { gte: start, lt: end };
  }

  if (mode === "month") {
    const [y, m] = value.split("-").map(Number);
    if (!y || !m) return null;
    return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  if (mode === "year") {
    const y = Number(value);
    if (!y) return null;
    return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }

  return null;
}
