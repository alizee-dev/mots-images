import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  acceptAdminIllustration,
  approveWord,
  generateAdminIllustration,
  getIllustrationRequests,
  getPendingWords,
  getWords,
  getWordsForSentenceEditing,
  rejectWord,
  updateWordSentenceAsAdmin,
} from '../api/words'
import { ensureZonesImagesAreCompressed } from '../imageCompression'
import { maskWordInSentence } from '../practiceSentence'
import { buildAiWholeWordZones } from '../wordGeometry'
import IllustratedWordPreview from '../components/IllustratedWordPreview'
import CheckIcon from '../components/CheckIcon'
import CloseIcon from '../components/CloseIcon'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'

// Rows per page on the "Banque commune" and "Phrases" tabs — both can list
// well over a hundred words, so they're paginated rather than dumped on one
// long scroll.
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

// Positions are always a consecutive run (enforced server-side) — shown as
// a range ("3-4") rather than every individual number.
function formatPositions(positions) {
  if (!positions || positions.length === 0) return ''
  if (positions.length === 1) return `${positions[0]}`
  return `${positions[0]}-${positions[positions.length - 1]}`
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

  // Every word an admin can meaningfully write/correct a sentence for
  // (still in a bank, or already used in a série), across all teachers —
  // `drafts` holds the in-progress textarea value per word id, separate
  // from the saved `sentence` on each word so a save button can tell
  // whether there's anything to persist.
  const [sentenceWords, setSentenceWords] = useState([])
  const [sentenceLoading, setSentenceLoading] = useState(true)
  const [sentenceError, setSentenceError] = useState(null)
  const [sentenceSearch, setSentenceSearch] = useState('')
  const [sentencePage, setSentencePage] = useState(1)
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)

  // Words a teacher flagged after none of the 3 AI proposals worked out —
  // `concepts` holds the admin's in-progress concept text per word id,
  // `previews` the single generated image (base64) waiting to be accepted
  // or regenerated with a revised concept.
  const [illustrationRequests, setIllustrationRequests] = useState([])
  const [illustrationLoading, setIllustrationLoading] = useState(true)
  const [illustrationError, setIllustrationError] = useState(null)
  const [concepts, setConcepts] = useState({})
  const [previews, setPreviews] = useState({})
  const [generatingId, setGeneratingId] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)

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

  useEffect(() => {
    if (!isAdmin) return
    getWordsForSentenceEditing()
      .then((words) => {
        setSentenceWords(words)
        setDrafts(Object.fromEntries(words.map((w) => [w.id, w.sentence || ''])))
      })
      .catch((err) => setSentenceError(err.message))
      .finally(() => setSentenceLoading(false))
  }, [isAdmin])

  useEffect(() => {
    setSentencePage(1)
  }, [sentenceSearch])

  useEffect(() => {
    if (!isAdmin) return
    getIllustrationRequests()
      .then((words) => {
        setIllustrationRequests(words)
        // Pre-fills each word's concept with whatever the failed AI attempt
        // actually used (when one was captured) — the admin edits it from
        // there instead of starting from a blank field.
        setConcepts(Object.fromEntries(words.map((w) => [w.id, w.illustration_request_concept || ''])))
      })
      .catch((err) => setIllustrationError(err.message))
      .finally(() => setIllustrationLoading(false))
  }, [isAdmin])

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

  // Saves a word's sentence in place — never removed from the list, so the
  // admin can come back and correct any word (even one already filled)
  // whenever a sentence turns out to be unsuitable or misspelled.
  const handleSaveSentence = async (word) => {
    const draft = (drafts[word.id] ?? '').trim()
    setSavingId(word.id)
    setSentenceError(null)
    try {
      await updateWordSentenceAsAdmin(word.id, draft)
      setSentenceWords((prev) => prev.map((w) => (w.id === word.id ? { ...w, sentence: draft } : w)))
      setDrafts((prev) => ({ ...prev, [word.id]: draft }))
    } catch (err) {
      setSentenceError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  // Generates one illustration from the admin's own hand-written concept —
  // stores it as a preview rather than saving it immediately, since the
  // admin still needs to look at it and decide.
  const handleGenerateAdminIllustration = async (word) => {
    const concept = (concepts[word.id] ?? '').trim()
    if (!concept) return
    setGeneratingId(word.id)
    setIllustrationError(null)
    try {
      const { illustration } = await generateAdminIllustration(word.id, concept)
      setPreviews((prev) => ({ ...prev, [word.id]: illustration.image }))
    } catch (err) {
      setIllustrationError(err.message)
    } finally {
      setGeneratingId(null)
    }
  }

  // Accepting builds the same "whole word" zone shape the teacher-facing AI
  // flow already uses (see WordEditorPage's applyAiProposal), then saves it
  // and drops the word from this list — it no longer needs help.
  const handleAcceptAdminIllustration = async (word) => {
    setAcceptingId(word.id)
    setIllustrationError(null)
    try {
      const zones = await buildAiWholeWordZones(previews[word.id])
      // The raw generated PNG is far larger than the ~100KB PUT body limit
      // (see imageCompression.js) — the same compression pass the teacher's
      // own AI-proposal flow already runs before saving.
      const { zones: compressedZones } = await ensureZonesImagesAreCompressed(zones)
      await acceptAdminIllustration(word.id, compressedZones)
      setIllustrationRequests((prev) => prev.filter((w) => w.id !== word.id))
      setPreviews((prev) => {
        const next = { ...prev }
        delete next[word.id]
        return next
      })
    } catch (err) {
      setIllustrationError(err.message)
    } finally {
      setAcceptingId(null)
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

  const filteredSentenceWords = sentenceWords.filter((word) =>
    word.text.toLowerCase().includes(sentenceSearch.trim().toLowerCase())
  )
  const sentenceTotalPages = Math.max(1, Math.ceil(filteredSentenceWords.length / COMMON_PAGE_SIZE))
  const safeSentencePage = Math.min(sentencePage, sentenceTotalPages)
  const sentencePageWords = filteredSentenceWords.slice(
    (safeSentencePage - 1) * COMMON_PAGE_SIZE,
    safeSentencePage * COMMON_PAGE_SIZE
  )
  const sentencePageNumbers = getPageNumbers(safeSentencePage, sentenceTotalPages)
  const missingSentenceCount = sentenceWords.filter((w) => !w.sentence).length

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
        <button
          type="button"
          className={`btn btn-tab ${tab === 'sentences' ? 'active' : ''}`}
          onClick={() => setTab('sentences')}
        >
          Phrases
        </button>
        <button
          type="button"
          className={`btn btn-tab ${tab === 'illustrations' ? 'active' : ''}`}
          onClick={() => setTab('illustrations')}
        >
          Illustrations à faire
        </button>
      </div>

      {tab === 'pending' && (
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
      )}

      {tab === 'common' && (
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

      {tab === 'sentences' && (
        <>
          <p className="page-subtitle">
            {missingSentenceCount} phrase{missingSentenceCount === 1 ? '' : 's'} manquante
            {missingSentenceCount === 1 ? '' : 's'} sur {sentenceWords.length} mot{sentenceWords.length === 1 ? '' : 's'}
          </p>

          <input
            type="text"
            className="word-input"
            placeholder="Rechercher un mot…"
            value={sentenceSearch}
            onChange={(e) => setSentenceSearch(e.target.value)}
          />

          {sentenceError && <p className="form-error">{sentenceError}</p>}
          {sentenceLoading && <p>Chargement…</p>}

          {!sentenceLoading && !sentenceError && filteredSentenceWords.length === 0 && (
            <p className="empty-hint">
              {sentenceWords.length === 0
                ? 'Aucun mot à éditer pour l’instant.'
                : 'Aucun mot ne correspond à cette recherche.'}
            </p>
          )}

          {sentencePageWords.length > 0 && (
            <div className="admin-sentence-table-wrapper">
              <table className="data-table admin-sentence-table">
                <thead>
                  <tr>
                    <th>Mot</th>
                    <th>Phrase</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sentencePageWords.map((word) => {
                    const draft = drafts[word.id] ?? ''
                    const isDirty = draft.trim() !== (word.sentence || '')
                    const showWarning = draft.trim().length > 0 && maskWordInSentence(draft, word.text) === null
                    return (
                      <tr key={word.id}>
                        <td>
                          <strong>{word.text}</strong>
                          <div className="admin-sentence-meta">
                            #{word.id} · {word.status === 'common' ? 'commune' : 'privé'}
                            {!word.sentence && <span className="admin-sentence-missing-badge">Phrase manquante</span>}
                          </div>
                        </td>
                        <td>
                          <textarea
                            className="word-input admin-sentence-input"
                            rows={2}
                            value={draft}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [word.id]: e.target.value }))}
                          />
                          {showWarning && (
                            <p className="form-error admin-sentence-warning">
                              Le mot « {word.text} » n’apparaît pas tel quel dans cette phrase.
                            </p>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-toggle active"
                            onClick={() => handleSaveSentence(word)}
                            disabled={!isDirty || savingId === word.id}
                          >
                            {savingId === word.id ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sentenceTotalPages > 1 && (
            <nav className="pagination no-print" aria-label="Pages des phrases">
              <button
                type="button"
                className="btn btn-secondary pagination-arrow"
                onClick={() => setSentencePage((p) => Math.max(1, p - 1))}
                disabled={safeSentencePage === 1}
                aria-label="Page précédente"
              >
                ←
              </button>
              <div className="pagination-numbers">
                {sentencePageNumbers.map((n, i) => (
                  <Fragment key={n}>
                    {i > 0 && n - sentencePageNumbers[i - 1] > 1 && <span className="pagination-ellipsis">…</span>}
                    <button
                      type="button"
                      className={`pagination-page ${n === safeSentencePage ? 'active' : ''}`}
                      onClick={() => setSentencePage(n)}
                      aria-current={n === safeSentencePage ? 'page' : undefined}
                    >
                      {n}
                    </button>
                  </Fragment>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary pagination-arrow"
                onClick={() => setSentencePage((p) => Math.min(sentenceTotalPages, p + 1))}
                disabled={safeSentencePage === sentenceTotalPages}
                aria-label="Page suivante"
              >
                →
              </button>
            </nav>
          )}
        </>
      )}

      {tab === 'illustrations' && (
        <>
          <p className="page-subtitle">Mots dont aucune proposition IA n’a convenu à l’enseignant</p>

          {illustrationError && <p className="form-error">{illustrationError}</p>}
          {illustrationLoading && <p>Chargement…</p>}

          {!illustrationLoading && !illustrationError && illustrationRequests.length === 0 && (
            <p className="empty-hint">Aucune demande en attente.</p>
          )}

          {illustrationRequests.length > 0 && (
            <ul className="card-list admin-illustration-request-list">
              {illustrationRequests.map((word) => (
                <li key={word.id} className="admin-illustration-request-item">
                  <div className="admin-sentence-meta">
                    <strong>{word.text}</strong> — lettre(s) « {word.illustration_request_letters} », position{' '}
                    {formatPositions(word.illustration_request_positions)}
                  </div>

                  <textarea
                    className="word-input admin-sentence-input"
                    rows={3}
                    placeholder="Décris le concept d’illustration à proposer au modèle…"
                    value={concepts[word.id] ?? ''}
                    onChange={(e) => setConcepts((prev) => ({ ...prev, [word.id]: e.target.value }))}
                  />

                  <div className="app-header-actions">
                    <button
                      type="button"
                      className="btn btn-toggle active"
                      onClick={() => handleGenerateAdminIllustration(word)}
                      disabled={generatingId === word.id || !(concepts[word.id] ?? '').trim()}
                    >
                      {generatingId === word.id ? 'Génération…' : previews[word.id] ? 'Régénérer' : 'Générer'}
                    </button>
                  </div>

                  {previews[word.id] && (
                    <div className="ai-proposal-card admin-illustration-preview">
                      <img
                        className="ai-proposal-image"
                        src={`data:image/png;base64,${previews[word.id]}`}
                        alt="Illustration générée par IA à partir du concept de l’admin"
                      />
                      <button
                        type="button"
                        className="btn btn-toggle active"
                        onClick={() => handleAcceptAdminIllustration(word)}
                        disabled={acceptingId === word.id}
                      >
                        {acceptingId === word.id ? 'Enregistrement…' : 'Accepter'}
                      </button>
                    </div>
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
