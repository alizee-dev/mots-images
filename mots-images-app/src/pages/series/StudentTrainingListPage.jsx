import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMyStudents } from '../../api/students'
import { getAllAssignmentsByStudent } from '../../api/assignments'
import PlusIcon from '../../components/PlusIcon'
import TargetIcon from '../../components/TargetIcon'

// One child's entraînements — every one ever created for them, whether or
// not its one-time évaluation has already been used (see
// getAllAssignmentsByStudent), since practice itself never expires.
export default function StudentTrainingListPage() {
  const { studentId } = useParams()
  const [studentName, setStudentName] = useState(null)
  const [hasSiblings, setHasSiblings] = useState(false)
  const [trainings, setTrainings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getMyStudents(), getAllAssignmentsByStudent(studentId)])
      .then(([students, rows]) => {
        if (cancelled) return
        const found = students.find((s) => String(s.id) === studentId)
        setStudentName(found ? found.name : 'Enfant')
        setHasSiblings(students.length > 1)
        setTrainings(rows)
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
        <Link to={hasSiblings ? '/training' : '/'}>← {hasSiblings ? 'Changer d’enfant' : 'Accueil'}</Link>
      </p>
      <div className="page-header-row">
        <h2>Entraînements{studentName ? ` — ${studentName}` : ''}</h2>
        <Link to={`/training/${studentId}/new`} className="btn btn-toggle active">
          <PlusIcon size={18} />
          Nouvel entraînement
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && !error && trainings.length === 0 && (
        <p className="empty-hint">Aucun entraînement pour l’instant.</p>
      )}

      {!loading && trainings.length > 0 && (
        <ul className="card-list">
          {trainings.map((t) => (
            <li key={t.id}>
              <Link
                to={`/series/${t.series_id}`}
                state={{ title: t.title, studentId }}
                className="card-list-item card-list-item-row"
              >
                <span className="card-list-item-title">
                  <TargetIcon size={16} />
                  {t.title}
                </span>
                <span className="card-list-meta">{t.count} mot(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
