import { useEffect, useMemo, useRef } from "react"
import { findActiveIndex, useVideoTime } from "~hooks/useVideoTime"
import type { TranscriptLine } from "~types/transcript"
import { TranscriptLineItem } from "./TranscriptLine"

type Props = {
  lines: TranscriptLine[]
  isJapanese: boolean
  furigana: string[] | null
  autoScroll: boolean
}

export function TranscriptList({
  lines,
  isJapanese,
  furigana,
  autoScroll
}: Props) {
  const currentTime = useVideoTime(200)
  const activeIndex = useMemo(
    () => findActiveIndex(currentTime, lines),
    [currentTime, lines]
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const lastScrolledRef = useRef<number>(-1)

  useEffect(() => {
    if (!autoScroll) return
    if (activeIndex < 0) return
    if (activeIndex === lastScrolledRef.current) return
    const el = activeRef.current
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    lastScrolledRef.current = activeIndex
  }, [activeIndex, autoScroll])

  if (lines.length === 0) {
    return <div className="tc-empty">No transcript lines</div>
  }

  return (
    <div ref={scrollRef} className="tc-list">
      {lines.map((line, i) => {
        const active = i === activeIndex
        return (
          <TranscriptLineItem
            key={`${line.start}-${i}`}
            ref={active ? activeRef : undefined}
            line={line}
            active={active}
            isJapanese={isJapanese}
            furiganaHtml={furigana ? furigana[i] : null}
          />
        )
      })}
    </div>
  )
}
