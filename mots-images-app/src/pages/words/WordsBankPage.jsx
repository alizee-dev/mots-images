import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createWord, getWords, removeWordFromBank } from '../../api/words'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import WordCardsStaging from '../../components/WordCardsStaging'
import TrashIcon from '../../components/TrashIcon'
import { PRINT_LAYOUTS } from '../../printLayouts'
import { buildPrintDocument } from '../../printDocument'

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

// Every illustration image (letter stickers, crops, and an AI whole-word
// image alike — all stored the same way in zone.illustration.images) used
// by a set of words, as a flat list of data URLs.
function collectImageDataUrls(words) {
  const urls = []
  words.forEach((word) => {
    ;(word.zones || []).forEach((zone) => {
      ;(zone.illustration?.images || []).forEach((im) => {
        if (im.dataUrl) urls.push(im.dataUrl)
      })
    })
  })
  return urls
}

// Resolves once every image is loaded (or has failed — one broken image
// shouldn't block printing the rest forever).
function preloadImages(words) {
  const urls = collectImageDataUrls(words)
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new window.Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = url
        })
    )
  )
}

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

export default function WordsBankPage() {
  const navigate = useNavigate()
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

  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printLayoutChoice, setPrintLayoutChoice] = useState(PRINT_LAYOUTS[0].id)
  const [printing, setPrinting] = useState(false)
  // Only set while the hidden staging area (see WordCardsStaging) needs to
  // be mounted to export each selected card as an image — never rendered
  // as visible page content.
  const [exportLayout, setExportLayout] = useState(null)
  const [exportWords, setExportWords] = useState([])
  const stageRefs = useRef({})

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
  // screen. An empty field just opens a blank "Illustrer un mot" form.
  const handleIllustrateClick = async () => {
    const text = search.trim()
    if (!text) {
      navigate('/words/new')
      return
    }
    setIllustrating(true)
    setError(null)
    try {
      const word = await createWord(text, '')
      navigate(`/words/${word.id}?autoAi=1`)
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

  // Prints in a genuinely separate window instead of scrolling to an inline
  // section of this (potentially very long) page, and sidesteps the whole
  // "hide everything except .print-area" CSS trick that kept leaving pages
  // blank or misplaced: each selected card is exported as a flat image (via
  // Konva's own toDataURL, see WordCardsStaging) and handed to a
  // self-contained popup document that has nothing else in it to hide.
  const handleConfirmPrint = async () => {
    setError(null)
    const layout = printLayoutChoice
    const wordsToExport = selectedWords
    if (wordsToExport.length === 0) return

    // Opened synchronously, right inside this click handler, before any
    // await — some browsers' popup blockers stop treating window.open() as
    // a direct response to the user's click once it happens after an
    // awaited gap, even from a real click like this one.
    const popup = window.open('', '_blank', 'width=1000,height=800')
    if (!popup) {
      setError("La fenêtre d'impression a été bloquée par le navigateur. Autorise les pop-ups pour ce site, puis réessaie.")
      return
    }
    popup.document.write('<p style="font-family:sans-serif;padding:24px;">Préparation de l’impression…</p>')

    setPrinting(true)
    setExportLayout(layout)
    setExportWords(wordsToExport)
    try {
      await preloadImages(wordsToExport)
      // Two frames so the hidden staging area (mounted by the state above)
      // has actually committed and Konva has painted onto each canvas —
      // reading toDataURL() before that exports a blank image.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const cardImageUrls = wordsToExport
        .map((word) => stageRefs.current[word.id]?.toDataURL({ pixelRatio: 2 }))
        .filter(Boolean)

      if (cardImageUrls.length === 0) {
        popup.close()
        setError("Impossible de préparer les cartes pour l'impression.")
        return
      }

      const html = buildPrintDocument(cardImageUrls, layout)
      popup.document.open()
      popup.document.write(html)
      popup.document.close()

      const waitForImages = () =>
        Promise.all(
          Array.from(popup.document.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve
                  img.onerror = resolve
                })
          )
        )
      await waitForImages()
      // window.print() doesn't report whether the user actually printed or
      // hit "Annuler" in the browser's own print dialog — afterprint fires
      // either way, right when that dialog is dismissed, so this popup
      // (whose only purpose was showing the cards to print) can close
      // itself immediately instead of being left behind as an extra window
      // the parent has to close by hand.
      popup.addEventListener('afterprint', () => popup.close())
      popup.focus()
      popup.print()
    } finally {
      setExportLayout(null)
      setExportWords([])
      setPrinting(false)
      setPrintDialogOpen(false)
    }
  }

  const handleCreateSeriesFromSelection = () => {
    navigate('/series/new', { state: { prefillWordIds: [...selectedIds] } })
  }

  const pendingWords = [...pendingDeleteIds]
    .map((id) => words.find((w) => w.id === id))
    .filter(Boolean)

  return (
    <div className="page" onClick={handlePageClick}>
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
              className="btn btn-secondary"
              onClick={() => setPrintDialogOpen(true)}
              disabled={selectedIds.size === 0}
            >
              🖨️ Imprimer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCreateSeriesFromSelection}
              disabled={selectedIds.size === 0}
            >
              📚 Créer un entraînement
            </button>
            {scope === 'mine' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
              >
                {bulkDeleting ? 'Suppression…' : `🗑️ Supprimer${selectedIds.size ? ` (${selectedIds.size})` : ''}`}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={toggleSelectionMode}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="app-header-actions">
            <button type="button" className="btn btn-secondary" onClick={toggleSelectionMode}>
              Sélectionner
            </button>
          </div>
        )}
      </div>

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
        {pageWords.map((word) => {
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

      {printDialogOpen && (
        <div className="editor-overlay no-print" role="dialog" aria-modal="true">
          <div className="editor-panel">
            <button
              type="button"
              className="editor-close-btn"
              onClick={() => setPrintDialogOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
            <h3>Choisir la mise en page</h3>
            <div className="print-layout-options">
              {PRINT_LAYOUTS.map((opt) => (
                <label key={opt.id} className="print-layout-option">
                  <input
                    type="radio"
                    name="print-layout"
                    value={opt.id}
                    checked={printLayoutChoice === opt.id}
                    onChange={() => setPrintLayoutChoice(opt.id)}
                  />
                  <span className="print-layout-option-title">{opt.title}</span>
                  <span className="print-layout-option-desc">{opt.description}</span>
                </label>
              ))}
            </div>
            {/* The dialog overlay covers the rest of the page, so an error
                shown only down there (see the page-level error message)
                would be invisible while this stays open. */}
            {error && <p className="form-error">{error}</p>}
            <button type="button" className="btn btn-toggle active" onClick={handleConfirmPrint} disabled={printing}>
              {printing ? 'Préparation…' : '🖨️ Imprimer'}
            </button>
          </div>
        </div>
      )}

      {exportLayout && <WordCardsStaging words={exportWords} layout={exportLayout} stageRefs={stageRefs} />}
    </div>
  )
}
