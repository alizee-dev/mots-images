import { useCallback, useEffect, useRef } from 'react'
import IllustratedWordPreview from '../IllustratedWordPreview'
import LetterTileRack from './LetterTileRack'

const RECONSIDER_DELAY_MS = 500

function normalize(v) {
  return (v || '').trim().toLowerCase()
}

// Level 2 — reorder: unlike level 1, there is no image, and the word's
// spelling is never shown as text anywhere on screen. The only way the
// child learns which word to reconstruct is by ear — the mascotte's own
// speech bubble auto-plays and re-plays the audio (see
// PracticeSessionPage), nothing rendered here. Same auto-validation as
// level 1.
//
// `retry`: the second attempt after a wrong first try. This is the one
// exception to "never shown as text/image" — once the child has already
// missed it once, the mascotte's bubble reveals the correct spelling (see
// PracticeSessionPage) and the illustrated word appears here too, as a
// support to actually learn it from rather than guess again blind.
export default function PracticeLevel2({ word, onAnswered, retry = false, disabled = false }) {
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
      setTimeout(() => {
        onAnswered(normalize(assembled) === normalize(word.text))
      }, RECONSIDER_DELAY_MS)
    },
    [word.text, onAnswered]
  )

  return (
    <div className="practice-level practice-level-2">
      {retry && (
        <div className="practice-image-frame">
          <IllustratedWordPreview text={word.text} zones={word.zones} />
        </div>
      )}
      <LetterTileRack
        key={`${word.id}-${retry ? 'retry' : 'main'}`}
        letters={letters}
        onComplete={handleComplete}
        disabled={disabled}
      />
    </div>
  )
}
