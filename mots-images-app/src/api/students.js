import { apiFetch } from './client'

export function getMyStudents() {
  return apiFetch('/students/myStudents')
}

export function createStudent(name) {
  return apiFetch('/students', { method: 'POST', body: { name } })
}

export function getStudentTestSessions(studentId) {
  return apiFetch(`/students/${studentId}/test-sessions`)
}
