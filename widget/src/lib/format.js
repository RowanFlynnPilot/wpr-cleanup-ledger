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

// The three display helpers below run for every table row on every
// keystroke; inputs are a few hundred distinct strings, so memoize.
function memo1(fn) {
  const cache = new Map();
  return (s) => {
    if (!cache.has(s)) cache.set(s, fn(s));
    return cache.get(s);
  };
}

// Generic English title-casing only — domain display rules live in
// addressDisplay/muniDisplay so other callers (party cities) stay clean.
export const titleCase = memo1((s) => {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/(?!^)\b(And|Of|At)\b/g, (w) => w.toLowerCase());
});

/* Wisconsin display conventions. The Ledger Framework port should move
   these (with dnrUrl) behind per-state config; they are the only
   Wisconsin-specific pieces of the widget. */

// Highway designations and their route letters stay uppercase:
// "3301 CTH WW", "401 STH 97 N", "2100 BUS HWY 51 S".
export const addressDisplay = memo1((s) => {
  if (!s) return "";
  return titleCase(s).replace(
    /\b(Cth|Sth|Ush|Hwy|Bus)(\s+[A-Za-z]{1,2}\b)?/g,
    (m) => m.toUpperCase()
  );
});

// DNR municipality strings carry bare Tn/Vil suffixes ("RIB MOUNTAIN TN").
export const muniDisplay = memo1((muni) =>
  titleCase(muni).replace(/ Tn$/, " (Town)").replace(/ Vil$/, " (Village)")
);

export function dnrUrl(dsn) {
  return `https://apps.dnr.wi.gov/rrbotw/botw-activity-detail?dsn=${dsn}`;
}

// One classification used everywhere: map color, draw order, table chip,
// filters. The status vocabulary is a closed set — build_json.py refuses
// to publish a status without vetted copy here, so no fallback branch.
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

// Map draw order (later = on top). Single source with STATUS_COLORS so a
// new status key touches one file. Closed sites draw first: they are the
// large majority (235), so the rarer off-site records and open cases stay
// visible where markers crowd.
export const STATUS_DRAW_ORDER = { closed: 0, offsite: 1, open: 2 };

export const TYPE_LABELS = {
  LUST: "LUST — leaking underground storage tank",
  ERP: "ERP — environmental repair program",
  "OFF-SITE": "Off-site — affected by a neighboring source",
};

export function typeShort(type) {
  return type === "OFF-SITE" ? "Off-site" : type;
}

const digitsOf = (s) => (s || "").replace(/\D/g, "");

// Case-insensitive match across name, address, municipality (raw and as
// displayed, so "town"/"village" work), BRRTS number (with or without
// dashes) and published party names.
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
    muniDisplay(site.muni),
    site.brrts,
    ...site.parties.map((p) => p.name),
    ...(site.substances ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
