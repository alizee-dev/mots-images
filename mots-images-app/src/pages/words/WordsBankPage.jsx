import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWords, removeWordFromBank } from '../../api/words'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import TrashIcon from '../../components/TrashIcon'

// How long a single-word delete stays undoable before the actual API call
// fires — no confirmation popup at all: the card leaves the grid right away,
// and this is the window during which "Annuler" can still cancel the request
// entirely rather than reverting an already-sent delete.
const UNDO_DELAY_MS = 6000

export default function WordsBankPage() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMessage, setBulkMessage] = useState(null)
  const [bulkError, setBulkError] = useState(null)

  // Words optimistically hidden from the grid while their undo window is
  // still open. The word itself stays in `words` until the delete actually
  // goes through, so undoing is just letting it reappear — no snapshot or
  // re-insertion bookkeeping needed.
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set())
  const pendingTimers = useRef(new Map())
  const isMountedRef = useRef(true)

  useEffect(() => {
    getWords()
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    []
  )

  const filteredWords = words.filter(
    (word) => !pendingDeleteIds.has(word.id) && word.text.toLowerCase().startsWith(search.trim().toLowerCase())
  )

  const toggleSelectionMode = () => {
    setSelectionMode((v) => !v)
    setSelectedIds(new Set())
    setBulkMessage(null)
    setBulkError(null)
  }

  const toggleSelected = (wordId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(wordId)) next.delete(wordId)
      else next.add(wordId)
      return next
    })
  }

  // No confirmation dialog: the card disappears immediately and "Annuler"
  // in the toast below is the safety net, for the length of UNDO_DELAY_MS.
  const handleDeleteWord = (word) => {
    setPendingDeleteIds((prev) => new Set(prev).add(word.id))
    const timer = setTimeout(() => {
      pendingTimers.current.delete(word.id)
      removeWordFromBank(word.id)
        .then(() => {
          if (!isMountedRef.current) return
          setWords((prev) => prev.filter((w) => w.id !== word.id))
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(word.id)
            return next
          })
        })
        .catch((err) => {
          if (!isMountedRef.current) return
          setPendingDeleteIds((prev) => {
            const next = new Set(prev)
            next.delete(word.id)
            return next
          })
          setError(err.message)
        })
    }, UNDO_DELAY_MS)
    pendingTimers.current.set(word.id, timer)
  }

  const handleUndoDelete = (wordId) => {
    const timer = pendingTimers.current.get(wordId)
    if (timer) {
      clearTimeout(timer)
      pendingTimers.current.delete(wordId)
    }
    setPendingDeleteIds((prev) => {
      const next = new Set(prev)
      next.delete(wordId)
      return next
    })
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const label = ids.length === 1 ? 'ce mot' : `ces ${ids.length} mots`
    if (
      !window.confirm(
        `Retirer ${label} de la banque de mots ? Ils n'apparaîtront plus dans ta banque ni dans les prochaines séries, mais resteront inchangés dans les séries qui les utilisent déjà. Cette action est irréversible depuis l'app.`
      )
    ) {
      return
    }
    setBulkDeleting(true)
    setBulkMessage(null)
    setBulkError(null)
    const results = await Promise.allSettled(ids.map((id) => removeWordFromBank(id)))
    const succeededIds = ids.filter((id, i) => results[i].status === 'fulfilled')
    const failedIds = ids.filter((id, i) => results[i].status === 'rejected')
    if (succeededIds.length > 0) {
      setWords((prev) => prev.filter((w) => !succeededIds.includes(w.id)))
    }
    setBulkDeleting(false)
    if (failedIds.length === 0) {
      setBulkMessage(`${succeededIds.length} mot${succeededIds.length === 1 ? '' : 's'} retiré${succeededIds.length === 1 ? '' : 's'} de la banque.`)
      setSelectionMode(false)
      setSelectedIds(new Set())
    } else {
      // Failed ids stay selected so the teacher can just hit "Supprimer" again
      // for the ones that didn't go through, instead of re-picking them.
      setSelectedIds(new Set(failedIds))
      setBulkError(
        `${succeededIds.length} mot(s) retiré(s), ${failedIds.length} ont échoué — réessaie pour les mots restés sélectionnés.`
      )
    }
  }

  const pendingWords = [...pendingDeleteIds]
    .map((id) => words.find((w) => w.id === id))
    .filter(Boolean)

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">← Accueil</Link>
      </p>
      <div className="page-header-row">
        <h2>Ma banque de mots</h2>
        {selectionMode ? (
          <div className="app-header-actions">
            <span className="selection-count">
              {selectedIds.size} sélectionné{selectedIds.size === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || bulkDeleting}
            >
              {bulkDeleting ? 'Suppression…' : `🗑️ Supprimer${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
            </button>
            <button type="button" className="btn btn-ghost" onClick={toggleSelectionMode}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="app-header-actions">
            <Link to="/words/new" className="btn btn-toggle active">
              ➕ Nouveau mot
            </Link>
            <button type="button" className="btn btn-secondary" onClick={toggleSelectionMode}>
              Sélectionner
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        className="word-input"
        placeholder="Rechercher un mot…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="form-error">{error}</p>}
      {bulkMessage && <p className="form-success">{bulkMessage}</p>}
      {bulkError && <p className="form-error">{bulkError}</p>}
      {loading && <p>Chargement…</p>}

      {pendingWords.length > 0 && (
        <div className="undo-toast-stack">
          {pendingWords.map((word) => (
            <div key={word.id} className="undo-toast">
              <span>« {word.text} » retiré</span>
              <button type="button" className="text-link-btn" onClick={() => handleUndoDelete(word.id)}>
                Annuler
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredWords.length === 0 && (
        <p className="empty-hint">
          {words.length === 0 ? 'Aucun mot dans la banque pour l’instant.' : 'Aucun mot ne correspond à cette recherche.'}
        </p>
      )}

      <ul className="card-list series-word-list">
        {filteredWords.map((word) => {
          const selected = selectedIds.has(word.id)
          return (
            <li key={word.id} className={`series-word-item word-bank-item ${selected ? 'selected' : ''}`}>
              {selectionMode ? (
                <button
                  type="button"
                  className="word-bank-card-select"
                  onClick={() => toggleSelected(word.id)}
                  aria-pressed={selected}
                >
                  <span className="word-bank-checkbox" aria-hidden="true">
                    {selected ? '✓' : ''}
                  </span>
                  <IllustratedWordPreview text={word.text} zones={word.zones} />
                </button>
              ) : (
                <>
                  <Link to={`/words/${word.id}`} className="word-bank-card-link">
                    <IllustratedWordPreview text={word.text} zones={word.zones} />
                  </Link>
                  <button
                    type="button"
                    className="icon-btn-danger word-bank-delete-btn"
                    onClick={() => handleDeleteWord(word)}
                    aria-label={`Retirer "${word.text}" de la banque de mots`}
                    title="Retirer de la banque"
                  >
                    <TrashIcon size={16} />
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
