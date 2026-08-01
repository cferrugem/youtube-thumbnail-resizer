# Focus Mode — design

**Date:** 2026-08-01
**Status:** approved
**Repo:** `cferrugem/youtube-thumbnail-resizer`

## Problem

The extension currently only resizes thumbnails. The user wants a second, unrelated
capability: the watch-page video should **pause itself when their attention leaves it** —
either because they switched away from the tab, or because they scrolled down to read
the comments — and resume when their attention comes back.

## Scope

In scope:

- Pause on tab switch / window minimize.
- Pause when the comments section scrolls into view.
- Automatic resume when *every* reason to be paused has cleared.
- Three popup toggles (master + one per trigger group), persisted like existing settings.

Out of scope:

- Pausing when the browser window loses OS focus (Alt+Tab). See "Rejected: the `blur`
  trigger" below — this was designed, built, and then removed after testing.
- Any change to the thumbnail-resizing behaviour.
- Non-`/watch` surfaces (home-page hover previews, Shorts, embeds).
- New extension permissions.

## Architecture

A new content script `focus.js`, listed alongside `content.js` in the manifest's single
`content_scripts` entry. It shares `chrome.storage.local` with the resizer but shares no
code or state — the two modules are independently understandable and independently
removable.

No new permissions. `visibilitychange` and `IntersectionObserver` are both page-level DOM
APIs available to any content script.

### Surface gating

The module is inert unless `location.pathname === "/watch"`. This is what keeps home-page
thumbnail hover-previews (which are also `<video>` elements) from being paused.

### Core: the reason set

Rather than a single `paused` boolean, the module holds a `Set` of *active reasons*:
`"hidden"` and `"comments"`.

- A reason becoming active → pause the video (if not already paused).
- A reason clearing → resume **only if the set is now empty**.

This is the whole point of modelling it as a set. Overlapping triggers are the common
case: the user scrolls to the comments (paused), then switches tabs. Returning to the
tab clears `"hidden"` but `"comments"` is still active, so the video correctly stays
paused instead of blasting audio while they are still reading.

### Respecting manual pauses

Two flags:

- `pausedByUs` — true only when the pause was issued by this module.
- `selfPauseAt` — the timestamp of our last `video.pause()` call.

The obvious implementation — a boolean set around the `pause()` call — does not work.
The `pause` event is fired **asynchronously**, so a flag cleared on the next line is
already `false` by the time the handler runs, and every pause of ours would be
misread as the user's (the video would then never resume). A short timestamp window
is immune to that ordering.

Rules:

- `pause` event more than 200 ms after `selfPauseAt` → the user paused; clear `pausedByUs`.
- `play` event → clear `pausedByUs`.
- Resume is refused unless `pausedByUs` is true.

Consequence: if the user manually pauses and then leaves the tab, the video is still
paused when they return. The extension never starts playback the user did not start.

### Triggers

| Event | Reason | Covers |
| --- | --- | --- |
| `document` `visibilitychange` | `hidden` | switching tabs, minimizing the window |
| `IntersectionObserver` on `#comments` | `comments` | scrolling down to read comments |

The comments observer uses `threshold: 0` with `rootMargin: "0px 0px -20% 0px"`, so the
reason activates once the top of the section rises past 80% of the viewport. A
proportional threshold would not work here: `#comments` can be tens of thousands of
pixels tall, so even `0.05` would demand a thousand pixels of scrolling.

#### Rejected: the `blur` trigger

The original design also paused on `window` `blur`, because that is the *only* signal
that catches Alt+Tab — `visibilityState` stays `"visible"` when another application
merely covers the window. It was built and then removed after testing, in two steps.

The problem is that `blur` is ambiguous. It fires identically for Alt+Tab, the Windows
volume flyout, a taskbar click, an OS notification, DevTools, this extension's own popup,
and clicking anything on a second monitor. A page has no way to ask *why* focus was lost.

The first mitigation was a 2-second grace period: schedule the pause, cancel it if focus
returns first. That did fix the transient cases — the volume flyout stopped interrupting
playback. It did **not** fix the one that matters most on this user's setup: clicking the
second monitor is not transient. You stay there, the timer elapses, and the video pauses
every time you glance at the other screen. A longer delay only trades one failure for
another.

The conclusion is that the signal is wrong, not the timing. `blur` cannot express "the
user left the video" on a multi-monitor desktop, so the trigger was dropped entirely
along with the grace-period machinery. `visibilitychange` carries no such ambiguity and
is now the only window-level trigger. The cost is accepted and explicit: **Alt+Tab to
another app does not pause the video.**

### SPA navigation

YouTube swaps videos without a page load, and `#comments` is created lazily. The module
follows the pattern already established in `content.js`: re-attach on `yt-navigate-finish`
plus a periodic re-check. On leaving `/watch`, active reasons are cleared and the
observer disconnected so nothing leaks into the next page.

## Settings

Stored in `chrome.storage.local` next to the existing keys, and picked up live through
the `storage.onChanged` listener the extension already has.

| Key | Default | Meaning |
| --- | --- | --- |
| `focusEnabled` | `false` | master switch for the whole module |
| `focusOnTabSwitch` | `true` | pause on tab switch / minimize |
| `focusOnComments` | `true` | pause when comments scroll into view |

Focus mode is **opt-in**: it changes how the player behaves, so it ships off and the user
turns it on from the popup. The two per-trigger toggles default to on, so enabling the
master switch gives the complete behaviour without further setup.

Turning a trigger off clears its reason immediately, which may resume the video if that
was the last one active.

## Error handling

- `video.play()` returns a promise that Chrome's autoplay policy can reject. Always
  `.catch()` and ignore — a failed resume must never throw into the page.
- The `<video>` element may not exist yet when the script runs (`document_start`). All
  access is lazy and re-queried; absence is a no-op, not an error.
- Live streams: pausing works and resuming continues from the paused position via DVR.
  Accepted as-is.

## Testing

The repository has no test infrastructure (no `package.json`, no runner), and this design
does not add one for a ~150-line DOM module whose entire surface is browser events.
Verification is a manual checklist documented in the README:

1. Play a video, switch tabs → pauses. Return → resumes.
2. Play a video, minimize the window → pauses. Restore → resumes.
3. Play a video, scroll to comments → pauses. Scroll back up → resumes.
4. Scroll to comments (pauses), switch tabs and back → **stays paused**.
5. Pause manually, switch tabs and back → **stays paused**.
6. Alt+Tab away, click a second monitor, or open the volume flyout → **never pauses**.
7. Hover a home-page thumbnail preview, switch tabs → preview is untouched.
8. Turn the master toggle off → none of the above pause.

## Files

| File | Change |
| --- | --- |
| `focus.js` | new — the entire module |
| `manifest.json` | register `focus.js`; version bump |
| `popup.html` | new "Focus mode" section with three toggles |
| `popup.js` | wire the toggles to storage |
| `README.md` | document the feature and the manual checklist |
