import { apiFetch } from './client'

export function assignSeriesToStudents(seriesId, studentsIds) {
  return apiFetch(`/assignments/${seriesId}/students`, { method: 'POST', body: { studentsIds } })
}

export function getPendingAssignments(studentId) {
  return apiFetch(`/assignments/${studentId}`)
}

// Unlike getPendingAssignments above, this includes évaluations already
// passed — used for the "Entraînements" list (an entraînement stays usable
// for practice long after its one-time évaluation is spent), never for the
// "Évaluations" screen itself, which only ever wants the pending ones.
export function getAllAssignmentsByStudent(studentId) {
  return apiFetch(`/assignments/all/${studentId}`)
}
