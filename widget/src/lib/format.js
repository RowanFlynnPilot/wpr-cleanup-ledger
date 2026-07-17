// Display helpers. Data semantics live in build/build_json.py; nothing here
// changes meaning, only presentation.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ISO date string -> "Oct 15, 2004". Parsed by hand so time zones can never
// shift a date across midnight.
export function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function titleCase(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bOf\b/g, "of");
}

export function dnrUrl(dsn) {
  return `https://apps.dnr.wi.gov/rrbotw/botw-activity-detail?dsn=${dsn}`;
}

// One classification used everywhere: map color, table chip, filters.
export function statusOf(site) {
  if (site.type === "OFF-SITE") {
    return { key: "offsite", label: "Off-site record", short: "Off-site" };
  }
  if (site.status === "OPEN") {
    return { key: "open", label: "Open case", short: "Open" };
  }
  return {
    key: "closed",
    label: "Closed — obligations continue",
    short: "Closed + CO",
  };
}

export const STATUS_COLORS = {
  open: "#B4553C",
  closed: "#3A867C",
  offsite: "#5B7A99",
};

export const TYPE_LABELS = {
  LUST: "LUST — leaking underground storage tank",
  ERP: "ERP — environmental repair program",
  "OFF-SITE": "Off-site — affected by a neighboring source",
};

export function typeShort(type) {
  return type === "OFF-SITE" ? "Off-site" : type;
}

const digitsOf = (s) => (s || "").replace(/\D/g, "");

// Case-insensitive match across name, address, municipality, BRRTS number
// (with or without dashes) and published party names.
export function siteMatches(site, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = digitsOf(q);
  if (qDigits.length >= 3 && qDigits === q.replace(/[-\s]/g, "")) {
    if (digitsOf(site.brrts).includes(qDigits)) return true;
  }
  const hay = [
    site.name,
    site.address,
    site.muni,
    site.brrts,
    ...site.parties.map((p) => p.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
