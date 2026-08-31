import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createStudent, getMyStudents } from '../api/students'
import mascotNeutral from '../assets/mascots/mascotte_neutre.png'
import PlusIcon from '../components/PlusIcon'

// The dashboard used to stack three overlapping ways to reach the same
// handful of destinations (a header button, two hero buttons, a row of
// tiles) — all of that navigation now lives in one place, the header's
// icon nav band (see Layout/.app-nav). This screen keeps a single job: a
// warm, low-text landing moment (the mascotte + a short greeting) plus the
// one action a parent comes back to most — illustrating a new word. With
// no child added yet, that greeting becomes the invitation to add one —
// entraînements now belong to a specific child, so there's nothing useful
// to do anywhere else in the app until at least one exists.
export default function DashboardPage() {
  // null while the first fetch is in flight, an array once it resolves —
  // needed both for the greeting and to tell "no child yet" apart from "the
  // request failed", which must never be presented as the same thing (a
  // connectivity error is not "you have no children").
  const [students, setStudents] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [childName, setChildName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    getMyStudents()
      .then(setStudents)
      .catch(() => setLoadError(true))
  }, [])

  const handleCreateChild = async (e) => {
    e.preventDefault()
    const name = childName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const student = await createStudent(name)
      setStudents((prev) => [...(prev || []), student])
      setChildName('')
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const hasNoChildren = !loadError && students !== null && students.length === 0
  const firstChildName = students?.[0]?.name

  const message = hasNoChildren
    ? 'Commençons par ajouter ton premier enfant !'
    : firstChildName
      ? `L’entraînement de ${firstChildName} t’attend !`
      : 'Par quoi on commence aujourd’hui ?'

  return (
    <div className="dashboard">
      <h2>Tableau de bord</h2>

      <div className="dashboard-mascot-block">
        <div className="dashboard-mascot-glow" aria-hidden="true" />
        <img src={mascotNeutral} alt="" className="dashboard-mascot" />
        <div className="dashboard-mascot-bubble">
          <p className="dashboard-mascot-message">{message}</p>
        </div>

        {hasNoChildren ? (
          <form className="inline-form" onSubmit={handleCreateChild}>
            <input
              type="text"
              className="word-input"
              placeholder="Prénom de l’enfant"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-toggle active" disabled={creating}>
              {creating ? (
                'Ajout…'
              ) : (
                <>
                  <PlusIcon size={18} />
                  Ajouter
                </>
              )}
            </button>
          </form>
        ) : (
          <Link to="/words/new" className="btn btn-toggle active dashboard-cta">
            ✨ Illustrer un mot
          </Link>
        )}
        {createError && <p className="form-error">{createError}</p>}
      </div>
    </div>
  )
}
