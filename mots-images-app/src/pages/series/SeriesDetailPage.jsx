import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { archiveSeries, getSeries, getSeriesDetail, updateSeriesTitle } from '../../api/series'
import { getMyStudents } from '../../api/students'
import { assignSeriesToStudents } from '../../api/assignments'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'

export default function SeriesDetailPage() {
  const { seriesId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { fontFamily, theme, dyslexicFont } = useOutletContext()
  const fromAssignment = location.state?.fromAssignment || null

  const [title, setTitle] = useState(location.state?.title || null)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  // Passed as query params rather than router `state` when linking to a
  // word's editor — plain URL data is unambiguous and survives a refresh,
  // where state-based passing was proving unreliable to pin down.
  const fromSeriesQuery = `?fromSeriesId=${encodeURIComponent(seriesId)}&fromSeriesTitle=${encodeURIComponent(title || '')}`

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const [assigning, setAssigning] = useState(false)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [assignedOk, setAssignedOk] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const rows = await getSeriesDetail(seriesId)
        if (cancelled) return
        const sorted = [...rows].sort((a, b) => a.order - b.order)
        setWords(sorted)

        let resolvedTitle = title || rows[0]?.title || null
        if (!resolvedTitle) {
          const all = await getSeries()
          const found = all.find((s) => String(s.id) === seriesId)
          resolvedTitle = found ? found.title : 'Série'
        }
        if (!cancelled) setTitle(resolvedTitle)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId])

  const startEditTitle = () => {
    setTitleDraft(title || '')
    setEditingTitle(true)
  }

  const handleSaveTitle = async (e) => {
    e.preventDefault()
    const next = titleDraft.trim()
    if (!next) return
    setTitleSaving(true)
    setError(null)
    try {
      await updateSeriesTitle(seriesId, next)
      setTitle(next)
      setEditingTitle(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setTitleSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!window.confirm('Archiver cette série ? Elle ne sera plus visible dans "Mes séries", mais son historique reste conservé.')) {
      return
    }
    setArchiving(true)
    setError(null)
    try {
      await archiveSeries(seriesId)
      navigate('/series')
    } catch (err) {
      setError(err.message)
      setArchiving(false)
    }
  }

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
      {editingTitle ? (
        <form className="inline-form" onSubmit={handleSaveTitle}>
          <input
            type="text"
            className="word-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="btn btn-toggle active" disabled={titleSaving}>
            {titleSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditingTitle(false)}>
            Annuler
          </button>
        </form>
      ) : (
        <div className="page-header-row">
          <h2>{title || 'Série'}</h2>
          <div className="app-header-actions">
            <button type="button" className="btn btn-secondary" onClick={startEditTitle}>
              ✏️ Modifier le titre
            </button>
            <button type="button" className="btn btn-danger" onClick={handleArchive} disabled={archiving}>
              {archiving ? 'Archivage…' : '🗄️ Archiver la série'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {fromAssignment && (
        <Link
          to={`/students/${fromAssignment.studentId}/assignments/${fromAssignment.assignmentId}/test`}
          state={{ studentName: fromAssignment.studentName }}
          className="btn btn-toggle active"
        >
          🎯 Démarrer le test
        </Link>
      )}

      {!loading && words.length > 0 && (
        <>
          <h3 className="page-subtitle">Mots</h3>
          <ul className="plain-word-list">
            {words.map((word) => (
              <li key={word.id}>
                <Link to={`/words/${word.id}${fromSeriesQuery}`} className="plain-word-link">
                  {word.text}
                </Link>
              </li>
            ))}
          </ul>

          <h3 className="page-subtitle">Phrases</h3>
          <ol className="phrase-list">
            {words.map((word) => (
              <li key={word.id} className={dyslexicFont ? 'font-dys' : ''}>
                {word.sentence || <em>— pas de phrase —</em>}
              </li>
            ))}
          </ol>

          <div className="page-header-row">
            <h3 className="page-subtitle">Cartes à imprimer</h3>
            <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
              🖨️ Imprimer
            </button>
          </div>
          <ul className="card-list series-word-list print-area">
            {words.map((word) => (
              <li key={word.id} className="series-word-item">
                <Link to={`/words/${word.id}${fromSeriesQuery}`} className="word-bank-card-link">
                  <IllustratedWordPreview text={word.text} zones={word.zones} theme={theme} fontFamily={fontFamily} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

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
