/** Minimal RFC4126-ish CSV parser: handles quoted fields, escaped "" quotes, and commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Accepts "YYYY-MM-DD", "DD/MM/YYYY" (or "-"), or anything Date can parse. Returns "YYYY-MM-DD" or undefined. */
export function normalizeDateString(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return undefined;
}

const HEADER_ALIASES: Record<string, string[]> = {
  donorName: ["donor", "donor name", "name"],
  donorPhone: ["phone", "donor phone", "mobile", "contact"],
  donorEmail: ["email", "donor email"],
  amount: ["amount", "amount (₹)", "amount(₹)", "amount (rs)", "amount(rs)"],
  source: ["source"],
  status: ["status"],
  method: ["method", "payment method"],
  note: ["note", "notes"],
  donatedAt: ["date", "donation date", "donated at", "donatedat"],
};

export type ImportRow = {
  donorName: string;
  donorPhone: string;
  donorEmail: string;
  amount: number;
  source?: string;
  status?: string;
  method: string;
  note: string;
  donatedAt?: string;
};

export type ParsedImportRow = {
  index: number;
  raw: string[];
  row: ImportRow | null;
  error: string | null;
};

export function mapCsvRows(rows: string[][]): ParsedImportRow[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  const colIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = headers.findIndex((h) => aliases.includes(h));
    if (idx !== -1) colIndex[key as keyof typeof HEADER_ALIASES] = idx;
  }

  const get = (r: string[], key: keyof typeof HEADER_ALIASES) => {
    const idx = colIndex[key];
    return idx !== undefined ? (r[idx] ?? "").trim() : "";
  };

  return rows.slice(1).map((r, i) => {
    if (r.every((c) => c.trim() === "")) {
      return { index: i + 2, raw: r, row: null, error: "Empty row" };
    }

    const donorName = get(r, "donorName");
    const amountRaw = get(r, "amount").replace(/[^0-9.-]/g, "");
    const amount = amountRaw ? Number(amountRaw) : NaN;

    if (!donorName) {
      return { index: i + 2, raw: r, row: null, error: "Missing donor name" };
    }
    if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
      return { index: i + 2, raw: r, row: null, error: "Missing or invalid amount" };
    }

    return {
      index: i + 2,
      raw: r,
      row: {
        donorName,
        donorPhone: get(r, "donorPhone"),
        donorEmail: get(r, "donorEmail"),
        amount,
        source: get(r, "source") || undefined,
        status: get(r, "status") || undefined,
        method: get(r, "method"),
        note: get(r, "note"),
        donatedAt: normalizeDateString(get(r, "donatedAt")),
      },
      error: null,
    };
  });
}
