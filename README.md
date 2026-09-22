# 📱 [Link Launcher](https://adrianartacho.github.io/LinkLauncher/)

**Link Launcher** turns a published Google Sheets CSV into a full-screen,
tap-friendly grid of links for performances, classrooms, installations, kiosks,
and personal launch pages.

It is a static GitHub Pages app with no build step and no backend.

> [!IMPORTANT]
> A Google Sheet published as CSV is public. Link Launcher now prevents the bare
> app URL from revealing a configured sheet and reduces accidental URL leakage,
> but it does not authenticate visitors. Do not publish confidential, personal,
> or student data with this setup.

## ✨ Features

- Loads only an explicitly configured CSV; the bare app reveals no dataset
- Keeps configuration in the URL fragment rather than the HTTP query
- Does not persist the CSV URL or its contents in browser storage
- Clears private data cached by older Link Launcher releases
- Rejects malformed and unsafe destination schemes
- Sends no referrer when fetching the CSV or opening a tile
- Provides a mobile-first, responsive grid and optional kiosk mode
- Includes a [setup helper](https://adrianartacho.github.io/LinkLauncher/helper.html)
- Supports fullscreen and a deliberately safe, unconfigured install entry point

## 📊 Spreadsheet format

Only the first two columns are used. Empty rows are ignored.

| Column A (label) | Column B (URL) |
| --- | --- |
| Website | https://example.com |
| Score PDF | https://example.com/score.pdf |
| Call venue | tel:+431234567 |

Allowed destination schemes are HTTPS, HTTP, mailto, and tel. Unsafe schemes
such as javascript and data are skipped.

### Publish a Google Sheet as CSV

1. Open the sheet.
2. Choose **File → Share → Publish to web**.
3. Select the desired sheet tab and **CSV** as the format.
4. Copy the generated URL.

It should resemble:

~~~text
https://docs.google.com/spreadsheets/d/e/.../pub?gid=0&single=true&output=csv
~~~

## 🚀 Create a launcher link

The easiest method is the
[setup helper](https://adrianartacho.github.io/LinkLauncher/helper.html).
It validates the CSV address and creates the correctly encoded link locally in
your browser.

The resulting form is:

~~~text
https://<username>.github.io/<repo>/#csv=<ENCODED_CSV_URL>
~~~

Optional title and kiosk settings use the same fragment:

~~~text
https://<username>.github.io/<repo>/#csv=<ENCODED_CSV_URL>&title=My+Links&kiosk=1
~~~

Always keep the leading #. A fragment is processed in the browser and is not
sent to GitHub Pages as part of the page request.

### Old query links

Older versions used ?csv=... links. They still open for compatibility and are
immediately rewritten to the fragment form in the address bar.

Replace old bookmarks and shared links with the rewritten version. The query in
an old link has already been transmitted with its first page request; rewriting
it afterward cannot undo that exposure.

## 🔒 Privacy and security model

Link Launcher is private-by-default only in this limited sense:

- The bare app URL loads no CSV.
- The CSV address is not hard-coded in the current source.
- The fragment is not sent in the GitHub Pages request or ordinary referrer
  headers.
- CSV contents and addresses are not saved in localStorage, IndexedDB, or Cache
  Storage by this app.
- Older Link Launcher localStorage cache entries are deleted when the updated
  app is opened.

This is still an **unlisted bearer link**, not access control:

- Anyone with the complete launcher link can open it.
- Anyone with the underlying published CSV URL can read the spreadsheet
  directly without signing in.
- The complete launcher link may remain in browser history, bookmark sync,
  screenshots, extensions, or messages where it was shared.
- Cached copies on devices that never open the updated app cannot be erased
  remotely.

If the data must be restricted to particular people, stop publishing the sheet
and use a private source with real authentication, such as Google OAuth plus
the Sheets API or an authenticated backend. A password embedded in this public
repository would not provide security.

If a CSV address was previously committed or shared, treat it as exposed.
Removing it from the latest source does not remove it from Git history or other
copies. Unpublish or revoke that source before using the app for anything
sensitive.

## 🖥️ Fullscreen, bookmarks, and installation

Browsers require a user gesture before entering fullscreen. Use the floating
button to enter or leave fullscreen.

The shared web manifest intentionally starts at the unconfigured app root. It
does not contain a private CSV address. On browsers that install the manifest
as an app, launching that installed app therefore opens the safe setup screen,
not a configured launcher. Bookmark the complete fragment-based launcher URL
if you need to reopen that configuration.

## 🛠️ Deploy on GitHub Pages

1. Create a repository containing these files.
2. In **Settings → Pages**, deploy from the main branch and repository root.
3. Open the Pages URL and use the setup helper to create your launcher link.

## 📄 License

MIT License. Use freely for artistic, educational, and commercial purposes.

## [📝 To-Do](https://trello.com/c/AqaKqLdD/51-linklauncher)
