# PWA file handling and offline

Decided in [PWA file handling and offline](https://github.com/Suharevillya/matheos/issues/15).

## Files

- Documents live on the user's disk only. No in-app library, no cloud. One document per tab.
- Chromium: File System Access API (`showOpenFilePicker`, `showSaveFilePicker`); the handle is
  kept for the session and persisted in IndexedDB for a recent-files list.
- Firefox and Safari: `<input type=file>` to open, download to save. No recent files.
- Saving is explicit: `Ctrl+S` writes to the handle (or downloads), the title shows an unsaved
  dot. A crash-recovery draft is written to IndexedDB on every change and offered on reopen.
- Installed Chromium PWA: manifest `file_handlers` for `.mth` + `launchQueue`, so `.mth` files
  open from the file manager.
- `logo:` in the front matter renders in the web app only as a URL or data URI; a relative path
  resolves in the CLI only and leaves the slot empty in the browser without an error.

## Offline

`vite-plugin-pwa` precaches the app shell, KaTeX and the bundled fonts. Fully usable offline
after the first visit; a prompt offers the update when a new version is deployed.

## Printing

`window.print()` everywhere. Firefox and Safari show a one-line notice that identical pagination
needs Chrome, Edge or the CLI. No Paged.js. Mobile and iOS printing are unsupported in v1:
phones view and edit; printing is desktop or CLI.

## Hosting

Fly.io with nginx serving the static Vite build, as FrameLab (`Dockerfile`, `fly.toml`,
`nginx.conf`). No server-side code.
