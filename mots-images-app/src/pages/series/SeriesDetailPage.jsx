import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  addWordsToSeries,
  archiveSeries,
  getSeries,
  getSeriesDetail,
  removeWordFromSeries,
  updateSeriesTitle,
  updateSeriesWordsOrder,
} from '../../api/series'
import { getMyStudents, getStudentTestSessions } from '../../api/students'
import { assignSeriesToStudents, getPendingAssignments } from '../../api/assignments'
import { createWord, updateWord } from '../../api/words'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import TrashIcon from '../../components/TrashIcon'
import EditIcon from '../../components/EditIcon'

export default function SeriesDetailPage() {
  const { seriesId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
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
  // Students who already have this series, whether pending or already
  // completed — the backend rejects re-assigning them (409, unique per
  // series+student), so they're shown greyed out instead of only being
  // caught after a failed submit.
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState(() => new Set())
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [assignSuccessMessage, setAssignSuccessMessage] = useState(null)

  // A series is either being assigned or being edited, never both — editing
  // covers the title, the word list (add/remove/reorder), and each word's
  // phrase, all persisted immediately as they change, no separate "save".
  const [editing, setEditing] = useState(false)
  const [addWordFormOpen, setAddWordFormOpen] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [removingWordId, setRemovingWordId] = useState(null)
  const [quickWordText, setQuickWordText] = useState('')
  const [quickWordSubmitting, setQuickWordSubmitting] = useState(false)

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
    if (!window.confirm(`Supprimer définitivement la série « ${title || 'cette série'} » ? Cette action est irréversible.`)) {
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
    setAssignSuccessMessage(null)
    setStudentsLoading(true)
    getMyStudents()
      .then(async (list) => {
        setStudents(list)
        // No dedicated "who already has this series" endpoint exists, so this
        // is inferred from what's already available: a pending assignment for
        // this series, or a completed test session for it — either one means
        // the backend's unique (series, student) constraint would reject a
        // new assignment.
        const flags = await Promise.all(
          list.map((student) =>
            Promise.all([getPendingAssignments(student.id), getStudentTestSessions(student.id)])
              .then(([pending, sessions]) => {
                const has =
                  pending.some((a) => String(a.series_id) === String(seriesId)) ||
                  sessions.some((s) => String(s.series_id) === String(seriesId))
                return has ? student.id : null
              })
              .catch(() => null)
          )
        )
        setAlreadyAssignedIds(new Set(flags.filter((id) => id !== null)))
      })
      .catch((err) => setError(err.message))
      .finally(() => setStudentsLoading(false))
  }

  const toggleStudent = (id) => {
    if (alreadyAssignedIds.has(id)) return
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const count = selectedStudentIds.length
      await assignSeriesToStudents(seriesId, selectedStudentIds)
      // Once it's done there's nothing left to do in this panel — closing it
      // automatically leaves just the series showing, instead of the picker
      // sitting there with everyone now greyed out.
      setAssigning(false)
      setSelectedStudentIds([])
      setAssignSuccessMessage(`Série assignée à ${count} élève${count === 1 ? '' : 's'} ✓`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEditing = () => {
    setEditing((v) => !v)
    setEditingTitle(false)
    setAddWordFormOpen(false)
    setQuickWordText('')
  }

  const moveWord = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= words.length) return
    const previous = words
    const next = [...words]
    ;[next[index], next[target]] = [next[target], next[index]]
    setWords(next)
    setReordering(true)
    setError(null)
    try {
      await updateSeriesWordsOrder(
        seriesId,
        next.map((w, i) => ({ wordId: w.id, newOrder: i }))
      )
    } catch (err) {
      setWords(previous)
      setError(err.message)
    } finally {
      setReordering(false)
    }
  }

  const handleRemoveWord = async (word) => {
    if (!window.confirm(`Retirer « ${word.text} » de cette série ?`)) return
    setRemovingWordId(word.id)
    setError(null)
    try {
      await removeWordFromSeries(seriesId, word.id)
      setWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingWordId(null)
    }
  }

  const updateWordSentenceDraft = (wordId, sentence) => {
    setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, sentence } : w)))
  }

  const saveWordSentence = async (word) => {
    try {
      await updateWord(word.id, word.sentence || '', word.zones || [])
    } catch (err) {
      setError(err.message)
    }
  }

  // Adds a brand-new, plain word (no illustration) straight into this
  // series — for illustrating it afterward, the word link in the edit list
  // below (or its card at the bottom) opens the usual word editor.
  const handleQuickAddWord = async (e) => {
    e.preventDefault()
    const text = quickWordText.trim()
    if (!text) return
    setQuickWordSubmitting(true)
    setError(null)
    try {
      const word = await createWord(text, '')
      await addWordsToSeries(seriesId, [word.id])
      setWords((prev) => [...prev, { ...word, order: prev.length }])
      setQuickWordText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setQuickWordSubmitting(false)
    }
  }

  return (
    <div className="page">
      {fromAssignment ? (
        <p className="breadcrumb">
          <Link to={`/students/${fromAssignment.studentId}`} state={{ studentName: fromAssignment.studentName }}>
            ← Retour à la fiche élève
          </Link>
        </p>
      ) : (
        <p className="breadcrumb">
          <Link to="/series">← Mes séries</Link>
        </p>
      )}
      {/* Reached from a student's "À faire" list: this is a to-do to work
          through, not a series to manage — so only the title and starting
          the test show. The title-edit / archive / assign / edit tools stay
          reserved for the "Mes séries" management view. */}
      {editingTitle && !fromAssignment ? (
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
          <div className="series-title-row">
            <h2>{title || 'Série'}</h2>
            {editing && !fromAssignment && (
              <button
                type="button"
                className="icon-btn-edit"
                onClick={startEditTitle}
                aria-label="Modifier le titre"
                title="Modifier le titre"
              >
                <EditIcon />
              </button>
            )}
          </div>
          <div className="app-header-actions">
            {fromAssignment && (
              <Link
                to={`/students/${fromAssignment.studentId}/assignments/${fromAssignment.assignmentId}/test`}
                state={{ studentName: fromAssignment.studentName }}
                className="btn btn-toggle active"
              >
                🎯 Démarrer le test
              </Link>
            )}
            {!fromAssignment && !assigning && !editing && (
              <button type="button" className="btn btn-toggle active" onClick={openAssign}>
                🧒 Assigner à des élèves
              </button>
            )}
            {!fromAssignment && !assigning && (
              <button type="button" className="btn btn-secondary" onClick={toggleEditing}>
                {editing ? '✔️ Terminer' : '✏️ Éditer'}
              </button>
            )}
            {!fromAssignment && (
              <button
                type="button"
                className="icon-btn-danger"
                onClick={handleArchive}
                disabled={archiving}
                aria-label={`Supprimer définitivement la série "${title || ''}"`}
                title="Supprimer définitivement"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {assignSuccessMessage && <p className="form-success">{assignSuccessMessage}</p>}
      {loading && <p>Chargement…</p>}

      {!fromAssignment && assigning && (
        <div className="assign-panel">
          <h3>Choisir les élèves</h3>
          {studentsLoading && <p>Chargement…</p>}
          {!studentsLoading && students.length === 0 && (
            <p className="empty-hint">Aucun élève enregistré pour l’instant.</p>
          )}
          <ul className="picker-list">
            {students.map((student) => {
              const already = alreadyAssignedIds.has(student.id)
              return (
                <li key={student.id}>
                  <label className={`checkbox-row ${already ? 'checkbox-row-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={already || selectedStudentIds.includes(student.id)}
                      disabled={already}
                      onChange={() => toggleStudent(student.id)}
                    />
                    {student.name}
                    {already && <span className="checkbox-row-note">déjà assigné</span>}
                  </label>
                </li>
              )
            })}
          </ul>

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

      {!loading && !editing && words.length > 0 && (
        <>
          <h3 className="page-subtitle">Mots</h3>
          <p className="word-chain">
            {words.map((word, i) => (
              <span key={word.id}>
                <Link to={`/words/${word.id}${fromSeriesQuery}`} className="plain-word-link">
                  {word.text}
                </Link>
                {i < words.length - 1 && <span className="word-chain-sep"> • </span>}
              </span>
            ))}
          </p>

          <h3 className="page-subtitle">Phrases</h3>
          <ol className="phrase-list">
            {words.map((word) => (
              <li key={word.id} className="font-dys">
                {word.sentence || <em>— pas de phrase —</em>}
              </li>
            ))}
          </ol>
        </>
      )}

      {!loading && !editing && words.length === 0 && !fromAssignment && (
        <p className="empty-hint">Cette série ne contient aucun mot pour l’instant.</p>
      )}

      {!loading && editing && !fromAssignment && (
        <>
          <div className="word-chain-edit-wrap">
            <p className="word-chain">
              {words.length === 0 ? (
                <span className="word-chain-empty">Aucun mot pour l’instant — utilise le stylet pour en ajouter.</span>
              ) : (
                words.map((word, i) => (
                  <span key={word.id}>
                    <Link to={`/words/${word.id}${fromSeriesQuery}`} className="plain-word-link">
                      {word.text}
                    </Link>
                    {i < words.length - 1 && <span className="word-chain-sep"> • </span>}
                  </span>
                ))
              )}
            </p>
            <button
              type="button"
              className="icon-btn-edit word-chain-edit-btn"
              onClick={() => setAddWordFormOpen((v) => !v)}
              aria-label="Ajouter des mots"
              title="Ajouter des mots"
            >
              <EditIcon />
            </button>
          </div>

          {addWordFormOpen && (
            <form className="inline-form" onSubmit={handleQuickAddWord}>
              <input
                type="text"
                className="word-input"
                placeholder="Nouveau mot (ex : poisson)"
                value={quickWordText}
                onChange={(e) => setQuickWordText(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-secondary" disabled={quickWordSubmitting}>
                {quickWordSubmitting ? 'Ajout…' : '➕ Ajouter'}
              </button>
            </form>
          )}

          {words.length > 0 && (
            <ul className="series-edit-list">
              {words.map((word, i) => (
                <li key={word.id} className="series-edit-row">
                  <span className="series-edit-order">
                    <button
                      type="button"
                      className="btn btn-chip"
                      onClick={() => moveWord(i, -1)}
                      disabled={i === 0 || reordering}
                      aria-label={`Monter "${word.text}"`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-chip"
                      onClick={() => moveWord(i, 1)}
                      disabled={i === words.length - 1 || reordering}
                      aria-label={`Descendre "${word.text}"`}
                    >
                      ↓
                    </button>
                  </span>
                  <Link to={`/words/${word.id}${fromSeriesQuery}`} className="series-edit-word-link">
                    {word.text}
                  </Link>
                  <input
                    type="text"
                    className="series-edit-sentence-input"
                    placeholder="ex : La ___ est posée sur la table."
                    value={word.sentence || ''}
                    onChange={(e) => updateWordSentenceDraft(word.id, e.target.value)}
                    onBlur={() => saveWordSentence(word)}
                  />
                  <button
                    type="button"
                    className="icon-btn-danger"
                    onClick={() => handleRemoveWord(word)}
                    disabled={removingWordId === word.id}
                    aria-label={`Retirer "${word.text}" de la série`}
                    title="Retirer de la série"
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!loading && words.length > 0 && (
        <>
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
                  <IllustratedWordPreview text={word.text} zones={word.zones} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
