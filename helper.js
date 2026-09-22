import { buildLauncherUrl, validateCsvSource } from "./app-core.js";

(() => {
  "use strict";

  const csvElement = document.getElementById("csv");
  const titleElement = document.getElementById("title");
  const kioskElement = document.getElementById("kiosk");
  const resultElement = document.getElementById("result");
  const errorElement = document.getElementById("error");
  const copyButton = document.getElementById("copyBtn");
  const openLink = document.getElementById("openLink");

  const baseUrl = new URL("./", location.href);
  baseUrl.search = "";
  baseUrl.hash = "";

  function resetResult(message) {
    resultElement.textContent = "—";
    errorElement.textContent = message || "";
    copyButton.disabled = true;
    openLink.hidden = true;
    openLink.removeAttribute("href");
  }

  function update() {
    const rawCsv = csvElement.value.trim();
    const title = titleElement.value.trim();

    if (!rawCsv) {
      resetResult("");
      return;
    }

    let csv;
    try {
      csv = validateCsvSource(rawCsv);
    } catch (error) {
      resetResult(error.message);
      return;
    }

    const launcherUrl = buildLauncherUrl(
      baseUrl,
      csv,
      title,
      kioskElement.checked
    );
    resultElement.textContent = launcherUrl;
    errorElement.textContent = "";
    openLink.href = launcherUrl;
    openLink.hidden = false;
    copyButton.disabled = false;
  }

  csvElement.addEventListener("input", update);
  titleElement.addEventListener("input", update);
  kioskElement.addEventListener("change", update);

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(resultElement.textContent);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy URL";
      }, 1200);
    } catch (_) {
      errorElement.textContent = "Copy failed. Select and copy the URL manually.";
    }
  });
})();
