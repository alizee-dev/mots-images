import { Link } from 'react-router-dom'

// A raw percentage reads as cold/school-like — stars keep the same
// three-tier feedback but as something to celebrate rather than a grade.
function starsFor(percent) {
  if (percent >= 90) return 3
  if (percent >= 60) return 2
  if (percent > 0) return 1
  return 0
}

const MESSAGES = {
  3: 'Bravo, c’est presque parfait !',
  2: 'Bien joué, continue comme ça !',
  1: 'Beau travail, tu progresses !',
  0: 'On retentera une prochaine fois, pas de souci !',
}

export default function PracticeRewardScreen({ correctCount, totalSteps, seriesId }) {
  const percent = totalSteps > 0 ? Math.round((correctCount / totalSteps) * 100) : 0
  const stars = starsFor(percent)

  return (
    <div className="practice-reward">
      <div className="practice-reward-stars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`practice-star ${n <= stars ? 'practice-star-filled' : ''}`}>
            ⭐
          </span>
        ))}
      </div>
      <p className="practice-reward-message">{MESSAGES[stars]}</p>
      <p className="practice-reward-detail">
        {correctCount} bonne{correctCount === 1 ? '' : 's'} réponse{correctCount === 1 ? '' : 's'} sur {totalSteps}
      </p>
      <Link to={`/series/${seriesId}`} className="btn btn-toggle active">
        ← Retour à l’entraînement
      </Link>
    </div>
  )
}
