import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createWord, getWords, removeWordFromBank, submitWordForCommonBank } from '../../api/words'
import { addWordsToSeries } from '../../api/series'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import PrintWordsButton from '../../components/PrintWordsButton'
import TrashIcon from '../../components/TrashIcon'
import TargetIcon from '../../components/TargetIcon'
import CheckIcon from '../../components/CheckIcon'

// How long a single-word delete stays undoable before the actual API call
// fires — no confirmation popup at all: the card leaves the grid right away,
// and this is the window during which "Annuler" can still cancel the request
// entirely rather than reverting an already-sent delete.
const UNDO_DELAY_MS = 6000
// How long a bulk-action status message (success or error) stays on screen
// before clearing itself — unlike the per-word undo toasts above, this is
// just a status line, not something with its own action window, so it isn't
// meant to linger indefinitely.
const BULK_MESSAGE_DELAY_MS = 5000

const PAGE_SIZE = 20

// A "windowed" page list — first page, last page, and a small run around
// the current one — rather than one button per page, which would get
// unwieldy once the bank grows past a handful of pages.
function getPageNumbers(current, total) {
  const pages = [1]
  for (let n = current - 1; n <= current + 1; n++) {
    if (n > 1 && n < total) pages.push(n)
  }
  if (total > 1) pages.push(total)
  return [...new Set(pages)].sort((a, b) => a - b)
}

