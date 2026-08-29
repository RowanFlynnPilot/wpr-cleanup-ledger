// Where is the reader, inside the embed? The WordPress iframe is sized to
// the widget's full content height, so position:fixed pins to the whole
// multi-thousand-pixel frame — a drawer opened from far down the page
// would put its header thousands of pixels above the reader. The embed
// snippet (README) posts the parent's viewport window over the iframe
// ("cleanup-ledger:viewport"); drawers snapshot it when they open and
// absolutely position themselves inside it. Standalone, or in an embed
// running the older snippet, this returns null and drawers stay fixed —
// no worse than before.

let viewport = null;

export function setEmbedViewport(v) {
  viewport = v;
}

export function embedDrawerBox() {
  if (window.parent === window || !viewport) return null;
  const docHeight = Math.ceil(
    document.documentElement.getBoundingClientRect().height
  );
  const height = Math.max(320, Math.min(viewport.height, docHeight));
  const top = Math.min(
    Math.max(0, viewport.top),
    Math.max(0, docHeight - height)
  );
  return { top, height };
}
