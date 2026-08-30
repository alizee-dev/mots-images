import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getTestSessionWords } from '../../api/testSessions'

export default function SessionDetailPage() {
  const { studentId, sessionId } = useParams()
  const location = useLocation()
  const seriesTitle = location.state?.seriesTitle
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getTestSessionWords(sessionId)
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to={`/students/${studentId}`}>← Retour à l’enfant</Link>
      </p>
      <h2>{seriesTitle || 'Détail de la session'}</h2>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Mot</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word, i) => (
              <tr key={i}>
                <td>{word.text}</td>
                <td>{word.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
