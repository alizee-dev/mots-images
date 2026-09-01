import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createStudent, getMyStudents } from '../api/students'
import { getWords } from '../api/words'
import { acknowledgeCommonWordId, loadAcknowledgedCommonWordIds } from '../commonWordNotices'
import mascotNeutral from '../assets/mascots/mascotte_neutre.png'
import PlusIcon from '../components/PlusIcon'
import CloseIcon from '../components/CloseIcon'
import TargetIcon from '../components/TargetIcon'

// The dashboard used to stack three overlapping ways to reach the same
// handful of destinations (a header button, two hero buttons, a row of
// tiles) — all of that navigation now lives in one place, the header's
// icon nav band (see Layout/.app-nav). This screen keeps a single job: a
// warm, low-text landing moment (the mascotte + a short greeting) plus the
// one action a parent comes back to most — illustrating a new word. With
// no child added yet, that greeting becomes the invitation to add one —
// entraînements now belong to a specific child, so there's nothing useful
// to do anywhere else in the app until at least one exists.
export default function DashboardPage() {
  // null while the first fetch is in flight, an array once it resolves —
  // needed both for the greeting and to tell "no child yet" apart from "the
  // request failed", which must never be presented as the same thing (a
  // connectivity error is not "you have no children").
  const [students, setStudents] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [childName, setChildName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  // Words this parent submitted that are now common but haven't been
  // acknowledged yet (see commonWordNotices.js) — checked once per visit
  // here, so it surfaces whenever the parent next opens the app, even if
  // they were logged out at the exact moment an admin approved it.
  const [commonWordNotices, setCommonWordNotices] = useState([])

  useEffect(() => {
    getMyStudents()
      .then(setStudents)
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    getWords()
      .then((words) => {
        const acknowledged = loadAcknowledgedCommonWordIds()
        setCommonWordNotices(words.filter((w) => w.status === 'common' && !acknowledged.has(w.id)))
      })
      .catch(() => {})
  }, [])

  const dismissCommonWordNotice = (wordId) => {
    acknowledgeCommonWordId(wordId)
    setCommonWordNotices((prev) => prev.filter((w) => w.id !== wordId))
  }

  const handleCreateChild = async (e) => {
    e.preventDefault()
    const name = childName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(null)
    try {
      const student = await createStudent(name)
      setStudents((prev) => [...(prev || []), student])
      setChildName('')
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const hasNoChildren = !loadError && students !== null && students.length === 0

  const message = hasNoChildren
    ? 'Commençons par ajouter ton premier enfant !'
    : 'Par quoi commence-t-on aujourd’hui ?'

  return (
    <div className="dashboard">
      <div className="dashboard-mascot-block">
        <div className="dashboard-mascot-glow" aria-hidden="true" />
        <img src={mascotNeutral} alt="" className="dashboard-mascot" />
        <div className="dashboard-mascot-bubble">
          <p className="dashboard-mascot-message">{message}</p>
        </div>

        {hasNoChildren ? (
          <form className="inline-form" onSubmit={handleCreateChild}>
            <input
              type="text"
              className="word-input"
              placeholder="Prénom de l’enfant"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-toggle active" disabled={creating}>
              {creating ? (
                'Ajout…'
              ) : (
                <>
                  <PlusIcon size={18} />
                  Ajouter
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="dashboard-cta-row">
            <Link to="/words/new" className="btn btn-toggle active">
              ✨ Illustrer un mot
            </Link>
            <Link to="/training" className="btn btn-secondary">
              <TargetIcon size={18} />
              S’entraîner
            </Link>
          </div>
        )}
        {createError && <p className="form-error">{createError}</p>}
      </div>

      {commonWordNotices.length > 0 && (
        <div className="common-word-notice-stack no-print">
          {commonWordNotices.map((word) => (
            <div key={word.id} className="common-word-notice">
              <span>
                Merci pour ta contribution ! Ton mot « {word.text} » a été ajouté à la banque commune.
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => dismissCommonWordNotice(word.id)}
                aria-label="Fermer"
                title="Fermer"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
