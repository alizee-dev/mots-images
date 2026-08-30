// No raw "Mot X / Y" count — a growing colored bar communicates progress on
// its own, without asking a young child to relate two numbers to each
// other. Only the current level is labeled, since the three levels look
// different enough that a bit of context still helps.
export default function PracticeProgressBar({ stepNumber, totalSteps, levelNumber }) {
  const percent = totalSteps > 0 ? Math.round((stepNumber / totalSteps) * 100) : 0
  return (
    <div className="practice-progress">
      <span className="practice-progress-level">Niveau {levelNumber}</span>
      <div className="practice-progress-bar">
        <div className="practice-progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
