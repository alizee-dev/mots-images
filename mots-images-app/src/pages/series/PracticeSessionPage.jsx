import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getSeriesDetail } from '../../api/series'
import PracticeLevel1 from '../../components/practice/PracticeLevel1'
import PracticeLevel2 from '../../components/practice/PracticeLevel2'
import PracticeLevel3 from '../../components/practice/PracticeLevel3'
import PracticeMascot from '../../components/practice/PracticeMascot'
import PracticeProgressBar from '../../components/practice/PracticeProgressBar'
import PracticeRewardScreen from '../../components/practice/PracticeRewardScreen'
import { playCorrectSound, playIncorrectSound } from '../../practiceSound'
import { speakWord } from '../../practiceSpeech'

// How long the mascotte's "Bravo !" bubble stays up before auto-advancing
// on a correct answer — the word/card itself never leaves the screen
// during this, only the mascotte's expression and speech bubble change, so
// there's nothing to visually catch up on before the next word.
const CORRECT_FEEDBACK_DELAY_MS = 1600
// The final reveal after a wrong retry gets a bit longer — there's no more
// "essaie encore" pointing them back at it, so this is the only chance to
// actually read the correct spelling in the bubble.
const FINAL_REVEAL_DELAY_MS = 2400

const LEVEL_COMPONENTS = { 1: PracticeLevel1, 2: PracticeLevel2, 3: PracticeLevel3 }

