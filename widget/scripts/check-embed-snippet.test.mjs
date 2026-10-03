// The WordPress embed snippet in README.md is pasted into post content,
// where WordPress filters run over it. A WordPress Playground test (Oct
// 2026) caught wptexturize rewriting "&&" as "&#038;&#038;" after a "<"
// inside the script: a syntax error that silently killed the whole embed
// (no auto-height, no drawer placement, no article links). These tests
// keep the snippet free of what WordPress and caching plugins rewrite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const section = readme.split("## Embedding (WordPress)")[1] ?? "";
// CRLF-tolerant: Windows checkouts convert README line endings.
const snippet = section.match(/```html\r?\n([\s\S]*?)```/)?.[1] ?? "";
const [, scriptTag = "", script = ""] =
  snippet.match(/(<script[^>]*>)([\s\S]*?)<\/script>/) ?? [];
const iframeTag = snippet.match(/<iframe[\s\S]*?>/)?.[0] ?? "";

test("README carries the embed snippet", () => {
  assert.ok(script.length > 500, "snippet script not found in README.md");
  assert.ok(iframeTag.includes('id="cleanup-ledger"'), "snippet iframe not found");
});

test("script has no '<' (wptexturize reads it as a tag and encodes later '&')", () => {
  assert.equal(script.indexOf("<"), -1);
});

test("script has no '&' (WordPress can entity-encode it)", () => {
  assert.equal(script.indexOf("&"), -1);
});

test("script has no // line comments (a line-joining minifier would swallow code)", () => {
  const withoutStrings = script.replace(/"[^"\n]*"/g, '""');
  assert.ok(!/\/\//.test(withoutStrings), "use /* block */ comments");
});

test("script parses as JavaScript", () => {
  assert.doesNotThrow(() => new Function(script));
});

test("snippet opts out of LiteSpeed Cache and Cloudflare rewriting", () => {
  for (const attr of ['data-no-optimize="1"', 'data-no-minify="1"', 'data-cfasync="false"']) {
    assert.ok(scriptTag.includes(attr), `script tag missing ${attr}`);
  }
  assert.ok(iframeTag.includes('data-no-lazy="1"'), "iframe missing data-no-lazy");
});
