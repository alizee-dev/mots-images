import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

const TEST_ROUTE_PATTERN = /^\/students\/[^/]+\/assignments\/[^/]+\/test$/

export default function Layout() {
  const { logout } = useAuth()
  const { studentId } = useParams()
  const location = useLocation()
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [theme, setTheme] = useState('light')

  const fontFamily = dyslexicFont ? 'OpenDyslexic' : 'system-ui'
  const isTestScreen = TEST_ROUTE_PATTERN.test(location.pathname)

  return (
    <div className="app">
      {isTestScreen ? (
        <div className="test-exit-bar no-print">
          <Link to={studentId ? `/students/${studentId}` : '/students'} className="test-exit-link">
            ← Quitter le test
          </Link>
        </div>
      ) : (
        <header className="app-header no-print">
          <h1>
            <NavLink to="/" className="app-logo-link">
              Mots-images
            </NavLink>
          </h1>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🏠 Accueil
            </NavLink>
            <NavLink to="/students" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Mes élèves
            </NavLink>
            <NavLink to="/words" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Banque de mots
            </NavLink>
            <NavLink to="/series" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Mes séries
            </NavLink>
          </nav>
          <div className="app-header-actions">
            <button
              type="button"
              className={`btn btn-toggle ${dyslexicFont ? 'active' : ''}`}
              onClick={() => setDyslexicFont((v) => !v)}
            >
              🔤 Police DYS
            </button>
            <button
              type="button"
              className={`btn btn-toggle ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              🌙 Mode sombre
            </button>
            <button type="button" className="btn btn-secondary" onClick={logout}>
              🚪 Déconnexion
            </button>
          </div>
        </header>
      )}

      <main className={isTestScreen ? 'app-main app-main-bare' : 'app-main'}>
        <Outlet context={{ dyslexicFont, theme, fontFamily }} />
      </main>
    </div>
  )
}
