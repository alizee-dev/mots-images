import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createWord, getWords, removeWordFromBank, submitWordForCommonBank } from '../../api/words'
import { addWordsToSeries, getSeriesDetail } from '../../api/series'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import PrintWordsButton from '../../components/PrintWordsButton'
import TrashIcon from '../../components/TrashIcon'
import TargetIcon from '../../components/TargetIcon'
import CheckIcon from '../../components/CheckIcon'
import ShareIcon from '../../components/ShareIcon'
import ClockIcon from '../../components/ClockIcon'
import SelectIcon from '../../components/SelectIcon'
import ConfirmDeleteButton from '../../components/ConfirmDeleteButton'

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
  // null only until the initial default below resolves — never used in
  // addMode, which always merges both regardless (see loadWords), so the
  // toggle this drives is hidden there anyway.
  const [scope, setScope] = useState(addMode ? 'all' : null)

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

  // A single word's own delete, once armed and confirmed via
  // ConfirmDeleteButton (see below) — tracked just to disable that one
  // button while its request is in flight.
  const [deletingId, setDeletingId] = useState(null)

  const loadWords = useCallback(() => {
    if (scope == null) return undefined
    setLoading(true)
    setError(null)
    // addMode always merges both — a parent building an entraînement needs
    // to actually find something to pick, so there's no reason to hide the
    // common bank behind a toggle that isn't even shown there.
    return getWords({ includeCommonWords: addMode || scope === 'all' })
      .then((list) => {
        setWords([...list].sort((a, b) => a.text.localeCompare(b.text, 'fr')))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [scope, addMode])

  // Decides the initial scope once, only when the toggle is actually shown
  // (never in addMode — scope starts resolved to 'all' above and this is
  // skipped): defaults to the parent's own words if they have any,
  // otherwise the common bank. A brand new account's own bank is always
  // empty, so landing there first would just look broken.
  useEffect(() => {
    if (addMode) return undefined
    let cancelled = false
    getWords({ includeCommonWords: false })
      .then((mine) => {
        if (!cancelled) setScope(mine.length > 0 ? 'mine' : 'all')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setScope('mine')
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  // addMode's own bookkeeping: whatever this entraînement already contains
  // — including words added in an earlier visit, or the one just added via
  // handleIllustrateClick right before landing back here — shows as
  // checked from the start, rather than only whatever got tapped during
  // this particular visit.
  useEffect(() => {
    if (!addMode) return undefined
    let cancelled = false
    getSeriesDetail(forSeriesId)
      .then((rows) => {
        if (!cancelled) setAddedIds(new Set(rows.map((r) => r.id)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [addMode, forSeriesId])

  // A bulk-action status message is just a status line, not an action
  // window like the toasts elsewhere — it clears itself instead of piling
  // up on screen if several bulk actions happen one after another.
  useEffect(() => {
    if (!bulkMessage && !bulkError) return
    const timer = setTimeout(() => {
      setBulkMessage(null)
      setBulkError(null)
    }, BULK_MESSAGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [bulkMessage, bulkError])

  const filteredWords = words.filter((word) => word.text.toLowerCase().startsWith(search.trim().toLowerCase()))

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
  // addMode, fromSeriesId/fromSeriesTitle/fromStudentId tag along so the
  // editor knows to bring the parent back to this exact add-words screen —
  // not just the plain bank — once they're done illustrating it, and to
  // offer "Ajouter à…" there instead of the usual save (see
  // WordEditorPage's handleAddToSeries) — the word isn't linked to the
  // entraînement yet at this point, only once that's actually confirmed.
  const handleIllustrateClick = async () => {
    // Words are always stored in uppercase — the letter-illustration
    // pipeline reads its per-letter/per-range text straight off this same
    // stored string, so normalizing it once here, at creation, is what
    // keeps every letter sent to the AI generator uppercase too.
    const text = search.trim().toUpperCase()
    const fromParams = new URLSearchParams()
    if (addMode) {
      fromParams.set('fromSeriesId', forSeriesId)
      if (forSeriesTitle) fromParams.set('fromSeriesTitle', forSeriesTitle)
      if (forStudentId) fromParams.set('fromStudentId', forStudentId)
    }
    if (!text) {
      navigate(addMode ? `/words/new?${fromParams.toString()}` : '/words/new')
      return
    }
    setIllustrating(true)
    setError(null)
    try {
      const word = await createWord(text, '')
      fromParams.set('autoAi', '1')
      navigate(`/words/${word.id}?${fromParams.toString()}`)
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

  // Same arm-then-confirm safety net as the admin dashboard's own deletes
  // (see ConfirmDeleteButton) — a tap arms the trash icon into a ✓/✕ pair,
  // and only the ✓ actually removes the word. Nothing happens until that
  // second, deliberate tap.
  const handleConfirmDeleteWord = async (word) => {
    setDeletingId(word.id)
    setError(null)
    try {
      await removeWordFromBank(word.id)
      setWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
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
          className="word-input word-bank-search-input"
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
              <span className="scope-toggle-label-full">Mes mots illustrés</span>
              <span className="scope-toggle-label-short">Mes mots</span>
            </button>
            <button
              type="button"
              className={`btn btn-tab ${scope === 'all' ? 'active' : ''}`}
              onClick={() => setScope('all')}
            >
              <span className="scope-toggle-label-full">Banque commune</span>
              <span className="scope-toggle-label-short">Banque</span>
            </button>
          </div>
          {!selectionMode && (
            <button
              type="button"
              className="btn btn-secondary word-bank-select-btn"
              onClick={toggleSelectionMode}
              aria-label="Sélectionner"
              title="Sélectionner"
            >
              <SelectIcon size={18} />
              <span className="scope-toggle-label-full">Sélectionner</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {bulkMessage && <p className="form-success">{bulkMessage}</p>}
      {bulkError && <p className="form-error">{bulkError}</p>}
      {loading && <p>Chargement…</p>}

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
                    <ConfirmDeleteButton
                      className="word-bank-delete-btn"
                      onConfirm={() => handleConfirmDeleteWord(word)}
                      disabled={deletingId === word.id}
                      label={`Retirer "${word.text}" de la banque de mots`}
                    />
                  )}
                  {/* Only the parent's own, not-yet-common words can be
                      proposed — a word already shared just shows nothing
                      extra here. A discreet icon either way (never a
                      full-width banner): the share icon only reveals
                      itself on hover, same as the delete icon on the
                      opposite corner; the pending clock stays visible on
                      its own, since that's status worth seeing at a
                      glance rather than an action to reach for. */}
                  {scope === 'mine' &&
                    !isCommon &&
                    (isPending ? (
                      <span className="word-bank-status-icon" title="En attente de validation" aria-label="En attente de validation">
                        <ClockIcon size={16} />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn word-bank-share-btn"
                        onClick={() => handleProposeToCommonBank(word)}
                        disabled={proposingId === word.id}
                        aria-label="Proposer à la banque commune"
                        title="Proposer à la banque commune"
                      >
                        <ShareIcon size={16} />
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
