import { forwardRef } from "react"
import { seekTo } from "~hooks/useVideoTime"
import { formatTimestamp } from "~lib/formatTranscript"
import type { TranscriptLine as Line } from "~types/transcript"

type Props = {
  line: Line
  active: boolean
  isJapanese: boolean
  furiganaHtml: string | null
}

export const TranscriptLineItem = forwardRef<HTMLDivElement, Props>(
  function TranscriptLineItem({ line, active, isJapanese, furiganaHtml }, ref) {
    const classes = ["tc-line"]
    if (active) classes.push("tc-line-active")
    if (isJapanese) classes.push("tc-line-jp")

    return (
      <div
        ref={ref}
        className={classes.join(" ")}
        onClick={() => seekTo(line.start)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            seekTo(line.start)
          }
        }}>
        <span className="tc-ts">{formatTimestamp(line.start)}</span>
        {furiganaHtml ? (
          <span
            className="tc-text"
            dangerouslySetInnerHTML={{ __html: furiganaHtml }}
          />
        ) : (
          <span className="tc-text">{line.text}</span>
        )}
      </div>
    )
  }
)
