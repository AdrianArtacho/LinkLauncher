# 📱 Link Launcher

**Link Launcher** is a lightweight, static, mobile-first web app designed to run on **GitHub Pages**.
It turns a **public Google Spreadsheet (CSV)** into a **full-screen, tap-friendly grid of links**, ideal for performances, classrooms, installations, kiosks, or quick access hubs.

No build step. No backend. Just HTML + CSS + JavaScript.

---

## ✨ Features

* 📄 **Reads links from a Google Sheets CSV**
* 📱 **Optimized for smartphones & tablets**
* ⬛ **Black, minimal, distraction-free UI**
* 🔲 **Automatically adapts layout** to number of rows
* 🖐️ **Big, tappable buttons**
* 🖥️ **Fullscreen-friendly** (with remembered user consent)
* 🧠 **Remembers fullscreen preference** using `localStorage`
* 🧱 Optional **kiosk mode** (no header, pure grid)
* 🌐 Works perfectly on **GitHub Pages**

---

## 📊 Spreadsheet format

The Google Sheet must be **published as CSV** and follow this structure:

| Column A (Label) | Column B (URL)                             |
| ---------------- | ------------------------------------------ |
| Website          | [https://example.com](https://example.com) |
| Score PDF        | https://…                                  |
| Video            | https://…                                  |

Only the **first two columns** are used.
Empty rows are ignored.

### How to publish a Google Sheet as CSV

1. Open the sheet
2. **File → Share → Publish to web**
3. Choose:

   * Sheet: the desired tab
   * Format: **CSV**
4. Copy the generated URL
   It will look like:

```
https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv
```

---

## 🚀 Usage

### Basic usage (default title)

```
https://<username>.github.io/<repo>/?csv=<CSV_URL>
```

### Custom page title

```
https://<username>.github.io/<repo>/
  ?csv=<CSV_URL>
  &title=My%20Links
```

### Kiosk mode (no header)

```
https://<username>.github.io/<repo>/
  ?csv=<CSV_URL>
  &kiosk=1
```

> ⚠️ Always **URL-encode** the CSV URL when passing it as a parameter.

---

## 🖥️ Fullscreen behavior (important)

Due to browser security rules:

* Fullscreen **cannot be forced automatically**
* A **single user tap** is required

What Link Launcher does instead:

1. On first visit:

   * Asks once whether fullscreen should be used
2. Saves the choice locally
3. On later visits:

   * Shows a minimal **“Tap to start”** screen
   * Enters fullscreen immediately on tap

This is the **maximum possible automation** allowed by modern browsers.

### iOS tip (recommended)

For the best fullscreen experience on iPhone/iPad:

* Open the page in Safari
* Use **“Add to Home Screen”**
* Launch from the home screen

This removes most browser UI and feels like a native app.

---

## 🛠️ Installation (GitHub Pages)

1. Create a new GitHub repository
2. Add the provided `index.html` to the root
3. Go to **Settings → Pages**
4. Deploy from:

   * Branch: `main`
   * Folder: `/ (root)`
5. Open your GitHub Pages URL 🎉

---

## 🧪 Example

```
https://yourname.github.io/link-launcher/
  ?csv=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2F...%2Foutput%3Dcsv
  &title=CAP%20Showing
  &kiosk=1
```

---

## 🔒 Privacy

* No tracking
* No cookies
* No analytics
* Only uses:

  * `fetch()` to read a public CSV
  * `localStorage` to remember fullscreen preference

---

## 🧩 Possible extensions

If you want to extend this project later, easy additions include:

* Third column for **button colors or categories**
* Long-press / double-tap actions
* Auto-refreshing the CSV
* Password-protected CSV proxy
* Offline cache
* PWA install support

---

## 📄 License

MIT License
Use freely for artistic, educational, and commercial purposes.

---

## [📝 To-Do](https://trello.com/c/AqaKqLdD/51-linklauncher)
