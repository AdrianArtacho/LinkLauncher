import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildLauncherUrl,
  parseCSV,
  parseItemsFromCSVText,
  readResponseTextWithLimit,
  resolveConfiguration,
  safeDestination,
  validateCsvSource
} from "../app-core.js";

const PUBLISHED_CSV =
  "https://docs.google.com/spreadsheets/d/e/example/pub?gid=0&single=true&output=csv";
const EXPORT_CSV =
  "https://docs.google.com/spreadsheets/d/example/export?format=csv&gid=0";

test("bare configuration has no source", () => {
  const result = resolveConfiguration("", "");
  assert.equal(result.params.has("csv"), false);
  assert.equal(result.migratedLegacyLink, false);
});

test("fragment configuration wins over a competing legacy query", () => {
  const result = resolveConfiguration(
    "#csv=" + encodeURIComponent(PUBLISHED_CSV) + "&title=Fragment",
    "?csv=" + encodeURIComponent(EXPORT_CSV) + "&title=Query"
  );
  assert.equal(result.params.get("csv"), PUBLISHED_CSV);
  assert.equal(result.params.get("title"), "Fragment");
  assert.equal(result.migratedLegacyLink, false);
});

test("legacy query is migrated when no fragment source exists", () => {
  const result = resolveConfiguration(
    "",
    "?csv=" + encodeURIComponent(PUBLISHED_CSV) + "&title=Legacy&kiosk=1"
  );
  assert.equal(result.params.get("csv"), PUBLISHED_CSV);
  assert.equal(result.params.get("title"), "Legacy");
  assert.equal(result.params.get("kiosk"), "1");
  assert.equal(result.migratedLegacyLink, true);
});

test("empty fragment source does not discard a valid legacy link", () => {
  const result = resolveConfiguration(
    "#csv=",
    "?csv=" + encodeURIComponent(PUBLISHED_CSV) + "&title=Legacy"
  );
  assert.equal(result.params.get("csv"), PUBLISHED_CSV);
  assert.equal(result.params.get("title"), "Legacy");
  assert.equal(result.migratedLegacyLink, true);
});

test("only supported Google Sheets HTTPS CSV sources are accepted", () => {
  assert.equal(validateCsvSource(PUBLISHED_CSV), PUBLISHED_CSV);
  assert.equal(validateCsvSource(EXPORT_CSV), EXPORT_CSV);

  for (const source of [
    "http://docs.google.com/spreadsheets/d/e/example/pub?output=csv",
    "https://example.com/data.csv",
    "https://docs.google.com/document/d/example/export?format=csv",
    "https://docs.google.com/spreadsheets/d/e/example/pub",
    "https://user:password@docs.google.com/spreadsheets/d/e/example/pub?output=csv"
  ]) {
    assert.throws(() => validateCsvSource(source));
  }
});

test("unsafe destination schemes and credentials are rejected", () => {
  assert.equal(safeDestination("https://example.com/path"), "https://example.com/path");
  assert.equal(safeDestination("mailto:test@example.com"), "mailto:test@example.com");
  assert.equal(safeDestination("tel:+43123456"), "tel:+43123456");

  for (const destination of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "blob:https://example.com/id",
    "https://user:password@example.com/",
    "not a URL",
    "https://www.google.com/url?q=javascript%3Aalert%281%29"
  ]) {
    assert.equal(safeDestination(destination), null);
  }
});

test("CSV parsing supports quoted commas and escaped quotes", () => {
  assert.deepEqual(
    parseCSV('"A, B","https://example.com/a"\n"Say ""hi""","https://example.com/b"'),
    [
      ["A, B", "https://example.com/a"],
      ['Say "hi"', "https://example.com/b"]
    ]
  );
});

test("unsafe rows are skipped and labels remain plain strings", () => {
  const parsed = parseItemsFromCSVText(
    "<img onerror=alert(1)>,https://example.com\n" +
    "Bad,javascript:alert(1)\n" +
    "Also bad,data:text/html,hello"
  );

  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].label, "<img onerror=alert(1)>");
  assert.equal(parsed.items[0].url, "https://example.com/");
  assert.equal(parsed.rejected, 2);
});

test("helper URLs keep the CSV out of the query string", () => {
  const launcherUrl = buildLauncherUrl(
    "https://example.com/LinkLauncher/helper.html?old=1",
    PUBLISHED_CSV,
    "My Links",
    true
  );
  const parsed = new URL(launcherUrl);

  assert.equal(parsed.search, "");
  assert.equal(parsed.hash.startsWith("#csv="), true);
  const params = new URLSearchParams(parsed.hash.slice(1));
  assert.equal(params.get("csv"), PUBLISHED_CSV);
  assert.equal(params.get("title"), "My Links");
  assert.equal(params.get("kiosk"), "1");
});

test("response bodies are rejected while streaming past the size limit", async () => {
  const small = new Response(new TextEncoder().encode("A,https://example.com"));
  assert.equal(
    await readResponseTextWithLimit(small, 1024),
    "A,https://example.com"
  );

  const large = new Response(new Uint8Array(2048));
  await assert.rejects(
    () => readResponseTextWithLimit(large, 1024),
    /exceeds the allowed size/
  );
});

test("current source contains no live default sheet or persistent cache writes", async () => {
  const paths = [
    "index.html",
    "app.js",
    "app-core.js",
    "helper.html",
    "helper.js",
    "manifest.json"
  ];
  const files = await Promise.all(
    paths.map((path) => readFile(new URL("../" + path, import.meta.url), "utf8"))
  );
  const source = files.join("\n");
  const indexHtml = files[paths.indexOf("index.html")];
  const helperHtml = files[paths.indexOf("helper.html")];

  assert.doesNotMatch(source, /2PACX-[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /DEFAULT_CSV/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
  assert.match(indexHtml, /meta name="referrer" content="no-referrer"/);
  assert.match(helperHtml, /meta name="referrer" content="no-referrer"/);
  assert.match(indexHtml, /script type="module" src="\.\/app\.js"/);
  assert.match(helperHtml, /script type="module" src="\.\/helper\.js"/);
});
