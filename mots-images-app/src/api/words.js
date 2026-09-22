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

// Admin only — every word still in a bank or already used in a série,
// across all teachers, for manually writing/correcting sentences.
export function getWordsForSentenceEditing() {
  return apiFetch('/words/admin/sentences')
}

// Admin only — sets or corrects a word's sentence directly, regardless of
// which teacher owns it.
export function updateWordSentenceAsAdmin(wordId, sentence) {
  return apiFetch(`/words/${wordId}/sentence`, { method: 'PUT', body: { sentence } })
}

// Beta: generates 3 AI illustration proposals for one letter or a
// consecutive run of letters. `positions` is 1-based, matching the API's
// convention (not this app's usual 0-based letterIndex).
export function generateWordIllustration(wordId, letters, positions) {
  return apiFetch(`/words/${wordId}/generate-illustration`, { method: 'POST', body: { letters, positions } })
}

// None of the 3 AI proposals fit and the teacher doesn't want to illustrate
// it manually either — flags the word for an admin to pick up by hand,
// recording the same letters/positions already sent to generateWordIllustration,
// plus the concept that attempt actually used (see generateWordIllustration's
// own `concept` return value) so the admin can see and adjust it rather than
// starting from a blank prompt.
export function requestManualIllustration(wordId, letters, positions, concept) {
  return apiFetch(`/words/${wordId}/request-manual-illustration`, {
    method: 'POST',
    body: { letters, positions, concept },
  })
}

// Admin only — every word currently flagged for manual illustration help,
// across all teachers.
export function getIllustrationRequests() {
  return apiFetch('/words/admin/illustration-requests')
}

// Admin only — generates a single illustration from a concept the admin
// writes by hand, standing in for the AI-generated concept the normal flow
// would have produced.
export function generateAdminIllustration(wordId, concept) {
  return apiFetch(`/words/${wordId}/admin/generate-illustration`, { method: 'POST', body: { concept } })
}

// Admin only — accepts a generated illustration, saving it as the word's
// zones and clearing the pending request.
export function acceptAdminIllustration(wordId, zones) {
  return apiFetch(`/words/${wordId}/admin/illustration`, { method: 'PUT', body: { zones } })
}
