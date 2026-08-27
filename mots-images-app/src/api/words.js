import { apiFetch } from './client'

export function getWords() {
  return apiFetch('/words')
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

// Beta: generates 3 AI illustration proposals for one letter or a
// consecutive run of letters. `positions` is 1-based, matching the API's
// convention (not this app's usual 0-based letterIndex).
export function generateWordIllustration(wordId, letters, positions) {
  return apiFetch(`/words/${wordId}/generate-illustration`, { method: 'POST', body: { letters, positions } })
}
