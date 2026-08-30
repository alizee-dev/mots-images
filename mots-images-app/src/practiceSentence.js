// Same "phrase à trous" convention as the real test screen (see
// TestSessionPage.jsx's own maskWordInSentence) — kept as an independent
// copy since that screen is off-limits for this project, but shared here
// across the practice code that needs it (level 3's own sentence, and the
// correction card shown after a wrong answer on any level).
const EXISTING_BLANK = /(_{3,}|\.{3,})/

export function maskWordInSentence(sentence, text) {
  if (!sentence) return null
  if (EXISTING_BLANK.test(sentence)) return sentence
  if (!text) return null
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'i')
  if (!re.test(sentence)) return null
  return sentence.replace(re, '___')
}
