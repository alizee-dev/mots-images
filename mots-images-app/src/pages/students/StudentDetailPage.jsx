import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getMyStudents, getStudentTestSessions } from '../../api/students'
import { getPendingAssignments } from '../../api/assignments'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const [studentName, setStudentName] = useState(location.state?.studentName || null)
  const [sessions, setSessions] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      getStudentTestSessions(studentId),
      getPendingAssignments(studentId),
      studentName ? Promise.resolve(null) : getMyStudents(),
    ])
      .then(([testSessions, pendingAssignments, students]) => {
        setSessions(testSessions)
        setPending(pendingAssignments)
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
      <div className="page-header-row">
        <h2>{studentName || 'Élève'}</h2>
        <Link to="/series/new" className="btn btn-toggle active">
          ➕ Créer une série
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && (
        <>
          {pending.length > 0 && (
            <>
              <h3 className="page-subtitle">À faire</h3>
              <ul className="card-list">
                {pending.map((assignment) => (
                  <li key={assignment.id}>
                    <Link
                      to={`/series/${assignment.series_id}`}
                      state={{
                        title: assignment.title,
                        fromAssignment: { assignmentId: assignment.id, studentId, studentName },
                      }}
                      className="card-list-item card-list-item-row"
                    >
                      <span>📌 {assignment.title}</span>
                      <span className="card-list-meta">{assignment.count} mot(s)</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {sessions.length > 0 && (
            <>
              <h3 className="page-subtitle">Historique des sessions de test</h3>
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
            </>
          )}
        </>
      )}
    </div>
  )
}
