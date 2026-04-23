import type { LangCode } from "~types/transcript"

export type ToolbarProps = {
  detectedLanguage: LangCode
  displayLanguage: LangCode
  onChangeLanguage: (lang: LangCode) => void
  onCopy: () => void
  onDownload: () => void
  onReload: () => void
  onToggleFurigana: () => void
  furiganaEnabled: boolean
  autoScroll: boolean
  onToggleAutoScroll: () => void
  fontSize: number
  onChangeFontSize: (n: number) => void
  translating: boolean
  translationProgress: { done: number; total: number } | null
}

const LANG_LABEL: Record<LangCode, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ja: "日本語",
  unknown: "Original"
}

export function Toolbar(props: ToolbarProps) {
  const {
    detectedLanguage,
    displayLanguage,
    onChangeLanguage,
    onCopy,
    onDownload,
    onReload,
    onToggleFurigana,
    furiganaEnabled,
    autoScroll,
    onToggleAutoScroll,
    fontSize,
    onChangeFontSize,
    translating,
    translationProgress
  } = props

  return (
    <div className="tc-toolbar">
      <div className="tc-row">
        <label className="tc-label">View in</label>
        <select
          className="tc-select"
          value={displayLanguage}
          disabled={translating}
          onChange={(e) => onChangeLanguage(e.target.value as LangCode)}>
          <option value={detectedLanguage}>
            Original ({LANG_LABEL[detectedLanguage]})
          </option>
          {detectedLanguage !== "en" && <option value="en">English</option>}
          {detectedLanguage !== "vi" && <option value="vi">Tiếng Việt</option>}
          {detectedLanguage !== "ja" && <option value="ja">日本語</option>}
        </select>
      </div>

      <div className="tc-row tc-row-actions">
        <button className="tc-btn" onClick={onCopy} disabled={translating}>
          Copy
        </button>
        <button className="tc-btn" onClick={onDownload} disabled={translating}>
          Download
        </button>
        <button className="tc-btn tc-btn-ghost" onClick={onReload} title="Reload transcript">
          ↻
        </button>
      </div>

      <div className="tc-row">
        <label className="tc-toggle">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={onToggleAutoScroll}
          />
          <span>Auto-scroll</span>
        </label>
        {detectedLanguage === "ja" && displayLanguage === "ja" && (
          <label className="tc-toggle">
            <input
              type="checkbox"
              checked={furiganaEnabled}
              onChange={onToggleFurigana}
            />
            <span>Furigana</span>
          </label>
        )}
      </div>

      <div className="tc-row">
        <label className="tc-label">Text size</label>
        <input
          type="range"
          min={12}
          max={22}
          step={1}
          value={fontSize}
          onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10))}
          className="tc-range"
        />
        <span className="tc-label tc-label-mini">{fontSize}px</span>
      </div>

      {translating && translationProgress && (
        <div className="tc-progress">
          Translating {translationProgress.done}/{translationProgress.total}…
        </div>
      )}
    </div>
  )
}
