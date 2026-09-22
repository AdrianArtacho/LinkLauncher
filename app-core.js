export const CONFIG_KEYS = ["csv", "title", "kiosk"];
export const LEGACY_CACHE_PREFIX = "linkLauncher.cache.v1.";

const ALLOWED_LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);
const MAX_ROWS = 500;
const MAX_LABEL_LENGTH = 160;
const MAX_LINK_LENGTH = 4096;

export function resolveConfiguration(hash, search) {
  const fragment = new URLSearchParams((hash || "").replace(/^#/, ""));
  const legacyQuery = new URLSearchParams(search || "");
  const fragmentHasSource = (fragment.get("csv") || "").trim().length > 0;
  let params = fragment;
  let migratedLegacyLink = false;

  if (!fragmentHasSource && legacyQuery.has("csv")) {
    params = new URLSearchParams();
    for (const key of CONFIG_KEYS) {
      if (legacyQuery.has(key)) params.set(key, legacyQuery.get(key));
    }
    migratedLegacyLink = true;
  }

  return { params, migratedLegacyLink };
}

export function validateCsvSource(value) {
  let source;
  try {
    source = new URL(value);
  } catch (_) {
    throw new Error("The CSV address is not a valid URL.");
  }

  const csvMode =
    source.searchParams.get("output") === "csv" ||
    source.searchParams.get("format") === "csv";

  if (
    source.protocol !== "https:" ||
    source.hostname !== "docs.google.com" ||
    !source.pathname.startsWith("/spreadsheets/") ||
    !csvMode ||
    source.username ||
    source.password
  ) {
    throw new Error("Use an HTTPS Google Sheets CSV publication or export URL.");
  }

  return source.href;
}

export function sourceHost(value) {
  try {
    return new URL(value).hostname;
  } catch (_) {
    return "invalid source";
  }
}

export function buildLauncherUrl(baseUrl, csv, title, kiosk) {
  const launcher = new URL(baseUrl);
  launcher.search = "";
  launcher.hash = "";

  const params = new URLSearchParams();
  params.set("csv", validateCsvSource(csv));
  if (title) params.set("title", title.trim().slice(0, 120));
  if (kiosk) params.set("kiosk", "1");

  return launcher.href + "#" + params.toString();
}

export async function readResponseTextWithLimit(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const text = await response.text();
    if (new Blob([text]).size > maxBytes) {
      throw new Error("The CSV exceeds the allowed size.");
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const result = await reader.read();
    if (result.done) break;

    received += result.value.byteLength;
    if (received > maxBytes) {
      try {
        await reader.cancel();
      } catch (_) {}
      throw new Error("The CSV exceeds the allowed size.");
    }
    text += decoder.decode(result.value, { stream: true });
  }

  return text + decoder.decode();
}

export function parseCSV(text) {
  const rows = [];
  let index = 0;
  let field = "";
  let row = [];
  let inQuotes = false;

  while (index < text.length && rows.length < MAX_ROWS) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (character === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (character === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      index += 1;
      continue;
    }
    if (character === "\r") {
      index += 1;
      continue;
    }
    field += character;
    index += 1;
  }

  if ((field.length || row.length) && rows.length < MAX_ROWS) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function unwrapGoogleRedirect(value) {
  try {
    const url = new URL(value);
    if (url.hostname === "www.google.com" && url.pathname === "/url") {
      return url.searchParams.get("q") || value;
    }
  } catch (_) {}
  return value;
}

export function safeDestination(value) {
  const unwrapped = unwrapGoogleRedirect(value);
  if (unwrapped.length > MAX_LINK_LENGTH) return null;

  try {
    const url = new URL(unwrapped);
    if (!ALLOWED_LINK_PROTOCOLS.has(url.protocol)) return null;
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.username || url.password)
    ) {
      return null;
    }
    return url.href;
  } catch (_) {
    return null;
  }
}

export function parseItemsFromCSVText(text) {
  const items = [];
  let rejected = 0;

  for (const row of parseCSV(text)) {
    const label = (row[0] || "").trim();
    const rawUrl = (row[1] || "").trim();
    if (!label && !rawUrl) continue;
    if (!label || !rawUrl) {
      rejected += 1;
      continue;
    }

    const url = safeDestination(rawUrl);
    if (!url) {
      rejected += 1;
      continue;
    }

    items.push({
      label: label.slice(0, MAX_LABEL_LENGTH),
      url
    });
  }

  return { items, rejected };
}
