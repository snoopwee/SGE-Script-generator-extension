# YouTube Transcript Companion — Extension Build Plan

> **Target agent:** Claude Code  
> **Goal:** Build a cross-browser (Chrome + Firefox) extension that fetches YouTube transcripts, displays them in an injected sidebar with real-time active-line tracking, furigana support for Japanese, translation, and copy/download — all without any backend server.

---

## 1. Project Overview

| Item | Detail |
|---|---|
| Extension type | Browser Extension (Chrome MV3 + Firefox MV2) |
| Framework | Plasmo + React 18 + TypeScript |
| Target sites | YouTube (`youtube.com/watch`) |
| Supported languages | English (EN), Vietnamese (VI), Japanese (JP) |
| Data source | YouTube's built-in timedtext API (no external API key needed) |
| Backend | None — fully client-side |

---

## 2. Full Feature List

### Core Features
- **F1 — Transcript Fetching:** Fetch the full transcript of the currently playing YouTube video using the YouTube timedtext endpoint. Parse XML into structured `{ start, duration, text }` objects.
- **F2 — Sidebar UI:** Inject a collapsible sidebar into the YouTube watch page (not a popup). The sidebar renders all transcript lines with timestamps.
- **F3 — Active Line Highlighting:** Poll `video.currentTime` every 200ms. Highlight the transcript line currently being spoken with a distinct background color and larger font.
- **F4 — Auto-scroll to Active Line:** The sidebar automatically scrolls to keep the active line centered in view while the video plays, so the user never has to manually scroll.
- **F5 — Click Timestamp to Seek:** Clicking any transcript line seeks the video to that timestamp instantly via `video.currentTime`.
- **F6 — Language Detection:** Detect whether the transcript is English, Vietnamese, or Japanese and apply language-appropriate rendering.
- **F7 — Furigana on Hover (Japanese only):** For Japanese transcripts, render furigana (reading aids) above kanji characters on hover using the `kuroshiro` + `kuromoji` libraries.
- **F8 — Translation:** A language picker dropdown lets the user translate the entire transcript to EN, VI, or JP using the LibreTranslate API (free, open-source). Translated lines replace the original in the sidebar.
- **F9 — Copy Transcript:** A "Copy" button copies the entire transcript as plain text to clipboard, formatted as `[HH:MM:SS] Line text`.
- **F10 — Download Transcript:** A "Download" button saves the transcript as a `.txt` file, same format as copy.
- **F11 — Sidebar Toggle:** A floating toggle button (or the extension popup) opens/closes the sidebar without reloading the page.
- **F12 — Cross-browser Support:** A single codebase builds for both Chrome (MV3) and Firefox (MV2) via Plasmo build targets.

### Nice-to-Have (implement after core is done)
- **F13 — Font Size Control:** Slider in the sidebar to adjust base font size (especially useful for Japanese kanji readability).
- **F14 — Active Line Font Emphasis:** Active line is always rendered 2–4px larger than inactive lines regardless of base font size setting.

---

## 3. Tech Stack

### Extension Framework
| Package | Version | Purpose |
|---|---|---|
| `plasmo` | latest | Cross-browser extension scaffolding, MV3/MV2 builds, hot reload |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | 18 | UI rendering |
| `react-dom` | 18 | DOM rendering |
| `typescript` | 5 | Type safety |
| `tailwindcss` | 3 | Styling (Plasmo has built-in Tailwind support) |

### Japanese Language Processing
| Package | Version | Purpose |
|---|---|---|
| `kuroshiro` | latest | Converts kanji to furigana / readings |
| `kuroshiro-analyzer-kuromoji` | latest | Morphological analyzer for kuroshiro |

### Translation
| Service | Type | Purpose |
|---|---|---|
| LibreTranslate | Free REST API (`https://libretranslate.com/translate`) | Translate transcript lines between EN/VI/JP |

> **Note:** LibreTranslate is free with rate limits. Language codes: `en`, `vi`, `ja`. No API key required for the public instance, but a key can be added later if rate-limited.

### Build & Dev Tools
| Tool | Purpose |
|---|---|
| `web-ext` | Firefox packaging and testing |
| `plasmo` CLI | Chrome build, dev server, hot reload |

---

## 4. Project Structure

