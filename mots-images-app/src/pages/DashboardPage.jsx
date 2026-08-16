import { Link } from 'react-router-dom'

const TILES = [
  { to: '/students', icon: '🧒', title: 'Mes élèves', description: 'Gérer les élèves et suivre leurs résultats.' },
  { to: '/words', icon: '🖼️', title: 'Ma banque de mots', description: 'Créer et illustrer des mots.' },
  { to: '/series', icon: '📚', title: 'Mes séries', description: 'Regrouper des mots et les assigner.' },
]

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <h2>Tableau de bord</h2>
      <div className="dashboard-tiles">
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="dashboard-tile">
            <span className="dashboard-tile-icon">{tile.icon}</span>
            <span className="dashboard-tile-title">{tile.title}</span>
            <span className="dashboard-tile-description">{tile.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
