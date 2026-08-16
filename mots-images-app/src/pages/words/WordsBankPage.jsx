import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getWords } from '../../api/words'
import IllustratedWordPreview from '../../components/IllustratedWordPreview'

export default function WordsBankPage() {
  const { fontFamily, theme } = useOutletContext()
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getWords()
      .then(setWords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredWords = words.filter((word) => word.text.toLowerCase().startsWith(search.trim().toLowerCase()))

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Ma banque de mots</h2>
        <Link to="/words/new" className="btn btn-toggle active">
          ➕ Nouveau mot
        </Link>
      </div>

      <input
        type="text"
        className="word-input"
        placeholder="Rechercher un mot…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && filteredWords.length === 0 && (
        <p className="empty-hint">
          {words.length === 0 ? 'Aucun mot dans la banque pour l’instant.' : 'Aucun mot ne correspond à cette recherche.'}
        </p>
      )}

      <ul className="card-list series-word-list">
        {filteredWords.map((word) => (
          <li key={word.id} className="series-word-item">
            <Link to={`/words/${word.id}`} className="word-bank-card-link">
              <IllustratedWordPreview text={word.text} zones={word.zones} theme={theme} fontFamily={fontFamily} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
