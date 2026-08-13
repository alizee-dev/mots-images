import React, { useMemo, useState } from 'react'
import { searchEmoji } from '../emojiSearch'

export default function EmojiPicker({ onPick }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchEmoji(query), [query])

  return (
    <div className="emoji-picker">
      <input
        type="text"
        className="emoji-picker-input"
        placeholder="Chercher une image (ex: hameçon, soleil, chat...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="emoji-picker-grid">
        {results.map((e) => (
          <button
            key={e.emoji + e.label}
            type="button"
            className="emoji-picker-item"
            title={e.label}
            onClick={() => onPick(e.emoji)}
          >
            {e.emoji}
          </button>
        ))}
        {results.length === 0 && <p className="emoji-picker-empty">Aucune image trouvée pour "{query}".</p>}
      </div>
    </div>
  )
}
