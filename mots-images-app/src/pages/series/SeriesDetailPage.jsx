import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getSeries, getSeriesDetail, removeWordFromSeries, updateSeriesTitle } from '../../api/series'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import PrintWordsButton from '../../components/PrintWordsButton'
import TrashIcon from '../../components/TrashIcon'
import EditIcon from '../../components/EditIcon'
import TargetIcon from '../../components/TargetIcon'
import StarIcon from '../../components/StarIcon'
import PlusIcon from '../../components/PlusIcon'
import EvaluationIcon from '../../components/EvaluationIcon'

export default function SeriesDetailPage() {
  const { seriesId } = useParams()
  const location = useLocation()
  const fromAssignment = location.state?.fromAssignment || null
  const studentId = location.state?.studentId || null

  const [title, setTitle] = useState(location.state?.title || null)
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Passed as query params rather than router `state` when linking to a
  // word's editor — plain URL data is unambiguous and survives a refresh,
  // where state-based passing was proving unreliable to pin down.
  const fromSeriesQuery = `?fromSeriesId=${encodeURIComponent(seriesId)}&fromSeriesTitle=${encodeURIComponent(title || '')}`
  // Adding words is a whole screen of its own now (the word bank, in "add
  // to this entraînement" mode — see WordsBankPage), not an inline panel
  // here, so it can offer the exact same browsing/search/illustrate
  // experience as the bank itself rather than a second, smaller version of
  // it. studentId is carried along only for that screen's own breadcrumb.
  const addWordsUrl = `/words?forSeries=${encodeURIComponent(seriesId)}&seriesTitle=${encodeURIComponent(title || '')}${
    studentId ? `&studentId=${encodeURIComponent(studentId)}` : ''
  }`

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)

  // One pencil toggles both: while on, the "Ajouter des mots" link appears
  // (see addWordsUrl above) and every thumbnail gets a remove icon —
  // rather than a permanent "Ajouter des mots" button sitting next to the
  // pencil at all times.
  const [editingWords, setEditingWords] = useState(false)
  // A word disappears from the grid the instant its trash icon is tapped —
  // no popup interrupting the flow — with a few seconds to undo via a
  // toast, the same soft pattern already used for deleting a word from the
  // bank entirely (see WordsBankPage's handleDeleteWord).
  const [pendingRemoveIds, setPendingRemoveIds] = useState(() => new Set())
  const removeTimers = useRef(new Map())

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
          resolvedTitle = found ? found.title : 'Entraînement'
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

  const REMOVE_UNDO_DELAY_MS = 6000

  // No confirmation dialog: the card leaves the grid immediately, and
  // "Annuler" in the toast below is the safety net for the length of
  // REMOVE_UNDO_DELAY_MS, instead of a native popup interrupting the flow
  // for what's usually a quick correction while curating an entraînement.
  const handleRemoveWord = (word) => {
    setPendingRemoveIds((prev) => new Set(prev).add(word.id))
    const timer = setTimeout(() => {
      removeTimers.current.delete(word.id)
      removeWordFromSeries(seriesId, word.id)
        .then(() => {
          setWords((prev) => prev.filter((w) => w.id !== word.id))
          setPendingRemoveIds((prev) => {
            const next = new Set(prev)
            next.delete(word.id)
            return next
          })
        })
        .catch((err) => {
          setPendingRemoveIds((prev) => {
            const next = new Set(prev)
            next.delete(word.id)
            return next
          })
          setError(err.message)
        })
    }, REMOVE_UNDO_DELAY_MS)
    removeTimers.current.set(word.id, timer)
  }

  const handleUndoRemoveWord = (wordId) => {
    const timer = removeTimers.current.get(wordId)
    if (timer) {
      clearTimeout(timer)
      removeTimers.current.delete(wordId)
    }
    setPendingRemoveIds((prev) => {
      const next = new Set(prev)
      next.delete(wordId)
      return next
    })
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
          <Link to={studentId ? `/training/${studentId}` : '/training'}>← Entraînements</Link>
        </p>
      )}
      {/* Reached from a student's "À faire" list: this is a to-do to work
          through, not an entraînement to manage — so only the title and
          starting the test show. The title-edit / add-words tools stay
          reserved for the "Entraînements" management view. */}
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
            <h2>{title || 'Entraînement'}</h2>
            {!fromAssignment && (
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
          {fromAssignment && (
            <div className="app-header-actions">
              <Link
                to={`/students/${fromAssignment.studentId}/assignments/${fromAssignment.assignmentId}/test`}
                state={{ studentName: fromAssignment.studentName }}
                className="btn btn-toggle active"
              >
                <EvaluationIcon size={18} />
                Démarrer le test
              </Link>
            </div>
          )}
        </div>
      )}

      {!fromAssignment && !loading && words.length > 0 && (
        <div className="practice-entry-row">
          <Link to={`/series/${seriesId}/practice`} className="btn btn-toggle active practice-start-btn">
            <TargetIcon size={18} />
            Commencer l’entraînement
          </Link>
          <div className="practice-level-links">
            <span className="practice-level-links-label">Ou</span>
            <Link to={`/series/${seriesId}/practice?level=1`} className="practice-level-chip">
              <StarIcon size={16} />1
            </Link>
            <Link to={`/series/${seriesId}/practice?level=2`} className="practice-level-chip">
              <StarIcon size={16} />2
            </Link>
            <Link to={`/series/${seriesId}/practice?level=3`} className="practice-level-chip">
              <StarIcon size={16} />3
            </Link>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && words.length === 0 && !fromAssignment && (
        <p className="empty-hint">Cet entraînement ne contient aucun mot pour l’instant.</p>
      )}

      {!loading && (words.length > 0 || !fromAssignment) && (
        <>
          <div className="page-header-row">
            <h3>Mots</h3>
            {!fromAssignment && (
              <div className="app-header-actions">
                <PrintWordsButton words={words} />
                <button
                  type="button"
                  className="icon-btn-edit"
                  onClick={() => setEditingWords((v) => !v)}
                  aria-label={editingWords ? 'Terminer' : 'Ajouter ou retirer des mots'}
                  title={editingWords ? 'Terminer' : 'Ajouter ou retirer des mots'}
                >
                  <EditIcon />
                </button>
              </div>
            )}
          </div>

          {editingWords && !fromAssignment && (
            <Link to={addWordsUrl} className="btn btn-secondary">
              <PlusIcon size={18} />
              Ajouter des mots
            </Link>
          )}

          {pendingRemoveIds.size > 0 && (
            <div className="undo-toast-stack">
              {words
                .filter((w) => pendingRemoveIds.has(w.id))
                .map((word) => (
                  <div key={word.id} className="undo-toast">
                    <span>« {word.text} » retiré</span>
                    <button type="button" className="text-link-btn" onClick={() => handleUndoRemoveWord(word.id)}>
                      Annuler
                    </button>
                  </div>
                ))}
            </div>
          )}

          {words.length > 0 && (
            <ul className="card-list series-word-list">
              {words
                .filter((word) => !pendingRemoveIds.has(word.id))
                .map((word) => (
                  <li key={word.id} className="series-word-item">
                    <Link to={`/words/${word.id}${fromSeriesQuery}`} className="word-bank-card-link">
                      <IllustratedWordPreview text={word.text} zones={word.zones} />
                    </Link>
                    {editingWords && (
                      <button
                        type="button"
                        className="icon-btn-danger word-bank-delete-btn"
                        onClick={() => handleRemoveWord(word)}
                        aria-label={`Retirer "${word.text}" de cet entraînement`}
                        title="Retirer de l’entraînement"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
