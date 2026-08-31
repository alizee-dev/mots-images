import { apiFetch } from './client'

// By default returns only the parent's own words. Pass includeCommonWords to
// also fetch words shared by other teachers (GET /words?includeCommonWords=true).
export function getWords({ includeCommonWords = false } = {}) {
  return apiFetch(`/words${includeCommonWords ? '?includeCommonWords=true' : ''}`)
}

export function createWord(text, sentence) {
  return apiFetch('/words', { method: 'POST', body: { text, sentence } })
}

export function updateWord(wordId, sentence, zones) {
  return apiFetch(`/words/${wordId}`, { method: 'PUT', body: { sentence, zones } })
}

export function removeWordFromBank(wordId) {
  return apiFetch(`/words/${wordId}/status`, { method: 'PUT' })
}

// Word status system (private → pending → common), separate from the
// in_bank soft-delete above despite the similar-looking route shape.

// Submits a word the parent owns for admission into the common bank —
// only its own owner can do this.
export function submitWordForCommonBank(wordId) {
  return apiFetch(`/words/${wordId}/status/pending`, { method: 'PUT' })
}

// Admin only — approves a pending word into the common bank.
export function approveWord(wordId) {
  return apiFetch(`/words/${wordId}/status/common`, { method: 'PUT' })
}

// Admin only — rejects a pending word back to private.
export function rejectWord(wordId) {
  return apiFetch(`/words/${wordId}/status/private`, { method: 'PUT' })
}

// Admin only — every word currently awaiting review, across all teachers.
export function getPendingWords() {
  return apiFetch('/words/status/pending')
}

// Beta: generates 3 AI illustration proposals for one letter or a
// consecutive run of letters. `positions` is 1-based, matching the API's
// convention (not this app's usual 0-based letterIndex).
export function generateWordIllustration(wordId, letters, positions) {
  return apiFetch(`/words/${wordId}/generate-illustration`, { method: 'POST', body: { letters, positions } })
}