// Practice is a free, ungraded, purely local exercise (see the practice
// plan) — everything below lives in this component's own state for the
// length of one visit. Nothing is ever sent back to the API beyond the one
// GET already used by the series detail screen itself; no attempt, score,
// or session is recorded anywhere.
export default function PracticeSessionPage() {
  const { seriesId } = useParams()
  const [searchParams] = useSearchParams()
  const onlyLevelParam = searchParams.get('level')
  const levels = useMemo(
    () => (onlyLevelParam && LEVEL_COMPONENTS[onlyLevelParam] ? [Number(onlyLevelParam)] : [1, 2, 3]),
    [onlyLevelParam]
  )

  const [words, setWords] = useState(null)
  const [seriesTitle, setSeriesTitle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  // All words of the current level are worked through before moving to the
  // next level (never level 1→2→3 per word) — wordPos resets to 0 each time
  // levelPos advances.
  const [levelPos, setLevelPos] = useState(0)
  const [wordPos, setWordPos] = useState(0)
  // 1 = the word's first attempt this visit; 2 = the guided retry shown
  // after a wrong first answer. Only the first attempt is scored (see
  // handleAnswered) — the retry is purely a supportive second try.
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [mascotState, setMascotState] = useState('neutral')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'incorrect' | 'final'
  const [runResults, setRunResults] = useState([])
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const rows = await getSeriesDetail(seriesId)
        if (cancelled) return
        const sorted = [...rows].sort((a, b) => a.order - b.order)
        setWords(sorted)
        setSeriesTitle(rows[0]?.title || 'Entraînement')
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [seriesId])

  const currentLevel = levels[levelPos]
  const currentWord = words?.[wordPos]
  const totalSteps = (words?.length || 0) * levels.length
  const stepNumber = levelPos * (words?.length || 0) + wordPos + 1
  const LevelComponent = LEVEL_COMPONENTS[currentLevel]
  const needsAudio = currentLevel === 2 || currentLevel === 3

  // Auto-plays once when a brand new word first appears on a level that
  // needs audio — deliberately not when a retry begins (attemptNumber
  // 1→2): the word must never be dictated automatically alongside the
  // error message, only on request via the icon in the mascotte's own
  // bubble below. Levels 2 and 3 no longer have their own "hear the word"
  // button.
  useEffect(() => {
    if (currentWord && needsAudio) {
      speakWord(currentWord.text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id, needsAudio])

  const advance = () => {
    setAttemptNumber(1)
    if (wordPos + 1 < (words?.length || 0)) {
      setWordPos((p) => p + 1)
      return
    }
    if (levelPos + 1 < levels.length) {
      setLevelPos((p) => p + 1)
      setWordPos(0)
      return
    }
    setFinished(true)
  }

  const handleAnswered = (isCorrect) => {
    // The guided retry is never rescored (already recorded on the first
    // attempt below) — but the child still gets the same "Bravo" for
    // getting it right, or a final reveal of the correct spelling before
    // moving on if they miss it again. Either way, this word is done after
    // this.
    if (attemptNumber === 2) {
      if (isCorrect) {
        setMascotState('happy')
        playCorrectSound()
        setFeedback('correct')
        setTimeout(() => {
          setFeedback(null)
          setMascotState('neutral')
          advance()
        }, CORRECT_FEEDBACK_DELAY_MS)
      } else {
        setMascotState('encouraging')
        playIncorrectSound()
        setFeedback('final')
        setTimeout(() => {
          setFeedback(null)
          setMascotState('neutral')
          advance()
        }, FINAL_REVEAL_DELAY_MS)
      }
      return
    }

    setRunResults((prev) => [...prev, { level: currentLevel, wordId: currentWord.id, correct: isCorrect }])

    if (isCorrect) {
      setMascotState('happy')
      playCorrectSound()
      setFeedback('correct')
      setTimeout(() => {
        setFeedback(null)
        setMascotState('neutral')
        advance()
      }, CORRECT_FEEDBACK_DELAY_MS)
    } else {
      // No timer here: the mascotte's gentle bubble and the retry stay up
      // until the child actually tries again, on their own time.
      setMascotState('encouraging')
      playIncorrectSound()
      setFeedback('incorrect')
      setAttemptNumber(2)
    }
  }

  if (loading) return <div className="page test-scope">Chargement…</div>
  if (loadError) return <div className="page test-scope form-error">{loadError}</div>

  if (!words || words.length === 0) {
    return (
      <div className="page test-scope">
        <p className="empty-hint">Cet entraînement ne contient aucun mot.</p>
        <Link to={`/series/${seriesId}`} className="btn btn-secondary">
          ← Retour
        </Link>
      </div>
    )
  }

  if (finished) {
    const correctCount = runResults.filter((r) => r.correct).length
    return (
      <div className="page test-scope practice-scope">
        <PracticeRewardScreen correctCount={correctCount} totalSteps={totalSteps} seriesId={seriesId} />
      </div>
    )
  }

  // Only the two brief, timed windows (a correct answer, or the final
  // reveal after a wrong retry) freeze the exercise — the guided retry
  // itself ('incorrect') stays fully interactive.
  const isFrozen = feedback === 'correct' || feedback === 'final'
  const bubbleMessage =
    feedback === 'correct'
      ? 'Bravo !'
      : feedback === 'incorrect' && currentWord
        ? `Le mot exact est ${currentWord.text}, essaie encore !`
        : feedback === 'final' && currentWord
          ? `Le mot exact était « ${currentWord.text} »`
          : needsAudio
            ? 'Écoute le mot à écrire'
            : null
  const bubbleTone = feedback === 'correct' ? 'positive' : feedback ? 'gentle' : 'neutral'
  // The replay icon lives inside the bubble itself (see PracticeMascot) on
  // any level that needs audio — including mid-error, so the child can
  // still hear the word again while reading "essaie encore". Not shown on
  // a correct answer, which doesn't need it.
  const showListenIcon = needsAudio && feedback !== 'correct' && currentWord

  return (
    <div className="page test-scope practice-scope">
      <p className="page-subtitle practice-series-title">{seriesTitle}</p>
      <PracticeProgressBar stepNumber={stepNumber} totalSteps={totalSteps} levelNumber={currentLevel} />

      <div className="practice-stage">
        {/* Docked top-left, never centered above the word — the word-image
            (or whichever card the current level shows) stays the one
            dominant element on screen at all times, on every level and on
            both success and failure. */}
        <PracticeMascot
          state={mascotState}
          message={bubbleMessage}
          tone={bubbleTone}
          onIconClick={showListenIcon ? () => speakWord(currentWord.text) : null}
        />

        <div className="practice-stage-content">
          {LevelComponent && currentWord && (
            <LevelComponent
              word={currentWord}
              onAnswered={handleAnswered}
              retry={attemptNumber === 2}
              disabled={isFrozen}
            />
          )}
        </div>
      </div>
    </div>
  )
}