// Reached two ways: as the plain word bank (`/words`), or — when
// `forSeries` is in the URL — as the "add words to this entraînement"
// screen (see SeriesDetailPage's "Ajouter des mots" and NewSeriesPage),
// so a parent gets the exact same browsing/search/illustrate experience
// either way instead of a second, smaller picker duplicating this one.
export default function WordsBankPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const forSeriesId = searchParams.get('forSeries')
  const forSeriesTitle = searchParams.get('seriesTitle') || ''
  const forStudentId = searchParams.get('studentId') || ''
  const addMode = Boolean(forSeriesId)

  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [illustrating, setIllustrating] = useState(false)
  // 'mine' → GET /words (the parent's own bank). 'all' → GET
  // /words?includeCommonWords=true, adding words shared by other teachers.
  const [scope, setScope] = useState('mine')

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMessage, setBulkMessage] = useState(null)
  const [bulkError, setBulkError] = useState(null)

  // addMode's own lightweight tap-to-add state — no bulk confirm step, a
  // tap adds the word right away and marks it added.
  const [addedIds, setAddedIds] = useState(() => new Set())
  const [addingId, setAddingId] = useState(null)

  // Tracked locally in addition to word.status, in case the list endpoint
  // doesn't actually echo the freshly-set status back on the very word
  // just submitted — this guarantees the badge shows immediately either
  // way, for the rest of this visit.
  const [proposedIds, setProposedIds] = useState(() => new Set())
  const [proposingId, setProposingId] = useState(null)

  // Words optimistically hidden from the grid while their undo window is
  // still open. The word itself stays in `words` until the delete actually
  // goes through, so undoing is just letting it reappear — no snapshot or
  // re-insertion bookkeeping needed.
  const [pendingDeleteIds, setPendingDeleteIds] = useState(() => new Set())
  const pendingTimers = useRef(new Map())
  const isMountedRef = useRef(true)

  const loadWords = useCallback(() => {
    setLoading(true)
    setError(null)
    return getWords({ includeCommonWords: scope === 'all' })
      .then((list) => {
        setWords([...list].sort((a, b) => a.text.localeCompare(b.text, 'fr')))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [scope])

  useEffect(() => {
    loadWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    []
  )

  // A bulk-action status message is just a status line, not an action
  // window like the undo toasts below — it clears itself instead of piling
  // up on screen if several bulk actions happen one after another.
  useEffect(() => {
    if (!bulkMessage && !bulkError) return
    const timer = setTimeout(() => {
      setBulkMessage(null)
      setBulkError(null)
    }, BULK_MESSAGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [bulkMessage, bulkError])

  const filteredWords = words.filter(
    (word) => !pendingDeleteIds.has(word.id) && word.text.toLowerCase().startsWith(search.trim().toLowerCase())
  )

  // A new search or a scope switch changes what's being paged through, so
  // it should start back at page 1 rather than possibly landing on a now
  // out-of-range page.
  useEffect(() => {
    setPage(1)
  }, [search, scope])

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE))
  // Clamped rather than reset via an effect — covers a word being deleted
  // out from under the current last page just as well, without needing a
  // second effect keyed on the word count.
  const safePage = Math.min(page, totalPages)
  const pageWords = filteredWords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageNumbers = getPageNumbers(safePage, totalPages)

  // The search field doubles as "the word to illustrate" — the button next
  // to it acts on whatever's currently typed there, creating the word and
  // taking the parent straight to the letter-picking step (see WordEditorPage's
  // autoAi query param), instead of retyping the same word on a second
  // screen. An empty field just opens a blank "Illustrer un mot" form. In
  // addMode, the new word is also added to the entraînement right away, and
  // fromSeriesId/fromSeriesTitle tag along so the editor's own breadcrumb
  // brings the parent back here once they're done illustrating it.
  const handleIllustrateClick = async () => {
    const text = search.trim()
    if (!text) {
      navigate(
        addMode
          ? `/words/new?fromSeriesId=${encodeURIComponent(forSeriesId)}&fromSeriesTitle=${encodeURIComponent(forSeriesTitle)}`
          : '/words/new'
      )
      return
    }
    setIllustrating(true)
    setError(null)
    try {
      const word = await createWord(text, '')
      if (addMode) {
        await addWordsToSeries(forSeriesId, [word.id]).catch(() => {})
      }
      const params = new URLSearchParams({ autoAi: '1' })
      if (addMode) {
        params.set('fromSeriesId', forSeriesId)
        if (forSeriesTitle) params.set('fromSeriesTitle', forSeriesTitle)
      }
      navigate(`/words/${word.id}?${params.toString()}`)
    } catch (err) {
      setError(err.message)
      setIllustrating(false)
    }
  }

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

  const handleAddToSeries = async (word) => {
    if (addingId || addedIds.has(word.id)) return
    setAddingId(word.id)
    setError(null)
    try {
      await addWordsToSeries(forSeriesId, [word.id])
      setAddedIds((prev) => new Set(prev).add(word.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingId(null)
    }
  }

  const handleProposeToCommonBank = async (word) => {
    if (proposingId || proposedIds.has(word.id)) return
    setProposingId(word.id)
    setError(null)
    try {
      await submitWordForCommonBank(word.id)
      setProposedIds((prev) => new Set(prev).add(word.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setProposingId(null)
    }
  }

  // Clicking anywhere that isn't itself an interactive control (a card, a
  // button, the search field, the print dialog…) exits selection mode —
  // a quick way out besides hunting down the "Annuler" button. Checking
  // what the click actually landed on/inside, rather than only the exact
  // background element, means this works for a click on any bit of plain
  // page background — the gaps around the header, the empty space past the
  // last card — not just one specific container.
  const handlePageClick = (e) => {
    if (!selectionMode) return
    if (e.target.closest('button, a, input, label, [role="dialog"]')) return
    toggleSelectionMode()
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
        `Retirer ${label} de la banque de mots ? Ils n'apparaîtront plus dans ta banque ni dans les prochains entraînements, mais resteront inchangés dans les entraînements qui les utilisent déjà. Cette action est irréversible depuis l'app.`
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
      // Failed ids stay selected so the parent can just hit "Supprimer" again
      // for the ones that didn't go through, instead of re-picking them.
      setSelectedIds(new Set(failedIds))
      setBulkError(
        `${succeededIds.length} mot(s) retiré(s), ${failedIds.length} ont échoué — réessaie pour les mots restés sélectionnés.`
      )
    }
  }

  const selectedWords = words.filter((w) => selectedIds.has(w.id))

  const handleCreateSeriesFromSelection = () => {
    // An entraînement now belongs to a specific child from the moment it's
    // created — this hands off to TrainingHubPage, which resolves (or asks)
    // which one before landing on the actual creation screen, carrying
    // this selection along the whole way.
    navigate('/training', { state: { prefillWordIds: [...selectedIds] } })
  }

  const pendingWords = [...pendingDeleteIds]
    .map((id) => words.find((w) => w.id === id))
    .filter(Boolean)

  const seriesLink = `/series/${forSeriesId}`
  const seriesLinkState = { title: forSeriesTitle, studentId: forStudentId || undefined }

  return (
    <div className="page" onClick={handlePageClick}>
      {addMode ? (
        <>
          <p className="breadcrumb">
            <Link to={seriesLink} state={seriesLinkState}>
              ← {forSeriesTitle ? `« ${forSeriesTitle} »` : 'Entraînement'}
            </Link>
          </p>
          <div className="page-header-row">
            <h2>Ajouter des mots{forSeriesTitle ? ` à « ${forSeriesTitle} »` : ''}</h2>
            <Link to={seriesLink} state={seriesLinkState} className="btn btn-toggle active">
              <CheckIcon size={18} />
              Terminé
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="breadcrumb">
            <Link to="/">← Accueil</Link>
          </p>
          <div className="page-header-row">
            <h2>Ma banque de mots</h2>
          </div>
        </>
      )}

      <div className="inline-form">
        <input
          type="text"
          className="word-input"
          placeholder="Rechercher ou illustrer un mot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn btn-toggle active" onClick={handleIllustrateClick} disabled={illustrating}>
          {illustrating ? 'Création…' : '✨ Illustrer'}
        </button>
      </div>

      {/* Filter (which words show) on the left, "select multiple" (an
          action on them) on the right — same row, right above the grid
          they both affect, but visually two different kinds of control
          rather than one long run of near-identical pills. While
          selecting, this row drops back to just the filter — the
          selection toolbar itself (further down) is the one place
          selection-related controls live now. */}
      {!addMode && (
        <div className="scope-toggle-row">
          <div className="scope-toggle">
            <button
              type="button"
              className={`btn btn-tab ${scope === 'mine' ? 'active' : ''}`}
              onClick={() => setScope('mine')}
            >
              Mes mots illustrés
            </button>
            <button
              type="button"
              className={`btn btn-tab ${scope === 'all' ? 'active' : ''}`}
              onClick={() => setScope('all')}
            >
              Banque commune
            </button>
          </div>
          {!selectionMode && (
            <button type="button" className="btn btn-secondary" onClick={toggleSelectionMode}>
              Sélectionner
            </button>
          )}
        </div>
      )}

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

      {!loading && !error && filteredWords.length === 0 && (
        <p className="empty-hint">
          {words.length === 0 ? 'Aucun mot dans la banque pour l’instant.' : 'Aucun mot ne correspond à cette recherche.'}
        </p>
      )}

      <ul className="card-list series-word-list">
        {pageWords.map((word) => {
          const selected = selectedIds.has(word.id)
          const added = addMode && addedIds.has(word.id)
          const isPending = word.status === 'pending' || proposedIds.has(word.id)
          const isCommon = word.status === 'common'
          return (
            <li key={word.id} className={`series-word-item word-bank-item ${selected || added ? 'selected' : ''}`}>
              {addMode ? (
                <button
                  type="button"
                  className="word-bank-card-select"
                  onClick={() => handleAddToSeries(word)}
                  disabled={added || addingId === word.id}
                  aria-pressed={added}
                >
                  <span className="word-bank-checkbox" aria-hidden="true">
                    {added ? '✓' : ''}
                  </span>
                  <IllustratedWordPreview text={word.text} zones={word.zones} />
                </button>
              ) : selectionMode ? (
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
                  {/* Common-bank words aren't the parent's own — never
                      deletable from here, only words under "Mes mots
                      illustrés" are. */}
                  {scope === 'mine' && (
                    <button
                      type="button"
                      className="icon-btn-danger word-bank-delete-btn"
                      onClick={() => handleDeleteWord(word)}
                      aria-label={`Retirer "${word.text}" de la banque de mots`}
                      title="Retirer de la banque"
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                  {/* Only the parent's own, not-yet-common words can be
                      proposed — a word already shared, or already awaiting
                      review, just shows where it stands instead. */}
                  {scope === 'mine' &&
                    !isCommon &&
                    (isPending ? (
                      <span className="word-bank-status-badge">En attente de validation</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary word-bank-propose-btn"
                        onClick={() => handleProposeToCommonBank(word)}
                        disabled={proposingId === word.id}
                      >
                        {proposingId === word.id ? 'Envoi…' : 'Proposer à la banque commune'}
                      </button>
                    ))}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <nav className="pagination no-print" aria-label="Pages de la banque de mots">
          <button
            type="button"
            className="btn btn-secondary pagination-arrow"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Page précédente"
          >
            ←
          </button>
          <div className="pagination-numbers">
            {pageNumbers.map((n, i) => (
              <Fragment key={n}>
                {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="pagination-ellipsis">…</span>}
                <button
                  type="button"
                  className={`pagination-page ${n === safePage ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                  aria-current={n === safePage ? 'page' : undefined}
                >
                  {n}
                </button>
              </Fragment>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary pagination-arrow"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Page suivante"
          >
            →
          </button>
        </nav>
      )}

      {/* Reserves the room the fixed toolbar below covers, so it never
          hides the last row of the grid or the pagination. No "Annuler"
          in the toolbar itself — tapping empty page background already
          exits selection mode (see handlePageClick above), so it would
          just be a second way to do the same thing. */}
      {selectionMode && (
        <>
          <div className="selection-toolbar-spacer" aria-hidden="true" />
          <div className="selection-toolbar no-print" onClick={(e) => e.stopPropagation()}>
            <span className="selection-count">
              {selectedIds.size} sélectionné{selectedIds.size === 1 ? '' : 's'}
            </span>
            <PrintWordsButton words={selectedWords} className="icon-btn" iconOnly />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCreateSeriesFromSelection}
              disabled={selectedIds.size === 0}
            >
              <TargetIcon size={18} />
              Créer un entraînement
            </button>
            {scope === 'mine' && (
              <button
                type="button"
                className="icon-btn-danger"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                aria-label="Supprimer les mots sélectionnés"
                title="Supprimer"
              >
                <TrashIcon size={18} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
