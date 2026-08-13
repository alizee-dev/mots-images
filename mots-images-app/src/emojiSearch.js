import frData from 'emojibase-data/fr/data.json'

function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Skin-tone variants, duplicate "text style" entries, and the 26 standalone
// "regional indicator" letter tiles (A-Z blocks used only to build flag
// emoji, not meaningful on their own) aren't useful in a picker meant for
// quick, unambiguous illustrations.
const INDEX = frData
  .filter((e) => e.emoji && e.label && e.type === 1 && !e.label.startsWith('indicateur régional'))
  .map((e) => ({
    emoji: e.emoji,
    label: e.label,
    searchText: normalize([e.label, ...(e.tags || [])].join(' ')),
  }))

export function searchEmoji(query, limit = 72) {
  const q = normalize((query || '').trim())
  if (!q) return INDEX.slice(0, limit)
  const terms = q.split(/\s+/).filter(Boolean)
  const results = []
  for (const entry of INDEX) {
    if (terms.every((t) => entry.searchText.includes(t))) {
      results.push(entry)
      if (results.length >= limit) break
    }
  }
  return results
}
