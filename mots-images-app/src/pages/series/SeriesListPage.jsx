import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSeries } from '../../api/series'

export default function SeriesListPage() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSeries()
      .then(setSeries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Mes séries</h2>
        <Link to="/series/new" className="btn btn-toggle active">
          ➕ Nouvelle série
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && series.length === 0 && <p className="empty-hint">Aucune série pour l’instant.</p>}

      <ul className="card-list">
        {series.map((s) => (
          <li key={s.id}>
            <Link to={`/series/${s.id}`} state={{ title: s.title }} className="card-list-item card-list-item-row">
              <span>📚 {s.title}</span>
              <span className="card-list-meta">{s.count} mot(s)</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
