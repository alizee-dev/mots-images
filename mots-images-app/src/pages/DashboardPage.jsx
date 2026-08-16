import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyStudents } from '../api/students'
import { getWords } from '../api/words'
import { getSeries } from '../api/series'

const TILES = [
  {
    to: '/students',
    icon: '🧒',
    title: 'Mes élèves',
    description: 'Gérer les élèves et suivre leurs résultats.',
    statKey: 'students',
    statLabel: (n) => `${n} élève${n === 1 ? '' : 's'} suivi${n === 1 ? '' : 's'}`,
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
    title: 'Mes séries',
    description: 'Regrouper des mots et les assigner.',
    statKey: 'series',
    statLabel: (n) => `${n} série${n === 1 ? '' : 's'}`,
  },
]

export default function DashboardPage() {
  const [stats, setStats] = useState({})

  useEffect(() => {
    getMyStudents()
      .then((s) => setStats((prev) => ({ ...prev, students: s.length })))
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
          ✏️ Créer un mot
        </Link>
      </div>
      <div className="dashboard-tiles">
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
