import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getMyStudents } from '../api/students'
import ChildIcon from '../components/ChildIcon'

// The "Évaluations" nav destination — same pattern as TrainingHubPage: one
// child hands off immediately, several ask first, none invites adding one.
export default function EvaluationsHubPage() {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMyStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="page form-error">{error}</div>
  if (students === null) return <div className="page">Chargement…</div>

  if (students.length === 0) {
    return (
      <div className="page">
        <h2>Évaluations</h2>
        <p className="empty-hint">Ajoute d’abord un enfant pour voir ses évaluations.</p>
        <Link to="/students" className="btn btn-toggle active">
          <ChildIcon size={18} />
          Ajouter un enfant
        </Link>
      </div>
    )
  }

  if (students.length === 1) {
    return <Navigate to={`/evaluations/${students[0].id}`} replace />
  }

  return (
    <div className="page">
      <h2>Évaluations</h2>
      <p className="page-subtitle">Choisis un enfant</p>
      <div className="student-picker">
        {students.map((s) => (
          <Link key={s.id} to={`/evaluations/${s.id}`} className="btn btn-chip student-picker-item">
            <ChildIcon size={18} />
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
