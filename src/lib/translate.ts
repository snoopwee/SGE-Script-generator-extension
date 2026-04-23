import type { LangCode } from "~types/transcript"

type TargetLang = Exclude<LangCode, "unknown">

const BATCH_SIZE = 20
const BATCH_DELAY_MS = 350

function toMyMemoryCode(code: string): string {
  const c = code.toLowerCase().split("-")[0]
  if (c === "ja" || c === "jp") return "ja"
  if (c === "vi") return "vi"
  return "en"
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function translateOneViaMyMemory(
  text: string,
  source: string,
  target: TargetLang,
  email?: string
): Promise<string> {
  if (!text.trim()) return text
  const src = toMyMemoryCode(source)
  const tgt = toMyMemoryCode(target)
  if (src === tgt) return text

  const params = new URLSearchParams({
    q: text,
    langpair: `${src}|${tgt}`
  })
  if (email) params.set("de", email)

  const url = `https://api.mymemory.translated.net/get?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`)
  const data = await res.json()

  if (data?.responseStatus && data.responseStatus !== 200) {
    throw new Error(
      `MyMemory: ${data.responseDetails || "translation failed"}`
    )
  }
  const translated = data?.responseData?.translatedText
  if (typeof translated !== "string" || translated.length === 0) {
    throw new Error("MyMemory: empty translation")
  }
  return translated
}

export async function translateLines(
  texts: string[],
  source: string,
  target: TargetLang,
  opts: {
    onProgress?: (done: number, total: number) => void
    email?: string
  } = {}
): Promise<string[]> {
  const { onProgress, email } = opts
  const out: string[] = new Array(texts.length)
  let done = 0

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (t) => {
        try {
          return await translateOneViaMyMemory(t, source, target, email)
        } catch {
          return t
        }
      })
    )
    for (let j = 0; j < results.length; j++) {
      out[i + j] = results[j]
    }
    done += batch.length
    onProgress?.(Math.min(done, texts.length), texts.length)
    if (i + BATCH_SIZE < texts.length) await sleep(BATCH_DELAY_MS)
  }
  return out
}
