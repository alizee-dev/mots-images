import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getMyStudents } from '../../api/students'
import ChildIcon from '../../components/ChildIcon'

// The "Entraînements" nav destination itself — never a list on its own.
// With one child, this immediately hands off to their list (no picker to
// click through); with several, it asks which one first. Reached with
// `prefillWordIds` in location.state (the word bank's "Créer un
// entraînement" bulk action) skips the list entirely and hands off
// straight to the creation screen instead, carrying that state along.
export default function TrainingHubPage() {
  const location = useLocation()
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
        <h2>Entraînements</h2>
        <p className="empty-hint">Ajoute d’abord un enfant pour créer son premier entraînement.</p>
        <Link to="/students" className="btn btn-toggle active">
          <ChildIcon size={18} />
          Ajouter un enfant
        </Link>
      </div>
    )
  }

  const destinationFor = (studentId) => (location.state?.prefillWordIds ? `/training/${studentId}/new` : `/training/${studentId}`)

  if (students.length === 1) {
    return <Navigate to={destinationFor(students[0].id)} replace state={location.state} />
  }

  return (
    <div className="page">
      <h2>Entraînements</h2>
      <p className="page-subtitle">Choisis un enfant</p>
      <div className="student-picker">
        {students.map((s) => (
          <Link key={s.id} to={destinationFor(s.id)} state={location.state} className="btn btn-chip student-picker-item">
            <ChildIcon size={18} />
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
