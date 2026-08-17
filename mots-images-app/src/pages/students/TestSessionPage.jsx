import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getPendingAssignments } from '../../api/assignments'
import { getSeriesDetail } from '../../api/series'
import { getMyStudents } from '../../api/students'
import { submitTestSession } from '../../api/testSessions'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'
import { TestGuardContext } from '../../testGuardContext'

const EXIT_WARNING = 'Quitter maintenant abandonnera ce test : la progression ne sera pas enregistrée. Continuer ?'

function normalize(value) {
  return value.trim().toLowerCase()
}

// Sentences come in two conventions: some teachers write the word out in
// full ("Le poisson nage.") and expect it to be blanked out automatically;
// others already write their own blank. That blank itself isn't written one
// consistent way either — underscores ("Le ___ nage...") or, going by real
// data in this app, a run of dots ("Le ................. nage..."), which is
// the standard French "phrase à trous" convention on worksheets. A sentence
// that already has either kind of blank must be shown as-is: running it
// through the literal-word replacement below would never match (the word
// isn't there to find) and fall through to the generic fallback, hiding a
// perfectly good sentence. Returns null only when there's truly nothing
// usable to show.
const EXISTING_BLANK = /(_{3,}|\.{3,})/

function maskWordInSentence(sentence, text) {
  if (!sentence) return null
  if (EXISTING_BLANK.test(sentence)) return sentence
  if (!text) return null
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'i')
  if (!re.test(sentence)) return null
  return sentence.replace(re, '___')
}

