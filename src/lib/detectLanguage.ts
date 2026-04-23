import type { LangCode } from "~types/transcript"

const JP_REGEX = /[぀-ゟ゠-ヿ一-龯]/
const VI_DIACRITICS = /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i

export function detectLanguage(text: string, hintLangCode?: string): LangCode {
  if (hintLangCode) {
    const hint = hintLangCode.toLowerCase().split("-")[0]
    if (hint === "ja" || hint === "jp") return "ja"
    if (hint === "vi") return "vi"
    if (hint === "en") return "en"
  }
  if (!text) return "unknown"
  if (JP_REGEX.test(text)) return "ja"
  if (VI_DIACRITICS.test(text)) return "vi"
  if (/[a-z]/i.test(text)) return "en"
  return "unknown"
}
