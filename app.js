import {
  LEGACY_CACHE_PREFIX,
  parseItemsFromCSVText,
  readResponseTextWithLimit,
  resolveConfiguration,
  sourceHost,
  validateCsvSource
} from "./app-core.js";

(() => {
  "use strict";

  const MAX_CSV_BYTES = 1024 * 1024;
  const FETCH_TIMEOUT_MS = 15000;

  const grid = document.getElementById("grid");
  const meta = document.getElementById("meta");
  const pageTitle = document.getElementById("pageTitle");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const overlayHint = document.getElementById("overlayHint");
  const overlayActions = document.getElementById("overlayActions");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  function clearLegacyCache() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LEGACY_CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {
      // Storage may be unavailable. The current version never reads or writes it.
    }
  }

  function readConfiguration() {
    const configuration = resolveConfiguration(location.hash, location.search);

    if (location.search) {
      const encodedFragment = configuration.params.toString();
      const cleanUrl = location.pathname + (encodedFragment ? "#" + encodedFragment : "");
      history.replaceState(null, "", cleanUrl);
    }

    return configuration;
  }

  function showOverlay(options) {
    const settings = options || {};
    overlayTitle.textContent = settings.title || "Link Launcher";
    overlayText.textContent = settings.text || "";
    overlayHint.textContent = settings.hint || "";
    overlayActions.replaceChildren();

    for (const action of settings.actions || []) {
      if (action.href) {
        const link = document.createElement("a");
        link.className = "button-link";
        link.textContent = action.label;
        link.href = action.href;
        link.rel = "noreferrer";
        overlayActions.appendChild(link);
      } else {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.addEventListener("click", action.onClick);
        overlayActions.appendChild(button);
      }
    }

    overlay.classList.add("show");
  }

  function hideOverlay() {
    overlay.classList.remove("show");
  }

  async function requestFullscreen() {
    const element = document.documentElement;
    if (!document.fullscreenElement && element.requestFullscreen) {
      try {
        await element.requestFullscreen();
      } catch (_) {}
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (_) {}
    }
  }

  function updateFullscreenButton() {
    const inFullscreen = Boolean(document.fullscreenElement);
    fullscreenBtn.textContent = inFullscreen ? "⤫ Exit fullscreen" : "⛶ Fullscreen";
    fullscreenBtn.setAttribute(
      "aria-label",
      inFullscreen ? "Exit fullscreen" : "Enter fullscreen"
    );
  }

  fullscreenBtn.addEventListener("click", async () => {
    if (document.fullscreenElement) await exitFullscreen();
    else await requestFullscreen();
    updateFullscreenButton();
  });

  document.addEventListener("fullscreenchange", updateFullscreenButton);
  updateFullscreenButton();

  function setGridColumns(count) {
    let columns = Math.ceil(Math.sqrt(count || 1));
    columns = Math.max(1, Math.min(columns, 6));

    const width = Math.min(
      window.innerWidth,
      (window.screen && window.screen.width) || window.innerWidth
    );
    if (width < 420) columns = Math.min(columns, 2);
    else if (width < 720) columns = Math.min(columns, 3);

    grid.style.gridTemplateColumns =
      "repeat(" + columns + ", minmax(0, 1fr))";
  }

  function buildTiles(items, options) {
    grid.replaceChildren();
    setGridColumns(items.length);

    for (const item of items) {
      const link = document.createElement("a");
      link.className = "tile";
      link.textContent = item.label;
      link.href = item.url;
      link.target = "_self";
      link.rel = "noopener noreferrer";
      link.referrerPolicy = "no-referrer";
      grid.appendChild(link);
    }

    const count = items.length;
    const parts = [
      count + " link" + (count === 1 ? "" : "s"),
      options && options.migratedLegacyLink ? "old link upgraded" : "live"
    ];
    if (options && options.rejected) {
      parts.push(options.rejected + " unsafe/invalid skipped");
    }
    meta.textContent = parts.join(" • ");
  }

  window.addEventListener("resize", () => {
    setGridColumns(grid.children.length || 1);
  });

  window.addEventListener("hashchange", () => {
    location.reload();
  });

  async function fetchCSVText(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("HTTP " + response.status);

      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_CSV_BYTES) {
        throw new Error("The CSV is larger than 1 MB.");
      }

      return await readResponseTextWithLimit(response, MAX_CSV_BYTES);
    } finally {
      clearTimeout(timeout);
    }
  }

  function showSetup() {
    meta.textContent = "no data source";
    showOverlay({
      title: "No launcher configured",
      text: "This page deliberately loads no data without an explicit CSV source.",
      hint: "Create a launcher link with the setup helper.",
      actions: [
        { label: "Open setup helper", href: "./helper.html" }
      ]
    });
  }

  async function start() {
    clearLegacyCache();

    const configuration = readConfiguration();
    const params = configuration.params;
    const rawCsvUrl = (params.get("csv") || "").trim();
    const title = (params.get("title") || "Link Launcher")
      .trim()
      .slice(0, 120) || "Link Launcher";

    if (params.get("kiosk") === "1") document.body.classList.add("kiosk");
    document.title = title;
    pageTitle.textContent = title;

    if (!rawCsvUrl) {
      showSetup();
      return;
    }

    let csvUrl;
    try {
      csvUrl = validateCsvSource(rawCsvUrl);
    } catch (error) {
      meta.textContent = "invalid data source";
      showOverlay({
        title: "Invalid CSV source",
        text: error.message,
        hint: "Nothing was fetched.",
        actions: [
          { label: "Open setup helper", href: "./helper.html" }
        ]
      });
      return;
    }

    showOverlay({
      title: "Loading links…",
      text: "Fetching the configured CSV.",
      hint: "Source: " + sourceHost(csvUrl)
    });

    try {
      const text = await fetchCSVText(csvUrl);
      const parsed = parseItemsFromCSVText(text);

      if (!parsed.items.length) {
        throw new Error("No valid link rows were found.");
      }

      buildTiles(parsed.items, {
        migratedLegacyLink: configuration.migratedLegacyLink,
        rejected: parsed.rejected
      });
      hideOverlay();
    } catch (error) {
      meta.textContent = "load failed";
      const message = error.name === "AbortError"
        ? "The request timed out."
        : error.message;
      showOverlay({
        title: "Couldn’t load CSV",
        text: message,
        hint: "Source: " + sourceHost(csvUrl) + "\nThe full CSV address is intentionally hidden.",
        actions: [
          { label: "Retry", onClick: () => location.reload() },
          { label: "Edit setup", href: "./helper.html" }
        ]
      });
    }
  }

  start();
})();
