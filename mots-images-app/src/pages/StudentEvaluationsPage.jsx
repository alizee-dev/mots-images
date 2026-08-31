import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyStudents } from '../api/students'
import { getPendingAssignments } from '../api/assignments'
import EvaluationIcon from '../components/EvaluationIcon'

// One child's pending évaluations only — nothing to assign manually here
// (that happens automatically when an entraînement is created for this
// child, see StudentTrainingListPage/NewSeriesPage), and once one is
// passed it drops off this list on its own (see getPendingAssignments) and
// shows up instead in this child's own progression chart.
export default function StudentEvaluationsPage() {
  const { studentId } = useParams()
  const [studentName, setStudentName] = useState(null)
  const [hasSiblings, setHasSiblings] = useState(false)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getMyStudents(), getPendingAssignments(studentId)])
      .then(([students, rows]) => {
        if (cancelled) return
        const found = students.find((s) => String(s.id) === studentId)
        setStudentName(found ? found.name : 'Enfant')
        setHasSiblings(students.length > 1)
        setPending(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to={hasSiblings ? '/evaluations' : '/'}>← {hasSiblings ? 'Changer d’enfant' : 'Accueil'}</Link>
      </p>
      <h2>Évaluations{studentName ? ` — ${studentName}` : ''}</h2>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && !error && pending.length === 0 && (
        <p className="empty-hint">
          Aucune évaluation en attente. Crée un nouvel entraînement pour {studentName || 'cet enfant'} pour lui en générer une.
        </p>
      )}

      {!loading && pending.length > 0 && (
        <ul className="card-list">
          {pending.map((a) => (
            <li key={a.id}>
              <Link
                to={`/students/${studentId}/assignments/${a.id}/test`}
                state={{ studentName }}
                className="card-list-item card-list-item-row"
              >
                <span className="card-list-item-title">
                  <EvaluationIcon size={16} />
                  {a.title}
                </span>
                <span className="card-list-meta">{a.count} mot(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
