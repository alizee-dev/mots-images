import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyStudents } from '../api/students'
import { getWords } from '../api/words'
import { getSeries } from '../api/series'

const TILES = [
  {
    to: '/students',
    icon: '🧒',
    title: 'Enfants',
    description: 'Gérer les enfants et suivre leurs résultats.',
    statKey: 'students',
    statLabel: (n) => `${n} enfant${n === 1 ? '' : 's'} suivi${n === 1 ? '' : 's'}`,
  },
  {
    to: '/words',
    icon: '🖼️',
    title: 'Ma banque de mots',
    description: 'Créer et illustrer des mots.',
    statKey: 'words',
    statLabel: (n) => `${n} mot${n === 1 ? '' : 's'} dans la banque`,
  },
  {
    to: '/series',
    icon: '📚',
    title: 'Entraînements',
    description: 'Regrouper des mots et les assigner.',
    statKey: 'series',
    statLabel: (n) => `${n} entraînement${n === 1 ? '' : 's'}`,
  },
]

export default function DashboardPage() {
  const [stats, setStats] = useState({})
  // Only the first linked child's first name is used for the greeting below
  // — with several children, picking one avoids an awkward list in a single
  // sentence; with none, no personalized greeting is shown at all.
  const [firstChildName, setFirstChildName] = useState(null)

  useEffect(() => {
    getMyStudents()
      .then((s) => {
        setStats((prev) => ({ ...prev, students: s.length }))
        setFirstChildName(s[0]?.name || null)
      })
      .catch(() => {})
    getWords()
      .then((w) => setStats((prev) => ({ ...prev, words: w.length })))
      .catch(() => {})
    getSeries()
      .then((s) => setStats((prev) => ({ ...prev, series: s.length })))
      .catch(() => {})
  }, [])

  return (
    <div className="dashboard">
      <div className="page-header-row">
        <h2>Tableau de bord</h2>
        <Link to="/words/new" className="btn btn-toggle active">
          ✨ Illustrer
        </Link>
      </div>

      {firstChildName && (
        <p className="dashboard-greeting">Bonjour, l’entraînement de {firstChildName} t’attend</p>
      )}

      <div className="dashboard-hero-actions">
        <Link to="/words" className="dashboard-hero-btn dashboard-hero-btn-primary">
          <span className="dashboard-hero-btn-icon">🖼️</span>
          Illustrer des mots
        </Link>
        <Link to="/series/new" className="dashboard-hero-btn dashboard-hero-btn-accent">
          <span className="dashboard-hero-btn-icon">📚</span>
          Créer un entraînement
        </Link>
      </div>

      <p className="dashboard-secondary-heading">Accès rapide</p>
      <div className="dashboard-tiles dashboard-tiles-secondary">
        {TILES.map((tile) => {
          const count = stats[tile.statKey]
          return (
            <Link key={tile.to} to={tile.to} className="dashboard-tile">
              <span className="dashboard-tile-icon">{tile.icon}</span>
              <span className="dashboard-tile-title">{tile.title}</span>
              <span className="dashboard-tile-description">{tile.description}</span>
              {count !== undefined && <span className="dashboard-tile-stat">{tile.statLabel(count)}</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
