let converterPromise: Promise<any> | null = null

async function initConverter() {
  const Kuroshiro = (await import("kuroshiro")).default
  const KuromojiAnalyzer = (await import("kuroshiro-analyzer-kuromoji"))
    .default
  const kuroshiro = new Kuroshiro()
  await kuroshiro.init(
    new KuromojiAnalyzer({
      dictPath: "https://unpkg.com/kuromoji@0.1.2/dict/"
    })
  )
  return kuroshiro
}

function getConverter() {
  if (!converterPromise) {
    converterPromise = initConverter().catch((err) => {
      converterPromise = null
      throw err
    })
  }
  return converterPromise
}

export function preloadFurigana() {
  void getConverter().catch(() => {})
}

export async function toFurigana(text: string): Promise<string> {
  if (!text.trim()) return text
  const conv = await getConverter()
  return conv.convert(text, { to: "hiragana", mode: "furigana" })
}

export async function toFuriganaBatch(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const conv = await getConverter()
  const out: string[] = []
  for (let i = 0; i < texts.length; i++) {
    try {
      out.push(await conv.convert(texts[i], { to: "hiragana", mode: "furigana" }))
    } catch {
      out.push(texts[i])
    }
    onProgress?.(i + 1, texts.length)
  }
  return out
}
