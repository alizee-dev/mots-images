import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { getSeries } from '../../api/series'
import { getMyStudents } from '../../api/students'
import { assignSeriesToStudents } from '../../api/assignments'

export default function SeriesDetailPage() {
  const { seriesId } = useParams()
  const location = useLocation()
  const [title, setTitle] = useState(location.state?.title || null)
  const [count, setCount] = useState(null)

  const [assigning, setAssigning] = useState(false)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [assignedOk, setAssignedOk] = useState(false)

  useEffect(() => {
    if (title) return
    getSeries()
      .then((all) => {
        const found = all.find((s) => String(s.id) === seriesId)
        if (found) {
          setTitle(found.title)
          setCount(found.count)
        }
      })
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId])

  const openAssign = () => {
    setAssigning(true)
    setAssignedOk(false)
    setStudentsLoading(true)
    getMyStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setStudentsLoading(false))
  }

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await assignSeriesToStudents(seriesId, selectedStudentIds)
      setAssignedOk(true)
      setSelectedStudentIds([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h2>{title || 'Série'}</h2>
      {count !== null && <p className="page-subtitle">{count} mot(s)</p>}

      {error && <p className="form-error">{error}</p>}

      {!assigning && (
        <button type="button" className="btn btn-toggle active" onClick={openAssign}>
          🧒 Assigner à des élèves
        </button>
      )}

      {assigning && (
        <div className="assign-panel">
          <h3>Choisir les élèves</h3>
          {studentsLoading && <p>Chargement…</p>}
          {!studentsLoading && students.length === 0 && (
            <p className="empty-hint">Aucun élève enregistré pour l’instant.</p>
          )}
          <ul className="picker-list">
            {students.map((student) => (
              <li key={student.id}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  {student.name}
                </label>
              </li>
            ))}
          </ul>

          {assignedOk && <p className="form-success">Série assignée ✓</p>}

          <div className="app-header-actions">
            <button
              type="button"
              className="btn btn-toggle active"
              onClick={handleAssign}
              disabled={submitting || selectedStudentIds.length === 0}
            >
              {submitting ? 'Assignation…' : 'Valider'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAssigning(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
