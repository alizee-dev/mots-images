import { useEffect, useRef, useState } from 'react'
import TrashIcon from './TrashIcon'
import CheckIcon from './CheckIcon'
import CloseIcon from './CloseIcon'

// How long the armed (✓ / ✕) state stays up before quietly reverting back
// to the plain trash icon if nothing is tapped — long enough to notice and
// decide, short enough that walking away doesn't leave it primed forever.
const ARM_TIMEOUT_MS = 4000

// A trash icon that arms on first tap — turning into a quick confirm/
// cancel pair for a few seconds — rather than either deleting instantly or
// interrupting the flow with a native confirm() popup. For a deletion
// significant enough to still want a deliberate second tap (an
// entraînement, an évaluation), but not so significant it needs a full
// modal.
export default function ConfirmDeleteButton({ onConfirm, disabled = false, label = 'Supprimer', className = '' }) {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const arm = () => {
    setArmed(true)
    timerRef.current = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS)
  }

  const cancel = () => {
    clearTimeout(timerRef.current)
    setArmed(false)
  }

  const confirm = () => {
    clearTimeout(timerRef.current)
    setArmed(false)
    onConfirm()
  }

  if (armed) {
    return (
      <span className={`confirm-delete-armed ${className}`}>
        <button
          type="button"
          className="icon-btn-danger"
          onClick={confirm}
          disabled={disabled}
          aria-label={`Confirmer : ${label.toLowerCase()}`}
          title="Confirmer"
        >
          <CheckIcon size={16} />
        </button>
        <button type="button" className="icon-btn" onClick={cancel} disabled={disabled} aria-label="Annuler" title="Annuler">
          <CloseIcon size={16} />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`icon-btn-danger ${className}`}
      onClick={arm}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <TrashIcon size={16} />
    </button>
  )
}
