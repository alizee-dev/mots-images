import { apiFetch } from './client'

export function assignSeriesToStudents(seriesId, studentsIds) {
  return apiFetch(`/assignments/${seriesId}/students`, { method: 'POST', body: { studentsIds } })
}

export function getPendingAssignments(studentId) {
  return apiFetch(`/assignments/${studentId}`)
}