export default function TestSessionPage() {
  const { studentId, assignmentId } = useParams()
  const location = useLocation()
  const { setTestGuard } = useContext(TestGuardContext)

  const [studentName, setStudentName] = useState(location.state?.studentName || null)
  const [seriesTitle, setSeriesTitle] = useState(null)
  const [words, setWords] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [answer, setAnswer] = useState('')
  const [wrongFirstTry, setWrongFirstTry] = useState(false)
  const [resolved, setResolved] = useState(null)
  const [results, setResults] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [finished, setFinished] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const tasks = [getPendingAssignments(studentId)]
        if (!studentName) tasks.push(getMyStudents())
        const [pending, students] = await Promise.all(tasks)

        const assignment = pending.find((a) => String(a.id) === assignmentId)
        if (!assignment) {
          if (!cancelled) {
            setNotFound(true)
            setLoading(false)
          }
          return
        }

        const rows = await getSeriesDetail(assignment.series_id)
        if (cancelled) return

        const sorted = [...rows].sort((a, b) => a.order - b.order)
        setWords(sorted)
        setSeriesTitle(assignment.title)
        if (students) {
          const found = students.find((s) => String(s.id) === studentId)
          setStudentName(found ? found.name : null)
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, assignmentId])

  // Guards both in-app navigation (the "← Quitter le test" link, via
  // TestGuardContext) and closing the tab/browser (via beforeunload) for as
  // long as there's a test in progress whose result hasn't been submitted
  // yet — nothing to protect before words have loaded or after `finished`.
  useEffect(() => {
    const active = Boolean(words && words.length > 0 && !finished)
    setTestGuard(active ? EXIT_WARNING : null)
    if (!active) return undefined
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setTestGuard(null)
    }
  }, [words, finished, setTestGuard])

  const currentWord = words && words[currentIndex]
  const maskedSentence = currentWord ? maskWordInSentence(currentWord.sentence, currentWord.text) : null

  const submitResults = async (finalResults) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitTestSession(assignmentId, finalResults)
      setResults(finalResults)
      setFinished(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAnswer = (e) => {
    e.preventDefault()
    if (resolved || !currentWord) return
    const correct = normalize(answer) === normalize(currentWord.text)

    if (correct) {
      const score = attemptNumber === 1 ? 1 : 0.5
      setResolved({ correct: true, score, attemptsCount: attemptNumber, showHint: false })
      return
    }

    if (attemptNumber === 1) {
      setAttemptNumber(2)
      setWrongFirstTry(true)
      setAnswer('')
      inputRef.current?.focus()
      return
    }

    setResolved({ correct: false, score: 0, attemptsCount: 2, showHint: true })
  }

  const handleNextWord = () => {
    const finalResults = [...results, { wordId: currentWord.id, attemptsCount: resolved.attemptsCount, score: resolved.score }]

    if (currentIndex + 1 < words.length) {
      setResults(finalResults)
      setResolved(null)
      setAttemptNumber(1)
      setAnswer('')
      setWrongFirstTry(false)
      setCurrentIndex((i) => i + 1)
    } else {
      // Last word: keep the feedback panel (and its retry button) mounted
      // until the submission actually succeeds, instead of resetting
      // `resolved` up front — otherwise a failed POST would silently drop
      // back to the answer form for a word already scored.
      submitResults(finalResults)
    }
  }

  const totalScore = useMemo(() => results.reduce((sum, r) => sum + r.score, 0), [results])

  if (loading) return <div className="page test-scope">Chargement…</div>

  if (notFound) {
    return (
      <div className="page test-scope">
        <p className="form-error">Ce test n’est plus disponible (déjà passé ou introuvable).</p>
        <Link to={`/students/${studentId}`} className="btn btn-secondary">
          ← Retour à la fiche élève
        </Link>
      </div>
    )
  }

  if (loadError) return <div className="page test-scope form-error">{loadError}</div>

  if (!words || words.length === 0) {
    return (
      <div className="page test-scope">
        <p className="empty-hint">Cette série ne contient aucun mot.</p>
        <Link to={`/students/${studentId}`} className="btn btn-secondary">
          ← Retour à la fiche élève
        </Link>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="page test-scope">
        <div className="test-header-row">
          <h2>Test terminé{studentName ? ` — ${studentName}` : ''}</h2>
          <p className="page-subtitle">{seriesTitle}</p>
        </div>
        <div className="test-card">
          <p className="test-final-score">
            Score : {totalScore} / {words.length}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mot</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, i) => (
                <tr key={word.id}>
                  <td>{word.text}</td>
                  <td>{results[i]?.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to={`/students/${studentId}`} className="btn btn-toggle active">
            ← Retour à la fiche élève
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page test-scope">
      <div className="page-header-row test-header-row">
        <h2>{seriesTitle}</h2>
        <span className="page-subtitle">
          Mot {currentIndex + 1} / {words.length}
        </span>
      </div>

      <div className="test-card">
        <p className="test-sentence font-dys">{maskedSentence || 'Écris le mot :'}</p>

        {!resolved && (
          <form className="test-answer-form" onSubmit={handleSubmitAnswer}>
            <input
              ref={inputRef}
              type="text"
              className="word-input font-dys"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {wrongFirstTry && <p className="form-error">❌ Pas tout à fait, essaie encore !</p>}
            <button type="submit" className="btn btn-toggle active">
              Valider
            </button>
          </form>
        )}

        {resolved && (
          <div className="test-feedback">
            {resolved.correct ? (
              <p className="form-success">
                {resolved.attemptsCount === 1 ? '✅ Bravo, du premier coup !' : '✅ Bien joué au 2e essai !'} (+{resolved.score} pt)
              </p>
            ) : (
              <>
                <p className="form-error font-dys">😕 Ce n’était pas ça. Le mot était : {currentWord.text}</p>
                <div className="test-hint-illustration">
                  <IllustratedWordPreview text={currentWord.text} zones={currentWord.zones} />
                </div>
              </>
            )}

            {submitError && <p className="form-error">{submitError}</p>}

            <button type="button" className="btn btn-toggle active" onClick={handleNextWord} disabled={submitting}>
              {submitting
                ? 'Envoi…'
                : currentIndex + 1 < words.length
                  ? 'Mot suivant →'
                  : 'Voir le résultat →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
