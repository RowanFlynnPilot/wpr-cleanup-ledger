// The page embedding the widget, as it describes itself (embed snippet,
// Oct 2026 and later). Record links then point at the article instead of
// the GitHub Pages copy, a record named in the article's address opens in
// the widget, and opening a record mirrors into the article's address.
// Null standalone, and under older snippets that never send it.
const KEYS = ["county", "site", "system"];
let host = null;

// "cleanup-ledger:host" handler. A page may only claim its own address:
// the URL must share the message's origin.
export function receiveHost(event) {
  let url;
  try {
    url = new URL(String(event.data.url));
  } catch {
    return;
  }
  if (url.origin !== event.origin || !/^https?:$/.test(url.protocol)) return;
  host = { url: url.origin + url.pathname + url.search, origin: event.origin };

  // Only our own keys in the article's hash mean anything here; replay
  // them as this frame's hash, then let App's hashchange listener open
  // the record. replaceState + a synthetic event: no history entry.
  const params = new URLSearchParams(String(event.data.hash ?? ""));
  const own = KEYS.filter((k) => params.get(k))
    .map((k) => `${k}=${encodeURIComponent(params.get(k))}`)
    .join("&");
  if (!own) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#${own}`
  );
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

// Shareable link for a record hash ("#site=…"): the article when
// embedded under a current snippet, this page otherwise.
export function permalink(hash) {
  const base = host
    ? host.url
    : window.location.origin + window.location.pathname + window.location.search;
  return base + hash;
}

// Mirror the widget's own hash (without "#") into the article's address.
// Sent only to the origin that introduced itself.
export function reportHash(hash) {
  if (host && window.parent !== window) {
    window.parent.postMessage({ type: "cleanup-ledger:hash", hash }, host.origin);
  }
}
