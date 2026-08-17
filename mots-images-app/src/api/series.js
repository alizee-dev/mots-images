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

export function getSeriesDetail(seriesId) {
  return apiFetch(`/series/${seriesId}`)
}

export function updateSeriesTitle(seriesId, title) {
  return apiFetch(`/series/${seriesId}`, { method: 'PUT', body: { title } })
}

export function archiveSeries(seriesId) {
  return apiFetch(`/series/${seriesId}/status`, { method: 'PUT' })
}

export function removeWordFromSeries(seriesId, wordId) {
  return apiFetch(`/series/${seriesId}/words/${wordId}`, { method: 'DELETE' })
}

export function updateSeriesWordsOrder(seriesId, wordsDetails) {
  return apiFetch(`/series/${seriesId}/words/order`, { method: 'PUT', body: { wordsDetails } })
}
