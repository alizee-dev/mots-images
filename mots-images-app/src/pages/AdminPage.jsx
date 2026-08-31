import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { approveWord, getPendingWords, rejectWord } from '../api/words'
import IllustratedWordPreview from '../components/IllustratedWordPreview'
import CheckIcon from '../components/CheckIcon'
import CloseIcon from '../components/CloseIcon'

// Admin-only screen — reviewing words submitted by any teacher for the
// common bank. Guarded twice: the nav link to here only shows for an
// admin (see Layout), and this redirects away on its own if reached any
// other way (a typed URL, a stale bookmark) — the backend would refuse
// the underlying GET/PUT calls either way, but there's no reason to show
// a broken screen first.
export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    getPendingWords()
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isAdmin])

  if (!isAdmin) return <Navigate to="/" replace />

  const handleDecision = async (word, action) => {
    setActingId(word.id)
    setError(null)
    try {
      await action(word.id)
      // Approved or rejected, it's no longer pending either way — drop it
      // from this list rather than re-fetching the whole thing.
      setWords((prev) => prev.filter((w) => w.id !== word.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Administration</h2>
      </div>
      <p className="page-subtitle">Mots en attente de validation pour la banque commune</p>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && !error && words.length === 0 && (
        <p className="empty-hint">Aucun mot en attente de validation.</p>
      )}

      {words.length > 0 && (
        <ul className="card-list series-word-list">
          {words.map((word) => (
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
    </div>
  )
}
