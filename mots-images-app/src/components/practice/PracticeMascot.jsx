import mascotNeutral from '../../assets/mascots/mascotte_neutre.png'
import mascotHappy from '../../assets/mascots/mascotte_joyeuse.png'
import mascotEncouraging from '../../assets/mascots/mascotte_encourageante.png'

const MASCOT_IMAGES = {
  neutral: mascotNeutral,
  happy: mascotHappy,
  encouraging: mascotEncouraging,
}

// Docked top-left of the practice card (see .practice-mascot-dock) rather
// than centered above the word — so it never competes with the word-image
// or whichever card the current level is showing, which stays the one
// dominant element on screen. `message` shows as a speech bubble with a
// tail pointing at the mascotte — a coded UI element (colored background,
// text), not a new image — used for every message the mascotte "says":
// feedback (Bravo / corrections) as well as the "listen" prompt on levels
// 2 and 3. `onIconClick`, when set, appends a small 🔊 replay button
// inline at the end of the bubble text rather than a separate button
// element next to it.
export default function PracticeMascot({ state = 'neutral', message = null, tone = 'neutral', onIconClick = null }) {
  return (
    <div className="practice-mascot-dock">
      <img
        src={MASCOT_IMAGES[state] || MASCOT_IMAGES.neutral}
        alt=""
        className={`practice-mascot practice-mascot-${state}`}
      />
      {message && (
        <div className={`practice-mascot-bubble practice-mascot-bubble-${tone} font-dys`}>
          <span>{message}</span>
          {onIconClick && (
            <button type="button" className="practice-mascot-bubble-icon" onClick={onIconClick} aria-label="Écouter le mot">
              🔊
            </button>
          )}
        </div>
      )}
    </div>
  )
}
