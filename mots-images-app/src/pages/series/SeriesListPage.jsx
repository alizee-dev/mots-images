import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { archiveSeries, getSeries } from '../../api/series'
import TrashIcon from '../../components/TrashIcon'

export default function SeriesListPage() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [archivingId, setArchivingId] = useState(null)

  useEffect(() => {
    getSeries()
      .then(setSeries)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleArchive = async (s) => {
    if (
      !window.confirm(`Supprimer définitivement l’entraînement « ${s.title} » ? Cette action est irréversible.`)
    ) {
      return
    }
    setArchivingId(s.id)
    setError(null)
    try {
      await archiveSeries(s.id)
      setSeries((prev) => prev.filter((row) => row.id !== s.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">← Accueil</Link>
      </p>
      <div className="page-header-row">
        <h2>Entraînements</h2>
        <Link to="/series/new" className="btn btn-toggle active">
          ➕ Nouvel entraînement
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p>Chargement…</p>}

      {!loading && series.length === 0 && <p className="empty-hint">Aucun entraînement pour l’instant.</p>}

      <ul className="card-list">
        {series.map((s) => (
          <li key={s.id} className="card-list-row">
            <Link to={`/series/${s.id}`} state={{ title: s.title }} className="card-list-item card-list-item-row">
              <span>📚 {s.title}</span>
              <span className="card-list-meta">{s.count} mot(s)</span>
            </Link>
            <button
              type="button"
              className="icon-btn-danger"
              onClick={() => handleArchive(s)}
              disabled={archivingId === s.id}
              aria-label={`Supprimer définitivement l'entraînement "${s.title}"`}
              title="Supprimer définitivement"
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
