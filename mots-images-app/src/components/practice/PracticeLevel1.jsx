import { useCallback, useEffect, useRef } from 'react'
import IllustratedWordPreview from '../IllustratedWordPreview'
import LetterTileRack from './LetterTileRack'

const RECONSIDER_DELAY_MS = 500

function normalize(v) {
  return (v || '').trim().toLowerCase()
}

// Level 1 — image → letters: the full illustrated word is shown, the child
// taps shuffled letter tiles to reconstruct it. Validates itself
// automatically the instant the rack empties (see the approved validation
// plan — option C) — no "Valider" button on this level. The image stays on
// screen at every stage (answering, retry, success/failure feedback) — see
// PracticeSessionPage, which no longer swaps this out for a separate
// feedback screen.
export default function PracticeLevel1({ word, onAnswered, retry = false, disabled = false }) {
  const answeredRef = useRef(false)
  const letters = Array.from(word.text)

  // This component itself is never remounted between words or between a
  // first attempt and its retry — only LetterTileRack is (see its own
  // `key` below). Without this, answeredRef would stay stuck at `true`
  // after the very first tile-completion in this level, silently
  // swallowing onAnswered for every word and every retry after that.
  useEffect(() => {
    answeredRef.current = false
  }, [word.id, retry])

  const handleComplete = useCallback(
    (assembled) => {
      if (answeredRef.current) return
      answeredRef.current = true
      // A short pause between the last tile landing and the actual check —
      // gives the child a beat to notice and fix a mistake before it's
      // scored, instead of being corrected the instant the rack empties.
      setTimeout(() => {
        onAnswered(normalize(assembled) === normalize(word.text))
      }, RECONSIDER_DELAY_MS)
    },
    [word.text, onAnswered]
  )

  return (
    <div className="practice-level practice-level-1">
      <div className="practice-image-frame">
        <IllustratedWordPreview text={word.text} zones={word.zones} />
      </div>
      <LetterTileRack
        key={`${word.id}-${retry ? 'retry' : 'main'}`}
        letters={letters}
        onComplete={handleComplete}
        disabled={disabled}
      />
    </div>
  )
}
