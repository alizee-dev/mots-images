import { apiFetch } from './client'

export function getSeries() {
  return apiFetch('/series')
}

export function createSeries(title) {
  return apiFetch('/series', { method: 'POST', body: { title } })
}

export function addWordsToSeries(seriesId, wordsIds) {
  return apiFetch(`/series/${seriesId}/words`, { method: 'POST', body: { wordsIds } })
}
