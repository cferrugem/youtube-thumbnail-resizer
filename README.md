# YouTube Thumbnail Resizer

A lightweight Chrome (Manifest V3) extension that lets you customize the size of YouTube thumbnails across the site — the home/subscriptions grid, search results, and the watch-page suggestions sidebar — all live, with no page reload. It also ships a **focus mode** that pauses the video when your attention leaves it.

## Features

### Thumbnail sizing

- **Home / Subscriptions** — control how many columns the video grid uses (more columns = smaller thumbnails).
- **Suggestions while watching** — set the thumbnail width (px) for the watch-page sidebar suggestions.
- **Search results** — pick a preset size: Off, Small, Medium, or Large.

### Focus mode

**Off by default** — flip the *Focus mode* switch in the popup to turn it on. Once on, it pauses the watch-page video the moment your attention goes elsewhere, and resumes it when you come back:

- **Switching tabs or minimizing** — you move to another tab, or minimize the window.
- **Reaching the comments** — the video pauses once the comments section scrolls onto the screen, and resumes when you scroll back up.

Two rules keep it from being annoying:

- It **never resumes a video you paused yourself**. If you hit space and then leave the tab, it is still paused when you return.
- It resumes only when *every* reason to be paused has cleared. Scrolling to the comments and then switching tabs will not start playback when you come back to the tab — you are still in the comments.

Each trigger has its own toggle, so you can keep one and drop the other.

> **Why not pause on Alt+Tab?** The only signal for that is the window `blur` event, and a page cannot tell *why* focus was lost. Alt+Tab, the Windows volume flyout, the taskbar, a notification and clicking a second monitor all fire the exact same event — so on a dual-monitor setup the video would pause every time you glanced at the other screen. `visibilitychange` has no such ambiguity, so focus mode uses only that.

### General

- Changes apply **instantly** while you browse (survives YouTube's SPA navigation).
- Preferences are saved with `chrome.storage`, so they persist across sessions.
- Clean dark popup UI that matches YouTube's look.

## Installation (Load unpacked)

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Pin the extension and open it on any `youtube.com` page to adjust the sliders.

## How it works

**Resizing** — `content.js` injects a `<style>` element into the page and rebuilds the CSS whenever your preferences change. It targets both YouTube's newer *lockup* layout and the legacy renderers, so it keeps working across surfaces (home, search, and watch-page suggestions).

**Focus mode** — `focus.js` is a separate, independent module. It only runs on `/watch` (so home-page hover previews are never touched) and tracks a *set* of reasons to be paused: `hidden` and `comments`. Adding a reason pauses; removing one resumes only when the set is empty. `visibilitychange` covers tab switches and minimizing, and an `IntersectionObserver` on `#comments` covers scrolling down. No extra permissions are required — these are all plain DOM APIs.

## Manual test checklist

There is no automated test suite; this is a small DOM module driven entirely by browser events. After loading the unpacked extension, **turn *Focus mode* on in the popup** (it is off by default), then verify on a watch page:

1. Play a video, switch tabs → pauses. Return → resumes.
2. Play a video, minimize the window → pauses. Restore → resumes.
3. Play a video, scroll to the comments → pauses. Scroll back up → resumes.
4. Scroll to the comments (pauses), switch tabs and back → **stays paused**.
5. Pause manually, switch tabs and back → **stays paused**.
6. Alt+Tab to another app, click a second monitor, or open the Windows volume flyout → **never pauses**.
7. Hover a home-page thumbnail preview, switch tabs → the preview is unaffected.
8. Turn the *Focus mode* master toggle back off → none of the above pause, and a video paused by it resumes.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (MV3) |
| `content.js` | Injects and updates the resizing CSS on youtube.com |
| `focus.js` | Focus mode: pauses/resumes the watch-page video |
| `popup.html` / `popup.js` | Settings popup UI and logic |
| `icons/` | Extension icons (16/48/128) |

## Permissions

- `storage` — to remember your preferences.
- `host_permissions: https://www.youtube.com/*` — to run on YouTube only.

Focus mode adds **no** permissions of its own.

## License

[MIT](LICENSE)
