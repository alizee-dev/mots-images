import { useEffect, useRef, useState } from 'react'
import { maskWordInSentence } from '../../practiceSentence'

function normalize(v) {
  return (v || '').trim().toLowerCase()
}

const ATTENTION_DELAY_MS = 10000

// Level 3 — free recall: a fill-in-the-blank sentence, no visual cue of the
// spelling at all — the child types from memory, hearing the word via the
// mascotte's own speech bubble (auto-plays and can be replayed there, see
// PracticeSessionPage) rather than a button here. Validation is explicit
// (a "Valider" button) rather than automatic: free text has no reliable
// "the answer is complete" signal the way an emptied tile rack does, and
// this mirrors the real test screen's own interaction, so the skill
// transfers directly. If ten seconds pass without a validation attempt,
// the button warms to a more saturated shade of the same accent color — a
// nudge, not an alarm (no red, no blinking).
//
// `retry`: the second attempt after a wrong first try — the sentence is
// hidden then, since the mascotte's correction bubble already spells the
// word out as text ("Le mot exact est …"), leaving just the input to try
// again with.
// `disabled`: true during the two brief windows after an answer (success,
// or the final reveal after a wrong retry) where PracticeSessionPage is
// about to move on — freezes the form so a stray click/Enter can't
// re-submit mid-transition.
export default function PracticeLevel3({ word, onAnswered, retry = false, disabled = false }) {
  const [answer, setAnswer] = useState('')
  const [needsAttention, setNeedsAttention] = useState(false)
  const inputRef = useRef(null)
  const maskedSentence = maskWordInSentence(word.sentence, word.text)

  useEffect(() => {
    setAnswer('')
    setNeedsAttention(false)
    inputRef.current?.focus()
    const timer = setTimeout(() => setNeedsAttention(true), ATTENTION_DELAY_MS)
    return () => clearTimeout(timer)
    // Re-arms for the retry pass too, not just when the word itself changes.
  }, [word.id, retry])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (disabled || !answer.trim()) return
    onAnswered(normalize(answer) === normalize(word.text))
  }

  return (
    <div className="practice-level practice-level-3">
      {!retry && <p className="practice-sentence font-dys">{maskedSentence || 'Écris le mot :'}</p>}
      <form className="practice-answer-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="word-input font-dys practice-answer-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className={`btn btn-toggle active practice-validate-btn ${needsAttention ? 'practice-validate-btn-attention' : ''}`}
          disabled={disabled}
        >
          Valider
        </button>
      </form>
    </div>
  )
}
