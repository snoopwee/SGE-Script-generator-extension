type FetchTextMessage = {
  type: "FETCH_TEXT"
  url: string
}

chrome.runtime.onMessage.addListener(
  (msg: FetchTextMessage, _sender, sendResponse) => {
    if (!msg || msg.type !== "FETCH_TEXT") return false
    ;(async () => {
      try {
        const res = await fetch(msg.url, { credentials: "include" })
        const text = await res.text()
        sendResponse(text)
      } catch (err) {
        sendResponse({
          error: err instanceof Error ? err.message : String(err)
        })
      }
    })()
    return true
  }
)

export {}
