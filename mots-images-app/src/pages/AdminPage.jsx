import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { approveWord, getPendingWords, getWords, rejectWord } from '../api/words'
import IllustratedWordPreview from '../components/IllustratedWordPreview'
import CheckIcon from '../components/CheckIcon'
import CloseIcon from '../components/CloseIcon'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'

// Illustrations per page on the "Banque commune" tab — a bank shared by
// every teacher can grow into the hundreds, so this is paginated exactly
// like the word bank itself rather than dumped on one long scroll.
const COMMON_PAGE_SIZE = 24

// A "windowed" page list — first page, last page, and a small run around
// the current one — rather than one button per page (see WordsBankPage's
// identical helper).
function getPageNumbers(current, total) {
  const pages = [1]
  for (let n = current - 1; n <= current + 1; n++) {
    if (n > 1 && n < total) pages.push(n)
  }
  if (total > 1) pages.push(total)
  return [...new Set(pages)].sort((a, b) => a - b)
}

// Admin-only screen — reviewing words submitted by any teacher for the
// common bank. Guarded twice: the nav link to here only shows for an
// admin (see Layout), and this redirects away on its own if reached any
// other way (a typed URL, a stale bookmark) — the backend would refuse
// the underlying GET/PUT calls either way, but there's no reason to show
// a broken screen first.
//
// Two tabs: words awaiting a first decision, and the common bank itself —
// kept separate from the word bank's own "Banque commune" browsing tab on
// purpose. That tab mixes an admin's own personal words in with the common
// ones (by design, for normal browsing/adding to an entraînement), which
// made removal from here ambiguous — every word listed on THIS tab is
// guaranteed status === 'common' by construction, nothing else.
export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('pending')

  const [pendingWords, setPendingWords] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState(null)
  const [actingId, setActingId] = useState(null)

  // Reuses GET /words?includeCommonWords=true — the same route the word
  // bank itself uses — rather than a dedicated endpoint, filtered down to
  // status === 'common' only, and sorted alphabetically so a reported word
  // can be found by scanning rather than hunting through an arbitrary
  // fetch order.
  const [commonWords, setCommonWords] = useState([])
  const [commonLoading, setCommonLoading] = useState(true)
  const [commonError, setCommonError] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [commonSearch, setCommonSearch] = useState('')
  const [commonPage, setCommonPage] = useState(1)

  useEffect(() => {
    if (!isAdmin) return
    getPendingWords()
      .then(setPendingWords)
      .catch((err) => setPendingError(err.message))
      .finally(() => setPendingLoading(false))
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    getWords({ includeCommonWords: true })
      .then((words) => {
        const common = words.filter((w) => w.status === 'common')
        common.sort((a, b) => a.text.localeCompare(b.text, 'fr'))
        setCommonWords(common)
      })
      .catch((err) => setCommonError(err.message))
      .finally(() => setCommonLoading(false))
  }, [isAdmin])

  // A new search changes what's being paged through, so it should start
  // back at page 1 rather than possibly landing on a now out-of-range page.
  useEffect(() => {
    setCommonPage(1)
  }, [commonSearch])

  if (!isAdmin) return <Navigate to="/" replace />

  const handleDecision = async (word, action) => {
    setActingId(word.id)
    setPendingError(null)
    try {
      await action(word.id)
      // Approved or rejected, it's no longer pending either way — drop it
      // from this list rather than re-fetching the whole thing.
      setPendingWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      setPendingError(err.message)
    } finally {
      setActingId(null)
    }
  }

  // Pulls a word back out of the common bank (sets it back to private).
  // Doesn't touch the word itself or who owns it, only its visibility to
  // other teachers.
  const handleRemoveCommon = async (word) => {
    setRemovingId(word.id)
    setCommonError(null)
    try {
      await rejectWord(word.id)
      setCommonWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      setCommonError(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  const filteredCommonWords = commonWords.filter((word) =>
    word.text.toLowerCase().includes(commonSearch.trim().toLowerCase())
  )
  const commonTotalPages = Math.max(1, Math.ceil(filteredCommonWords.length / COMMON_PAGE_SIZE))
  // Clamped rather than reset via an effect — covers a word being removed
  // out from under the current last page just as well.
  const safeCommonPage = Math.min(commonPage, commonTotalPages)
  const commonPageWords = filteredCommonWords.slice(
    (safeCommonPage - 1) * COMMON_PAGE_SIZE,
    safeCommonPage * COMMON_PAGE_SIZE
  )
  const commonPageNumbers = getPageNumbers(safeCommonPage, commonTotalPages)

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Administration</h2>
      </div>

      <div className="scope-toggle">
        <button
          type="button"
          className={`btn btn-tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          En attente
        </button>
        <button
          type="button"
          className={`btn btn-tab ${tab === 'common' ? 'active' : ''}`}
          onClick={() => setTab('common')}
        >
          Banque commune
        </button>
      </div>

      {tab === 'pending' ? (
        <>
          <p className="page-subtitle">Mots en attente de validation pour la banque commune</p>

          {pendingError && <p className="form-error">{pendingError}</p>}
          {pendingLoading && <p>Chargement…</p>}

          {!pendingLoading && !pendingError && pendingWords.length === 0 && (
            <p className="empty-hint">Aucun mot en attente de validation.</p>
          )}

          {pendingWords.length > 0 && (
            <ul className="card-list series-word-list">
              {pendingWords.map((word) => (
                <li key={word.id} className="series-word-item admin-pending-item">
                  <IllustratedWordPreview text={word.text} zones={word.zones} />
                  <p className="admin-pending-text">{word.text}</p>
                  <div className="admin-pending-actions">
                    <button
                      type="button"
                      className="btn btn-toggle active"
                      onClick={() => handleDecision(word, approveWord)}
                      disabled={actingId === word.id}
                    >
                      <CheckIcon size={16} />
                      Valider
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDecision(word, rejectWord)}
                      disabled={actingId === word.id}
                    >
                      <CloseIcon size={16} />
                      Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="page-subtitle">Mots actuellement partagés dans la banque commune</p>

          <input
            type="text"
            className="word-input"
            placeholder="Rechercher un mot…"
            value={commonSearch}
            onChange={(e) => setCommonSearch(e.target.value)}
          />

          {commonError && <p className="form-error">{commonError}</p>}
          {commonLoading && <p>Chargement…</p>}

          {!commonLoading && !commonError && filteredCommonWords.length === 0 && (
            <p className="empty-hint">
              {commonWords.length === 0
                ? 'Aucun mot dans la banque commune pour l’instant.'
                : 'Aucun mot ne correspond à cette recherche.'}
            </p>
          )}

          {commonPageWords.length > 0 && (
            <ul className="card-list series-word-list">
              {commonPageWords.map((word) => (
                <li key={word.id} className="series-word-item word-bank-item">
                  <IllustratedWordPreview text={word.text} zones={word.zones} />
                  <ConfirmDeleteButton
                    className="word-bank-admin-remove-btn"
                    onConfirm={() => handleRemoveCommon(word)}
                    disabled={removingId === word.id}
                    label={`Retirer "${word.text}" de la banque commune`}
                  />
                </li>
              ))}
            </ul>
          )}

          {commonTotalPages > 1 && (
            <nav className="pagination no-print" aria-label="Pages de la banque commune">
              <button
                type="button"
                className="btn btn-secondary pagination-arrow"
                onClick={() => setCommonPage((p) => Math.max(1, p - 1))}
                disabled={safeCommonPage === 1}
                aria-label="Page précédente"
              >
                ←
              </button>
              <div className="pagination-numbers">
                {commonPageNumbers.map((n, i) => (
                  <Fragment key={n}>
                    {i > 0 && n - commonPageNumbers[i - 1] > 1 && <span className="pagination-ellipsis">…</span>}
                    <button
                      type="button"
                      className={`pagination-page ${n === safeCommonPage ? 'active' : ''}`}
                      onClick={() => setCommonPage(n)}
                      aria-current={n === safeCommonPage ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  </Fragment>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary pagination-arrow"
                onClick={() => setCommonPage((p) => Math.min(commonTotalPages, p + 1))}
                disabled={safeCommonPage === commonTotalPages}
                aria-label="Page suivante"
              >
                →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
