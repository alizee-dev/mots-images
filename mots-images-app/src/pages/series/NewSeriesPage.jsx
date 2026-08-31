import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { addWordsToSeries, createSeries } from '../../api/series'
import { assignSeriesToStudents } from '../../api/assignments'

// Just the title — choosing words now happens on the word bank itself, in
// its "add to this entraînement" mode (see WordsBankPage), so this screen
// doesn't need to duplicate that picker anymore.
export default function NewSeriesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // An entraînement now belongs to exactly one child from the moment it's
  // created — this screen is only ever reached already scoped to one, via
  // TrainingHubPage/StudentTrainingListPage.
  const { studentId } = useParams()
  // Set when arriving from the word bank's "Créer un entraînement" bulk
  // action (see WordsBankPage) — those words are already chosen, so once
  // the série exists it goes straight to the finished entraînement instead
  // of back through word selection.
  const prefillWordIds = location.state?.prefillWordIds || null

  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleCreateTitle = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const series = await createSeries(title.trim())
      // Assigning it to this child right away is what makes it theirs, and
      // is also what spontaneously generates the pending évaluation shown
      // on their Évaluations screen — happens as soon as the entraînement
      // exists, regardless of whether words are added immediately after or
      // the parent comes back to it later.
      await assignSeriesToStudents(series.id, [studentId])

      if (prefillWordIds && prefillWordIds.length > 0) {
        await addWordsToSeries(series.id, prefillWordIds)
        navigate(`/series/${series.id}`, { state: { title: title.trim(), studentId } })
        return
      }

      navigate(`/words?forSeries=${series.id}&seriesTitle=${encodeURIComponent(title.trim())}&studentId=${studentId}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to={`/training/${studentId}`}>← Entraînements</Link>
      </p>
      <h2>Nouvel entraînement</h2>
      <form className="word-create-form" onSubmit={handleCreateTitle}>
        <label htmlFor="series-title" className="word-input-label">
          Titre de l’entraînement
        </label>
        <input
          id="series-title"
          type="text"
          className="word-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-toggle active" disabled={submitting}>
          {submitting ? 'Création…' : prefillWordIds ? 'Créer' : 'Créer et choisir les mots'}
        </button>
      </form>
    </div>
  )
}
