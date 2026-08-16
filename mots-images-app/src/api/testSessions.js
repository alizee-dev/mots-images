import { apiFetch } from './client'

export function getTestSessionWords(testSessionId) {
  return apiFetch(`/test-sessions/${testSessionId}/words`)
}
