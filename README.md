# YouTube Transcript Companion

A Chrome/Firefox browser extension that injects a live transcript sidebar on YouTube watch pages, with active-line tracking, click-to-seek, furigana for Japanese, and translation to English / Vietnamese / Japanese.

Fully client-side. No backend, no API key required to get started.

## Features

- **Live sidebar** on `youtube.com/watch` pages
- **Active line tracking** — polls `video.currentTime` every 200ms, highlights the currently spoken line
- **Auto-scroll** to keep the active line centered (toggleable)
- **Click to seek** — click any line to jump the video there
- **Copy** the full transcript to clipboard as `[HH:MM:SS] line text`
- **Download** the transcript as `transcript.txt`
- **Translate** between EN / VI / JA using MyMemory (free, no key)
- **Furigana on hover** for Japanese transcripts (using Kuroshiro + Kuromoji)
- **Font size slider** (12–22px)
- **Dark mode** — follows `prefers-color-scheme`
- **SPA-aware** — re-fetches when YouTube navigates between videos
- **Cross-browser** — single codebase, builds for Chrome MV3 and Firefox MV2

## Tech stack

- [Plasmo](https://www.plasmo.com/) — browser-extension framework (React + TS, cross-browser)
- React 18 + TypeScript
- [Kuroshiro](https://github.com/hexenq/kuroshiro) + [kuromoji analyzer](https://github.com/hexenq/kuroshiro-analyzer-kuromoji) — Japanese morphological analysis (dictionary loaded from unpkg CDN on first use)
- [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php) — free translation, no API key

## Install (development)

```bash
npm install
```

### Chrome / Edge / Brave (MV3)

```bash
npm run dev
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select `build/chrome-mv3-dev`
4. Open a YouTube video — the sidebar should appear on the right

### Firefox (MV2)

```bash
npm run dev:firefox
```

Then in Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Pick any file inside `build/firefox-mv2-dev` (e.g. `manifest.json`)
4. Open a YouTube video

## Production build

```bash
# Chrome MV3 → build/chrome-mv3-prod/
npm run build

# Firefox MV2 → build/firefox-mv2-prod/
npm run build:firefox
```

Zip for store submission:

```bash
npm run package           # Chrome
npm run package:firefox   # Firefox
```

## Project structure

```
src/
├── contents/youtube.tsx   # Plasmo content script — mounts Sidebar in Shadow DOM
├── components/
│   ├── Sidebar.tsx        # Sidebar shell + state (open, font, translation, furigana)
│   ├── TranscriptList.tsx # Scrollable list + auto-scroll to active line
│   ├── TranscriptLine.tsx # Single line — click-to-seek, ruby rendering
│   ├── Toolbar.tsx        # Language picker, Copy/Download, font slider, toggles
│   └── ToggleButton.tsx   # Floating show/hide button
├── lib/
│   ├── fetchTranscript.ts # Reads ytInitialPlayerResponse; parses timedtext XML
│   ├── translate.ts       # MyMemory batched translation
│   ├── furigana.ts        # Kuroshiro wrapper (lazy-loaded)
│   ├── detectLanguage.ts  # EN / VI / JA heuristics
│   └── formatTranscript.ts# [HH:MM:SS] formatting + copy/download helpers
├── hooks/
│   ├── useVideoTime.ts    # 200ms polling of video.currentTime + seek helper
│   └── useTranscript.ts   # Fetches on mount and yt-navigate-finish
├── types/transcript.ts    # TranscriptLine / FetchTranscriptResult types
├── background.ts          # CORS-safe fetch proxy, action click → toggle
├── popup.tsx              # Extension popup — "Open sidebar" button
└── style.css              # All sidebar styles (injected into Shadow DOM)
```

## How it works

1. The content script runs on `youtube.com/watch*` and mounts a React app inside a Shadow DOM (Plasmo handles isolation).
2. On mount, `fetchTranscript` reads `ytInitialPlayerResponse` directly from the page, picks a caption track (preferring manual over auto-generated), and fetches its `baseUrl` (YouTube's timedtext XML endpoint). If the direct `fetch` hits CORS, it falls back to a `chrome.runtime.sendMessage` round-trip to the background service worker.
3. The XML is parsed into `{ start, duration, text }[]`.
4. `useVideoTime` polls `video.currentTime` every 200ms. The active-line index is computed from the current time and used to (a) highlight the line and (b) scroll it into view.
5. On translation, all lines are sent to MyMemory in batches of 20 with a 350ms delay between batches to stay under free-tier limits.
6. On SPA navigation (`yt-navigate-finish`), the transcript is re-fetched for the new video.

## Changes from the original plan

- **Translation**: uses MyMemory instead of LibreTranslate (LibreTranslate's public endpoint now requires an API key for most usage). The module is easy to swap — see `src/lib/translate.ts`.
- **Transcript source**: reads `ytInitialPlayerResponse` directly from the page instead of refetching `watch?v=…` — avoids an extra round trip and the CORS preflight.
- **Styling**: plain CSS injected via Plasmo's `getStyle` export instead of Tailwind. Tailwind inside a Shadow DOM is known to be brittle (see the plan's gotcha #3); plain CSS with CSS variables gives us dark mode and isolation for free.
- **Kuromoji dictionary**: loaded from `unpkg.com/kuromoji@0.1.2/dict/` via `dictPath` instead of bundling the ~12MB of `.dat` files into the extension.

## Known limitations

- **MyMemory free tier**: 1000 words/day anonymous, 50,000 with an email. Set `PLASMO_PUBLIC_TRANSLATE_EMAIL` in `.env` if you hit the limit.
- **Furigana cold start**: the first time you enable furigana, the browser downloads ~12MB of dictionary files from unpkg. Subsequent uses are cached.
- **YouTube DOM changes**: if YouTube changes its player response structure, `fetchTranscript.ts` may need updating — the selectors in that file are the single point of failure.

## License

MIT — see `LICENSE`.
