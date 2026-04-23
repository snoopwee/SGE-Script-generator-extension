import { useCallback, useEffect, useRef, useState } from "react"
import {
  fetchTranscript,
  getVideoIdFromLocation
} from "~lib/fetchTranscript"
import type { FetchTranscriptResult } from "~types/transcript"

type State = {
  status: "idle" | "loading" | "ready" | "error"
  data: FetchTranscriptResult | null
  error: string | null
  videoId: string | null
}

export function useTranscript() {
  const [state, setState] = useState<State>({
    status: "idle",
    data: null,
    error: null,
    videoId: null
  })
  const requestIdRef = useRef(0)

  const load = useCallback(async (videoId: string | null) => {
    const myId = ++requestIdRef.current
    setState({ status: "loading", data: null, error: null, videoId })
    try {
      const data = await fetchTranscript()
      if (requestIdRef.current !== myId) return
      setState({ status: "ready", data, error: null, videoId })
    } catch (err) {
      if (requestIdRef.current !== myId) return
      setState({
        status: "error",
        data: null,
        error: err instanceof Error ? err.message : String(err),
        videoId
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let lastId: string | null = null

    const triggerIfChanged = () => {
      if (cancelled) return
      const id = getVideoIdFromLocation()
      if (id && id !== lastId) {
        lastId = id
        void load(id)
      }
    }

    // initial: wait briefly for ytInitialPlayerResponse to populate
    const initialTimer = window.setTimeout(triggerIfChanged, 600)

    const onNav = () => {
      window.setTimeout(triggerIfChanged, 500)
    }
    window.addEventListener("yt-navigate-finish", onNav)

    // fallback: observe title mutations (covers edge cases where nav event misfires)
    const titleEl = document.querySelector("title")
    let obs: MutationObserver | null = null
    if (titleEl) {
      obs = new MutationObserver(onNav)
      obs.observe(titleEl, { childList: true })
    }

    return () => {
      cancelled = true
      window.clearTimeout(initialTimer)
      window.removeEventListener("yt-navigate-finish", onNav)
      obs?.disconnect()
    }
  }, [load])

  const reload = useCallback(() => {
    void load(getVideoIdFromLocation())
  }, [load])

  return { ...state, reload }
}
