import { useEffect, useState } from "react"

function IndexPopup() {
  const [onYoutube, setOnYoutube] = useState(false)
  const [tabId, setTabId] = useState<number | null>(null)

  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab) return
      setOnYoutube(!!tab.url?.startsWith("https://www.youtube.com/watch"))
      setTabId(tab.id ?? null)
    })
  }, [])

  const openSidebar = () => {
    if (!tabId) return
    chrome.tabs.sendMessage(tabId, { type: "OPEN_SIDEBAR" }, () => {
      // ignore lastError if content script not yet mounted
      void chrome.runtime.lastError
    })
    window.close()
  }

  const openYouTube = () => {
    chrome.tabs.create({ url: "https://www.youtube.com/" })
  }

  return (
    <div
      style={{
        padding: 16,
        width: 260,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        color: "#111"
      }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 15 }}>
        YouTube Transcript Companion
      </h1>
      <p style={{ margin: "0 0 12px", color: "#555", lineHeight: 1.5 }}>
        Opens a transcript sidebar on any YouTube watch page with active-line
        tracking, furigana for Japanese, and translation to EN / VI / JP.
      </p>
      {onYoutube ? (
        <button
          onClick={openSidebar}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13
          }}>
          Open sidebar on this video
        </button>
      ) : (
        <button
          onClick={openYouTube}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#f3f4f6",
            color: "#111",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13
          }}>
          Go to YouTube
        </button>
      )}
    </div>
  )
}

export default IndexPopup