```
transcript-ext/
├── src/
│   ├── contents/
│   │   └── youtube.tsx          # Plasmo content script — mounts sidebar into YouTube DOM
│   ├── components/
│   │   ├── Sidebar.tsx          # Main sidebar shell (open/close, layout)
│   │   ├── TranscriptList.tsx   # Scrollable list of all transcript lines
│   │   ├── TranscriptLine.tsx   # Single line: timestamp + text + furigana
│   │   ├── Toolbar.tsx          # Language picker, Copy, Download buttons
│   │   └── ToggleButton.tsx     # Floating button to show/hide sidebar
│   ├── lib/
│   │   ├── fetchTranscript.ts   # Fetch + parse YouTube timedtext XML
│   │   ├── translate.ts         # LibreTranslate API wrapper
│   │   ├── furigana.ts          # Kuroshiro wrapper — adds furigana to JP text
│   │   ├── detectLanguage.ts    # Detect EN/VI/JP from transcript content
│   │   └── formatTranscript.ts  # Format lines as [HH:MM:SS] text for copy/download
│   ├── hooks/
│   │   ├── useVideoTime.ts      # Polls video.currentTime every 200ms
│   │   └── useTranscript.ts     # Fetches transcript on video load/navigation
│   ├── types/
│   │   └── transcript.ts        # TranscriptLine type definition
│   ├── popup.tsx                # Extension popup — simple "Open Sidebar" button
│   └── style.css                # Tailwind base styles
├── assets/
│   └── icon.png                 # Extension icon (128x128)
├── package.json
├── tsconfig.json
└── .env.example                 # Example env vars (LibreTranslate key if needed)
```

---

## 5. Core Implementation Details

### 5.1 Transcript Fetching (`lib/fetchTranscript.ts`)

```
Algorithm:
1. Get videoId from window.location.search (?v=VIDEO_ID)
2. Fetch https://www.youtube.com/watch?v=VIDEO_ID to get the page HTML
3. Find the "captionTracks" array inside the ytInitialPlayerResponse JSON embedded in the page
4. Pick the correct track by language (default: first available)
5. Fetch the baseUrl from that track (this is the timedtext URL)
6. Parse the returned XML: each <text start="x" dur="y">content</text> → TranscriptLine
7. Decode HTML entities in text content
8. Return TranscriptLine[]
```

**Type:**
```ts
export type TranscriptLine = {
  start: number      // seconds (float)
  duration: number   // seconds (float)
  text: string       // plain text, HTML-entity-decoded
}
```

**Important edge cases:**
- Video has no captions → show "No transcript available" message
- Auto-generated captions vs manual captions → prefer manual, fall back to auto
- YouTube navigation is a SPA — re-fetch transcript when URL changes (listen for `yt-navigate-finish` event)

### 5.2 Active Line Tracking (`hooks/useVideoTime.ts`)

```ts
// Poll every 200ms for currentTime
// Return index of active TranscriptLine:
// activeLine = lines.findIndex(l => currentTime >= l.start && currentTime < l.start + l.duration)
// Auto-scroll: use a ref on the active line element + scrollIntoView({ behavior: 'smooth', block: 'center' })
```

### 5.3 Furigana (`lib/furigana.ts`)

```
- Initialize Kuroshiro + KuromojiAnalyzer once (expensive — do it on mount, cache the instance)
- Only activate when detected/selected language is Japanese
- Convert each TranscriptLine.text to HTML with <ruby> tags
- Render with dangerouslySetInnerHTML inside TranscriptLine.tsx
- Show furigana on hover via CSS: ruby rt { visibility: hidden } ruby:hover rt { visibility: visible }
```

### 5.4 Translation (`lib/translate.ts`)

```
- Endpoint: POST https://libretranslate.com/translate
- Body: { q: string, source: 'auto', target: 'en'|'vi'|'ja', format: 'text' }
- Translate all lines in batches of 20 to avoid rate limits
- Show loading spinner on Toolbar while translating
- Cache translation result in component state (don't re-translate on re-render)
```

### 5.5 YouTube SPA Navigation

YouTube is a React SPA — the page does not fully reload when navigating between videos. Listen for YouTube's custom event:

```ts
window.addEventListener('yt-navigate-finish', () => {
  // re-fetch transcript for new videoId
})
```

Also handle direct URL changes via a `MutationObserver` on the page title as a fallback.

### 5.6 Content Script Mount (`contents/youtube.tsx`)

```
- Plasmo content script with matches: ["https://www.youtube.com/watch*"]
- Mount a React root into a Shadow DOM container appended to document.body
- Use Shadow DOM to prevent YouTube's CSS from leaking into the sidebar
- Sidebar is absolutely positioned, right: 0, top: 56px (below YouTube navbar), height: calc(100vh - 56px)
- When sidebar is open, inject CSS to shrink #primary (YouTube main content) width so sidebar doesn't overlap
```

---

## 6. UI / UX Spec

