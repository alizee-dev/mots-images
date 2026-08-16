import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createStudent, getMyStudents } from '../../api/students'

export default function StudentsListPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getMyStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const student = await createStudent(name.trim())
      setStudents((prev) => [...prev, student])
      setName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <h2>Mes élèves</h2>

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="word-input"
          placeholder="Nom de l'élève"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-toggle active" disabled={submitting}>
          ➕ Ajouter
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && students.length === 0 && <p className="empty-hint">Aucun élève pour l’instant.</p>}

      <ul className="card-list">
        {students.map((student) => (
          <li key={student.id}>
            <Link to={`/students/${student.id}`} state={{ studentName: student.name }} className="card-list-item">
              🧒 {student.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
