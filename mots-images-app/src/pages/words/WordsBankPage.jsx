import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWords } from '../../api/words'

export default function WordsBankPage() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getWords()
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Ma banque de mots</h2>
        <Link to="/words/new" className="btn btn-toggle active">
          ➕ Nouveau mot
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && words.length === 0 && <p className="empty-hint">Aucun mot dans la banque pour l’instant.</p>}

      <ul className="card-list">
        {words.map((word) => {
          const illustrated = (word.zones || []).length
          return (
            <li key={word.id}>
              <Link to={`/words/${word.id}`} className="card-list-item card-list-item-row">
                <span>🔤 {word.text}</span>
                <span className="card-list-meta">{word.sentence}</span>
                <span className="card-list-score">{illustrated ? `${illustrated} lettre(s) illustrée(s)` : 'Non illustré'}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
