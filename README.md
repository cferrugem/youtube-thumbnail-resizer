# YouTube Thumbnail Resizer

A lightweight Chrome (Manifest V3) extension that lets you customize the size of YouTube thumbnails across the site — the home/subscriptions grid, search results, and the watch-page suggestions sidebar — all live, with no page reload.

## Features

- **Home / Subscriptions** — control how many columns the video grid uses (more columns = smaller thumbnails).
- **Suggestions while watching** — set the thumbnail width (px) for the watch-page sidebar suggestions.
- **Search results** — pick a preset size: Off, Small, Medium, or Large.
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

The content script injects a `<style>` element into the page and rebuilds the CSS whenever your preferences change. It targets both YouTube's newer *lockup* layout and the legacy renderers, so it keeps working across surfaces (home, search, and watch-page suggestions).

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (MV3) |
| `content.js` | Injects and updates the resizing CSS on youtube.com |
| `popup.html` / `popup.js` | Settings popup UI and logic |
| `icons/` | Extension icons (16/48/128) |

## Permissions

- `storage` — to remember your size preferences.
- `host_permissions: https://www.youtube.com/*` — to apply styles on YouTube only.

## License

[MIT](LICENSE)
