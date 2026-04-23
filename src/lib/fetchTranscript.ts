import type {
  CaptionTrack,
  FetchTranscriptResult,
  TranscriptLine
} from "~types/transcript"
import { detectLanguage } from "./detectLanguage"

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "")
}

export function getVideoIdFromLocation(): string | null {
  const url = new URL(window.location.href)
  const v = url.searchParams.get("v")
  if (v) return v
  const match = window.location.pathname.match(/^\/shorts\/([^/?#]+)/)
  return match ? match[1] : null
}

function readPlayerResponseFromPage(): any | null {
  const w = window as any
  if (w.ytInitialPlayerResponse) return w.ytInitialPlayerResponse

  const scripts = Array.from(document.querySelectorAll("script"))
  for (const s of scripts) {
    const txt = s.textContent || ""
    const idx = txt.indexOf("ytInitialPlayerResponse")
    if (idx === -1) continue
    const jsonStart = txt.indexOf("{", idx)
    if (jsonStart === -1) continue
    let depth = 0
    for (let i = jsonStart; i < txt.length; i++) {
      const ch = txt[i]
      if (ch === "{") depth++
      else if (ch === "}") {
        depth--
        if (depth === 0) {
          try {
            return JSON.parse(txt.slice(jsonStart, i + 1))
          } catch {
            return null
          }
        }
      }
    }
  }
  return null
}

function extractCaptionTracks(playerResponse: any): CaptionTrack[] {
  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  if (!Array.isArray(tracks)) return []
  return tracks.map((t: any) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    name: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode,
    kind: t.kind
  }))
}

function pickTrack(
  tracks: CaptionTrack[],
  preferredLang?: string
): CaptionTrack | null {
  if (tracks.length === 0) return null
  if (preferredLang) {
    const exact = tracks.find(
      (t) =>
        t.languageCode.toLowerCase() === preferredLang.toLowerCase() &&
        t.kind !== "asr"
    )
    if (exact) return exact
    const exactAuto = tracks.find(
      (t) => t.languageCode.toLowerCase() === preferredLang.toLowerCase()
    )
    if (exactAuto) return exactAuto
  }
  const manual = tracks.find((t) => t.kind !== "asr")
  return manual || tracks[0]
}

async function fetchTimedtextXml(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(baseUrl, { credentials: "include" })
    if (res.ok) {
      const body = await res.text()
      if (body && body.length > 0) return body
    }
  } catch {
    // fall through to background fetch
  }
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    const body = await chrome.runtime.sendMessage({
      type: "FETCH_TEXT",
      url: baseUrl
    })
    if (typeof body === "string" && body.length > 0) return body
    if (body && typeof body === "object" && "error" in body) {
      throw new Error(`Background fetch failed: ${(body as any).error}`)
    }
    throw new Error("Background fetch returned empty body")
  }
  throw new Error("Failed to fetch transcript XML")
}

function parseTimedtextXml(xml: string): TranscriptLine[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const nodes = Array.from(doc.getElementsByTagName("text"))
  return nodes
    .map((node) => {
      const start = parseFloat(node.getAttribute("start") || "0")
      const duration = parseFloat(node.getAttribute("dur") || "0")
      const raw = node.textContent || ""
      const text = decodeHtmlEntities(stripTags(raw)).replace(/\s+/g, " ").trim()
      return { start, duration, text }
    })
    .filter((l) => l.text.length > 0)
}

export async function fetchTranscript(
  preferredLang?: string
): Promise<FetchTranscriptResult> {
  const videoId = getVideoIdFromLocation()
  if (!videoId) throw new Error("Not on a YouTube video page")

  const playerResponse = readPlayerResponseFromPage()
  if (!playerResponse) {
    throw new Error("Could not read ytInitialPlayerResponse from page")
  }

  const tracks = extractCaptionTracks(playerResponse)
  if (tracks.length === 0) {
    throw new Error("This video has no captions available")
  }

  const track = pickTrack(tracks, preferredLang)
  if (!track) throw new Error("Could not select a caption track")

  const xml = await fetchTimedtextXml(track.baseUrl)
  const lines = parseTimedtextXml(xml)
  if (lines.length === 0) throw new Error("Transcript is empty")

  const sampleText = lines
    .slice(0, 10)
    .map((l) => l.text)
    .join(" ")

  return {
    lines,
    language: detectLanguage(sampleText, track.languageCode),
    sourceLanguageCode: track.languageCode,
    isAutoGenerated: track.kind === "asr"
  }
}

export function listCaptionTracks(): CaptionTrack[] {
  const pr = readPlayerResponseFromPage()
  return pr ? extractCaptionTracks(pr) : []
}
