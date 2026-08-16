import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getMyStudents, getStudentTestSessions } from '../../api/students'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const [studentName, setStudentName] = useState(location.state?.studentName || null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const tasks = [getStudentTestSessions(studentId)]
    if (!studentName) tasks.push(getMyStudents())

    Promise.all(tasks)
      .then(([testSessions, students]) => {
        setSessions(testSessions)
        if (students) {
          const found = students.find((s) => String(s.id) === studentId)
          setStudentName(found ? found.name : 'Élève')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/students">← Mes élèves</Link>
      </p>
      <h2>{studentName || 'Élève'}</h2>
      <h3 className="page-subtitle">Historique des sessions de test</h3>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && sessions.length === 0 && <p className="empty-hint">Aucune session de test enregistrée.</p>}

      <ul className="card-list">
        {sessions.map((session) => (
          <li key={session.id ?? `${session.series_id}-${session.taken_at}`}>
            <Link
              to={`/students/${studentId}/sessions/${session.id}`}
              state={{ seriesTitle: session.title, takenAt: session.taken_at }}
              className="card-list-item card-list-item-row"
            >
              <span>📚 {session.title}</span>
              <span className="card-list-meta">{formatDate(session.taken_at)}</span>
              <span className="card-list-score">{session.total_score} pts</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
