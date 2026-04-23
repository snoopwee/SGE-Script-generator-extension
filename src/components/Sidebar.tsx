import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranscript } from "~hooks/useTranscript"
import {
  copyToClipboard,
  downloadText,
  formatTranscript
} from "~lib/formatTranscript"
import { toFuriganaBatch } from "~lib/furigana"
import { translateLines } from "~lib/translate"
import type { LangCode, TranscriptLine } from "~types/transcript"
import { ToggleButton } from "./ToggleButton"
import { Toolbar } from "./Toolbar"
import { TranscriptList } from "./TranscriptList"

const STORAGE_OPEN = "tc_sidebar_open"
const STORAGE_FONT = "tc_font_size"
const STORAGE_AUTOSCROLL = "tc_auto_scroll"

function readBool(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === "1"
  } catch {
    return fallback
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0")
  } catch {
    // ignore storage errors
  }
}

function readNum(key: string, fallback: number) {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

export function Sidebar() {
  const [open, setOpen] = useState(() => readBool(STORAGE_OPEN, true))
  const [fontSize, setFontSize] = useState(() => readNum(STORAGE_FONT, 14))
  const [autoScroll, setAutoScroll] = useState(() =>
    readBool(STORAGE_AUTOSCROLL, true)
  )
  const [furiganaEnabled, setFuriganaEnabled] = useState(false)
  const [furigana, setFurigana] = useState<string[] | null>(null)
  const [furiganaLoading, setFuriganaLoading] = useState(false)

  const [displayLang, setDisplayLang] = useState<LangCode>("unknown")
  const [translatedLines, setTranslatedLines] = useState<TranscriptLine[] | null>(
    null
  )
  const [translating, setTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState<
    { done: number; total: number } | null
  >(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { status, data, error, reload } = useTranscript()

  useEffect(() => writeBool(STORAGE_OPEN, open), [open])

  useEffect(() => {
    const onSet = (e: Event) => {
      const ce = e as CustomEvent<boolean>
      setOpen(Boolean(ce.detail))
    }
    const onToggle = () => setOpen((v) => !v)
    window.addEventListener("tc:set-open", onSet as EventListener)
    window.addEventListener("tc:toggle", onToggle as EventListener)
    return () => {
      window.removeEventListener("tc:set-open", onSet as EventListener)
      window.removeEventListener("tc:toggle", onToggle as EventListener)
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FONT, String(fontSize))
    } catch {
      // ignore
    }
  }, [fontSize])
  useEffect(() => writeBool(STORAGE_AUTOSCROLL, autoScroll), [autoScroll])

  // Reset translation and furigana when a new transcript loads.
  useEffect(() => {
    setTranslatedLines(null)
    setFurigana(null)
    setFuriganaEnabled(false)
    setNotice(null)
    if (data) setDisplayLang(data.language)
  }, [data])

  // Shrink YouTube primary column while sidebar is open.
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "tc-layout-style"
    style.textContent = open
      ? `ytd-watch-flexy #columns { margin-right: 360px !important; }
         ytd-watch-flexy[theater] #columns { margin-right: 0 !important; }`
      : ""
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [open])

  const effectiveLines = useMemo<TranscriptLine[]>(() => {
    if (!data) return []
    return translatedLines ?? data.lines
  }, [data, translatedLines])

  const isJapaneseView = useMemo(() => {
    if (!data) return false
    if (translatedLines) return displayLang === "ja"
    return data.language === "ja"
  }, [data, translatedLines, displayLang])

  const handleChangeLanguage = useCallback(
    async (target: LangCode) => {
      if (!data) return
      setDisplayLang(target)
      setNotice(null)
      if (target === data.language) {
        setTranslatedLines(null)
        return
      }
      if (target === "unknown") {
        setTranslatedLines(null)
        return
      }
      setTranslating(true)
      setTranslationProgress({ done: 0, total: data.lines.length })
      try {
        const texts = data.lines.map((l) => l.text)
        const translated = await translateLines(
          texts,
          data.sourceLanguageCode || data.language,
          target,
          {
            onProgress: (done, total) =>
              setTranslationProgress({ done, total })
          }
        )
        setTranslatedLines(
          data.lines.map((l, i) => ({ ...l, text: translated[i] }))
        )
        setFurigana(null)
        setFuriganaEnabled(false)
      } catch (err) {
        setNotice(
          `Translation failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
        setTranslatedLines(null)
        setDisplayLang(data.language)
      } finally {
        setTranslating(false)
        setTranslationProgress(null)
      }
    },
    [data]
  )

  const handleToggleFurigana = useCallback(async () => {
    if (!isJapaneseView) return
    if (furiganaEnabled) {
      setFuriganaEnabled(false)
      return
    }
    if (furigana && furigana.length === effectiveLines.length) {
      setFuriganaEnabled(true)
      return
    }
    setFuriganaLoading(true)
    setNotice("Loading Japanese dictionary… (first use only)")
    try {
      const texts = effectiveLines.map((l) => l.text)
      const result = await toFuriganaBatch(texts)
      setFurigana(result)
      setFuriganaEnabled(true)
      setNotice(null)
    } catch (err) {
      setNotice(
        `Furigana unavailable: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
      setFuriganaEnabled(false)
    } finally {
      setFuriganaLoading(false)
    }
  }, [effectiveLines, furigana, furiganaEnabled, isJapaneseView])

  const handleCopy = useCallback(async () => {
    if (effectiveLines.length === 0) return
    const text = formatTranscript(effectiveLines)
    const ok = await copyToClipboard(text)
    setNotice(ok ? "Copied to clipboard" : "Copy failed")
    window.setTimeout(() => setNotice(null), 2000)
  }, [effectiveLines])

  const handleDownload = useCallback(() => {
    if (effectiveLines.length === 0) return
    const text = formatTranscript(effectiveLines)
    downloadText("transcript.txt", text)
  }, [effectiveLines])

  if (!open) {
    return <ToggleButton open={false} onClick={() => setOpen(true)} />
  }

  return (
    <>
      <ToggleButton open onClick={() => setOpen(false)} />
      <aside
        className="tc-sidebar"
        style={{ fontSize: `${fontSize}px` } as React.CSSProperties}>
        <header className="tc-header">
          <span className="tc-title">📄 Transcript</span>
          <button
            className="tc-btn tc-btn-ghost"
            onClick={() => setOpen(false)}
            title="Close">
            ✕
          </button>
        </header>

        {data && (
          <Toolbar
            detectedLanguage={data.language}
            displayLanguage={displayLang}
            onChangeLanguage={handleChangeLanguage}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onReload={reload}
            onToggleFurigana={handleToggleFurigana}
            furiganaEnabled={furiganaEnabled}
            autoScroll={autoScroll}
            onToggleAutoScroll={() => setAutoScroll((v) => !v)}
            fontSize={fontSize}
            onChangeFontSize={setFontSize}
            translating={translating}
            translationProgress={translationProgress}
          />
        )}

        {notice && <div className="tc-notice">{notice}</div>}
        {furiganaLoading && (
          <div className="tc-notice">Generating furigana…</div>
        )}

        <div className="tc-body">
          {status === "idle" && (
            <div className="tc-placeholder">Waiting for video…</div>
          )}
          {status === "loading" && (
            <div className="tc-placeholder">Loading transcript…</div>
          )}
          {status === "error" && (
            <div className="tc-placeholder tc-error">
              <div>{error}</div>
              <button className="tc-btn" onClick={reload}>
                Retry
              </button>
            </div>
          )}
          {status === "ready" && data && (
            <TranscriptList
              lines={effectiveLines}
              isJapanese={isJapaneseView}
              furigana={furiganaEnabled ? furigana : null}
              autoScroll={autoScroll}
            />
          )}
        </div>
      </aside>
    </>
  )
}
