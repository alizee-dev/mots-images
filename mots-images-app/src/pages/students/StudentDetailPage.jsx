import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getMyStudents, getStudentTestSessions } from '../../api/students'
import { getPendingAssignments } from '../../api/assignments'
import { getTestSessionWords } from '../../api/testSessions'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Percentage bands rather than raw score: series don't all have the same
// number of words, so a raw total_score isn't comparable session to
// session — only score-over-word-count is.
const LEVEL_COLORS = { good: '#3a7a4d', medium: '#b5793a', low: '#a13c2d' }
const LEVEL_LABELS = { good: 'Bon niveau (≥ 70 %)', medium: 'À consolider (50–69 %)', low: 'À revoir (< 50 %)' }

function levelFor(percentage) {
  if (percentage == null) return null
  if (percentage >= 70) return 'good'
  if (percentage >= 50) return 'medium'
  return 'low'
}

function LevelDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null
  const color = LEVEL_COLORS[levelFor(payload.percentage)] || '#9aa5b1'
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="#f9f7f3" strokeWidth={2} />
}

function ProgressTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="progress-tooltip">
      <strong>{point.title}</strong>
      <span>
        {formatShortDate(point.date)} — {point.score} / {point.wordCount} pts
      </span>
      <span>{Math.round(point.percentage)} %</span>
    </div>
  )
}

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const [studentName, setStudentName] = useState(location.state?.studentName || null)
  const [sessions, setSessions] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      getStudentTestSessions(studentId),
      getPendingAssignments(studentId),
      studentName ? Promise.resolve(null) : getMyStudents(),
    ])
      .then(([testSessions, pendingAssignments, students]) => {
        setSessions(testSessions)
        setPending(pendingAssignments)
        if (students) {
          const found = students.find((s) => String(s.id) === studentId)
          setStudentName(found ? found.name : 'Enfant')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  useEffect(() => {
    if (sessions.length === 0) {
      setChartData([])
      setChartLoading(false)
      return
    }
    setChartLoading(true)
    // Word count per session (needed to turn a raw total_score into a
    // comparable percentage) isn't in the session-list response — it's
    // derived from the same per-word detail already used on the session
    // detail page, fetched once per session in parallel.
    Promise.all(
      sessions.map((session) =>
        getTestSessionWords(session.id)
          .then((words) => ({ session, wordCount: words.length }))
          .catch(() => ({ session, wordCount: null }))
      )
    )
      .then((results) => {
        const points = results
          .filter((r) => r.wordCount)
          .map(({ session, wordCount }) => {
            const score = Number(session.total_score)
            return {
              date: session.taken_at,
              title: session.title,
              score,
              wordCount,
              percentage: (score / wordCount) * 100,
            }
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
        setChartData(points)
      })
      .finally(() => setChartLoading(false))
  }, [sessions])

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/students">← Enfants</Link>
      </p>
      <div className="page-header-row">
        <h2>{studentName || 'Enfant'}</h2>
        <Link to="/series/new" className="btn btn-toggle active">
          ➕ Créer un entraînement
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && (
        <>
          {pending.length > 0 && (
            <>
              <h3 className="page-subtitle">À faire</h3>
              <ul className="card-list">
                {pending.map((assignment) => (
                  <li key={assignment.id}>
                    <Link
                      to={`/series/${assignment.series_id}`}
                      state={{
                        title: assignment.title,
                        fromAssignment: { assignmentId: assignment.id, studentId, studentName },
                      }}
                      className="card-list-item card-list-item-row"
                    >
                      <span>📌 {assignment.title}</span>
                      <span className="card-list-meta">{assignment.count} mot(s)</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {sessions.length > 0 && (
            <>
              <h3 className="page-subtitle">Progression</h3>
              <div className="chart-card">
                {chartLoading ? (
                  <p>Chargement du graphique…</p>
                ) : chartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="#d9d2c5" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatShortDate}
                          tick={{ fill: '#7a7266', fontSize: 11 }}
                          axisLine={{ stroke: '#d9d2c5' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: '#7a7266', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip content={<ProgressTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="percentage"
                          stroke="#c9c0ab"
                          strokeWidth={2.5}
                          dot={<LevelDot />}
                          activeDot={{ r: 8 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="legend-row">
                      {Object.entries(LEVEL_LABELS).map(([level, label]) => (
                        <span key={level} className="legend-item">
                          <span className="legend-dot" style={{ background: LEVEL_COLORS[level] }} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="empty-hint">Impossible de calculer la progression pour l’instant.</p>
                )}
              </div>
            </>
          )}

          {sessions.length > 0 && (
            <>
              <h3 className="page-subtitle">Historique des sessions de test</h3>
              <ul className="card-list">
                {sessions.map((session) => (
                  <li key={session.id ?? `${session.series_id}-${session.taken_at}`}>
                    <Link
                      to={`/students/${studentId}/sessions/${session.id}`}
                      state={{ seriesTitle: session.title, takenAt: session.taken_at }}
                      className="card-list-item card-list-item-row"
                    >
                      <span>📚 {session.title}</span>
                      <span className="card-list-meta">{formatDate(session.taken_at)}</span>
                      <span className="card-list-score">{session.total_score} pts</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
