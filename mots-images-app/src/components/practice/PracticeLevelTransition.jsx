import { useEffect } from 'react'
import mascotHappy from '../../assets/mascots/mascotte_joyeuse.png'

// Long enough to actually register as a little celebration, short enough
// not to feel like a wait — same spirit as the other timed beats in this
// flow (see PracticeSessionPage's own delay constants).
const AUTO_ADVANCE_MS = 2600

// Same three-tier read as PracticeRewardScreen's own starsFor — kept as its
// own small copy rather than shared, since this one only ever needs the
// star count, never the "perfect" message tier.
function starsFor(percent) {
  if (percent >= 90) return 3
  if (percent >= 60) return 2
  if (percent > 0) return 1
  return 0
}

// Shown between two levels of a full 1→2→3 run — a brief recognition beat
// so finishing a level isn't invisible, before the exercise continues
// straight into the next one. Echoes the final PracticeRewardScreen's own
// mascotte + stars language, scaled down to just the level just finished.
// Never shown after the last level (that's the real reward screen) or
// during a single-level run (?level=N) — there's nothing to transition to.
export default function PracticeLevelTransition({ level, correct, total, nextLevel, onContinue }) {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0
  const stars = starsFor(percent)

  useEffect(() => {
    const timer = setTimeout(onContinue, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [onContinue])

  return (
    <div className="practice-level-transition">
      <img src={mascotHappy} alt="" className="practice-level-transition-mascot" />
      <p className="practice-level-transition-title">Niveau {level} terminé !</p>
      <div className="practice-reward-stars practice-level-transition-stars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`practice-star ${n <= stars ? 'practice-star-filled' : ''}`}>
            ⭐
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-toggle active" onClick={onContinue}>
        Niveau {nextLevel} →
      </button>
    </div>
  )
}
