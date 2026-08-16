import { apiFetch } from './client'

export function getTestSessionWords(testSessionId) {
  return apiFetch(`/test-sessions/${testSessionId}/words`)
}

export function submitTestSession(assignmentId, attempts) {
  return apiFetch(`/test-sessions/${assignmentId}`, { method: 'POST', body: { attempts } })
}