### Sidebar Layout
```
┌─────────────────────────────────┐
│  📄 Transcript        [EN▼] [✕] │  ← Toolbar: language picker + close
│─────────────────────────────────│
│  [Copy] [Download]              │  ← Action buttons
│─────────────────────────────────│
│  0:04  Hello and welcome...     │  ← inactive line (small, muted)
│                                 │
│ ▶ 0:12  今日は日本語で話します    │  ← ACTIVE line (highlighted bg, larger font)
│                                 │
│  0:18  このビデオでは...          │  ← inactive line
│  ...                            │
└─────────────────────────────────┘
```

### Styling Rules
- **Sidebar width:** 340px fixed
- **Active line:** `background: #fef9c3` (yellow-100), font-size 1rem, bold
- **Inactive lines:** font-size 0.875rem, color gray-600
- **Japanese active line:** font-size 1.1rem (slightly larger for kanji readability)
- **Timestamp:** monospace font, color gray-400, min-width 48px
- **Scrollbar:** thin, styled to not clash with YouTube UI
- **Dark mode:** detect `prefers-color-scheme: dark` and apply dark sidebar theme

---

## 7. Build & Packaging

### Development
```bash
# Install dependencies
npm install

# Dev mode (Chrome)
npm run dev

# Dev mode (Firefox)
npm run dev -- --target=firefox-mv2
```

### Production Build
```bash
# Chrome (MV3)
npm run build
# Output: build/chrome-mv3-prod/

# Firefox (MV2)
npm run build -- --target=firefox-mv2
# Output: build/firefox-mv2-prod/
```

### Packaging for Store Submission
```bash
# Chrome → zip build/chrome-mv3-prod/ → upload to Chrome Web Store
npm run package

# Firefox → zip build/firefox-mv2-prod/ → upload to addons.mozilla.org
npm run package -- --target=firefox-mv2
```

---

## 8. Permissions Required (`manifest.json` additions)

```json
{
  "permissions": ["storage", "clipboardWrite"],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://libretranslate.com/*"
  ]
}
```

> Plasmo auto-generates `manifest.json` — declare these in `package.json` under the `"manifest"` key.

---

## 9. Implementation Order (for the agent)

Execute in this exact order:

1. **Scaffold** — `npm create plasmo@latest transcript-ext -- --with-src`, choose React + TypeScript
2. **Install deps** — `kuroshiro`, `kuroshiro-analyzer-kuromoji`, `tailwindcss`
3. **Types** — Create `src/types/transcript.ts`
4. **Transcript fetcher** — Implement `src/lib/fetchTranscript.ts` with full XML parsing and error handling
5. **Hooks** — Implement `useTranscript.ts` and `useVideoTime.ts`
6. **Sidebar shell** — Build `Sidebar.tsx` and `ToggleButton.tsx`, mount via `contents/youtube.tsx`
7. **TranscriptList + TranscriptLine** — Render lines, highlight active, auto-scroll
8. **Seek on click** — Wire `video.currentTime` in `TranscriptLine.tsx`
9. **Toolbar** — Copy + Download buttons using `formatTranscript.ts`
10. **Language detection** — `detectLanguage.ts` using character range checks (CJK for JP, Latin+diacritics for VI)
11. **Furigana** — `furigana.ts` + `<ruby>` rendering in `TranscriptLine.tsx` (JP only)
12. **Translation** — `translate.ts` + language picker in `Toolbar.tsx`
13. **SPA navigation** — `yt-navigate-finish` listener in content script
14. **Dark mode** — CSS variables for light/dark themes
15. **Firefox build** — Test with `--target=firefox-mv2`, fix any API differences
16. **Font size control (F13/F14)** — Slider component added to Toolbar last

---

## 10. Known Gotchas for the Agent

- **Kuroshiro initialization is async and slow** — initialize once at mount, show a loading indicator, never re-initialize.
- **YouTube blocks direct fetch from content scripts for some resources** — use `chrome.runtime.sendMessage` to a background service worker for fetching if CORS errors occur on the timedtext URL.
- **Shadow DOM + Tailwind** — Tailwind styles won't apply inside Shadow DOM by default. Use Plasmo's `getStyle` export in the content script to inject the CSS into the shadow root.
- **LibreTranslate rate limits** — batch requests, add 300ms delay between batches, show a friendly error if the API returns 429.
- **SPA navigation** — `yt-navigate-finish` fires reliably but test `MutationObserver` fallback for edge cases.
- **PowerShell users** — All Docker/shell commands should be single-line (no line continuation).
- **`video.currentTime` polling** — Use `setInterval` with 200ms, always clear it in `useEffect` cleanup to prevent memory leaks.
