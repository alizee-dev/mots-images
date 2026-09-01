// Tracks which "your word was approved into the common bank" notices the
// parent has already dismissed — per browser, not per account, since
// there's no server-side field for this. Good enough for a v1: the worst
// case is seeing an already-dismissed notice again on a different device,
// never losing a real one.
const STORAGE_KEY = 'mots-images:acknowledged-common-words'

export function loadAcknowledgedCommonWordIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const ids = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export function acknowledgeCommonWordId(wordId) {
  try {
    const ids = loadAcknowledgedCommonWordIds()
    ids.add(wordId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // Storage unavailable (private browsing, quota…) — the notice will
    // just show again next visit, not worth surfacing an error for.
  }
}
