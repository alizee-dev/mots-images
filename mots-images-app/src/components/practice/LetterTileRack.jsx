import { useCallback, useState } from 'react'

function shuffle(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// A shuffled rack of letter tiles the child taps into place to reconstruct
// a word. Each tile keeps a stable identity (not just its character), so
// repeated letters — "POISSON" has two S and two O — are tracked
// unambiguously. Remount this with a fresh `key` per word (see
// PracticeLevel1/2) instead of resetting it internally — far simpler than
// reconciling old placed tiles against a brand new word's letters.
//
// The word-in-progress is modeled as one fixed slot per letter position
// (not a growing list) — tapping a placed tile clears only its own slot,
// leaving every other tile exactly where it is. That's what lets a child
// fix a single mistake in the middle of the word without having to clear
// and redo everything after it: the reopened slot is simply the next place
// a bank tile lands.
export default function LetterTileRack({ letters, onComplete, disabled = false }) {
  const [tiles] = useState(() => shuffle(letters.map((char, i) => ({ id: i, char }))))
  const [slots, setSlots] = useState(() => Array(letters.length).fill(null))

  const placedIds = new Set(slots.filter((id) => id !== null))
  const available = tiles.filter((t) => !placedIds.has(t.id))

  const placeTile = useCallback(
    (tileId) => {
      if (disabled) return
      setSlots((prev) => {
        const targetIndex = prev.indexOf(null)
        if (targetIndex === -1) return prev
        const next = [...prev]
        next[targetIndex] = tileId
        if (!next.includes(null)) {
          const assembled = next.map((id) => tiles.find((t) => t.id === id).char).join('')
          // The parent decides on the short "reconsider" pause before the
          // answer is actually checked — this just reports completion.
          onComplete(assembled)
        }
        return next
      })
    },
    [disabled, tiles, onComplete]
  )

  const clearSlot = useCallback(
    (slotIndex) => {
      if (disabled) return
      setSlots((prev) => {
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
    },
    [disabled]
  )

  return (
    <div className="tile-rack">
      <div className="tile-slot-row" aria-label="Mot en construction">
        {slots.map((tileId, i) => {
          const tile = tileId !== null ? tiles.find((t) => t.id === tileId) : null
          return tile ? (
            <button
              key={i}
              type="button"
              className="letter-tile letter-tile-placed font-dys"
              onClick={() => clearSlot(i)}
              disabled={disabled}
              aria-label={`Retirer la lettre ${tile.char}, position ${i + 1}`}
            >
              {tile.char}
            </button>
          ) : (
            <span key={i} className="letter-tile-empty-slot" aria-hidden="true" />
          )
        })}
      </div>
      <div className="tile-bank-row" aria-label="Lettres disponibles">
        {available.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="letter-tile font-dys"
            onClick={() => placeTile(tile.id)}
            disabled={disabled}
            aria-label={`Lettre ${tile.char}`}
          >
            {tile.char}
          </button>
        ))}
      </div>
    </div>
  )
}
