import { useEffect, useState } from "react"

function getVideoEl(): HTMLVideoElement | null {
  return document.querySelector(
    "video.html5-main-video"
  ) as HTMLVideoElement | null
}

export function useVideoTime(pollMs = 200): number {
  const [t, setT] = useState(0)

  useEffect(() => {
    let mounted = true
    const tick = () => {
      const v = getVideoEl()
      if (v && mounted) setT(v.currentTime)
    }
    tick()
    const id = window.setInterval(tick, pollMs)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [pollMs])

  return t
}

export function seekTo(seconds: number) {
  const v = getVideoEl()
  if (v) {
    v.currentTime = seconds
    if (v.paused) void v.play().catch(() => {})
  }
}

export function findActiveIndex(
  currentTime: number,
  lines: { start: number; duration: number }[]
): number {
  if (lines.length === 0) return -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].start) return i
  }
  return -1
}
