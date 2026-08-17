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
