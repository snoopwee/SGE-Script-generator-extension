import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import cssText from "data-text:~style.css"
import { Sidebar } from "~components/Sidebar"

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/watch*"],
  all_frames: false,
  run_at: "document_idle"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return
    if (msg.type === "OPEN_SIDEBAR") {
      window.dispatchEvent(new CustomEvent("tc:set-open", { detail: true }))
    } else if (msg.type === "TOGGLE_SIDEBAR") {
      window.dispatchEvent(new CustomEvent("tc:toggle"))
    }
  })
}

export default function TranscriptContentScript() {
  return <Sidebar />
}
