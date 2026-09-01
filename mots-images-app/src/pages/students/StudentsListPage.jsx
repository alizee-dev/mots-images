import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createStudent, getMyStudents } from '../../api/students'
import ChildIcon from '../../components/ChildIcon'
import PlusIcon from '../../components/PlusIcon'
import StudentProgression from '../../components/StudentProgression'

export default function StudentsListPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // The name field only appears once the discreet "+" next to the title is
  // tapped — matching the same reveal-a-form pattern used for editing an
  // entraînement's title elsewhere, rather than sitting open at all times.
  const [addingChild, setAddingChild] = useState(false)

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
      setAddingChild(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const onlyChild = students.length === 1 ? students[0] : null

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">← Accueil</Link>
      </p>
      <div className="page-header-row">
        <h2>Enfants</h2>
        {!addingChild && (
          <button
            type="button"
            className="icon-btn-edit"
            onClick={() => setAddingChild(true)}
            aria-label="Ajouter un enfant"
            title="Ajouter un enfant"
          >
            <PlusIcon size={18} />
          </button>
        )}
      </div>

      {addingChild && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="word-input"
            placeholder="Nom de l'enfant"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="btn btn-toggle active" disabled={submitting}>
            {submitting ? 'Ajout…' : 'Ajouter'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setAddingChild(false)
              setName('')
            }}
          >
            Annuler
          </button>
        </form>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && !error && students.length === 0 && <p className="empty-hint">Aucun enfant pour l’instant.</p>}

      {onlyChild ? (
        // Same shortcut as Entraînements/Évaluations: with a single child,
        // there's no real choice to make, so their data shows right here
        // instead of behind an extra click into a one-item picker.
        <>
          <div className="page-header-row">
            <h3>{onlyChild.name}</h3>
            <Link to={`/training/${onlyChild.id}`} className="btn btn-secondary">
              Voir ses entraînements →
            </Link>
          </div>
          <StudentProgression studentId={String(onlyChild.id)} studentName={onlyChild.name} />
        </>
      ) : (
        students.length > 1 && (
          // Same badge-card presentation as the Entraînements/Évaluations
          // child pickers — one consistent way a child is shown anywhere in
          // the app, rather than a plain list here and cards elsewhere.
          <div className="student-picker">
            {students.map((student) => (
              <Link
                key={student.id}
                to={`/students/${student.id}`}
                state={{ studentName: student.name }}
                className="student-picker-item"
              >
                <span className="student-picker-badge">
                  <ChildIcon size={28} />
                </span>
                <span className="student-picker-name">{student.name}</span>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
