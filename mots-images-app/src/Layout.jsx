import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { TestGuardContext } from './testGuardContext'

const TEST_ROUTE_PATTERN = /^\/students\/[^/]+\/assignments\/[^/]+\/test$/

export default function Layout() {
  const { logout } = useAuth()
  const { studentId } = useParams()
  const location = useLocation()
  const [testGuard, setTestGuard] = useState(null)

  const isTestScreen = TEST_ROUTE_PATTERN.test(location.pathname)

  const handleExitClick = (e) => {
    if (testGuard && !window.confirm(testGuard)) {
      e.preventDefault()
    }
  }

  return (
    <div className="app">
      {isTestScreen ? (
        <div className="test-exit-bar no-print">
          <Link
            to={studentId ? `/students/${studentId}` : '/students'}
            className="test-exit-link"
            onClick={handleExitClick}
          >
            ← Quitter le test
          </Link>
        </div>
      ) : (
        <header className="app-header no-print">
          <div className="app-header-top">
            <h1>
              <NavLink to="/" className="app-logo-link">
                Mots-images
              </NavLink>
            </h1>
            <div className="app-header-actions">
              <button type="button" className="btn btn-secondary" onClick={logout}>
                🚪 Déconnexion
              </button>
            </div>
          </div>
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
        </header>
      )}

      <main className={isTestScreen ? 'app-main app-main-bare' : 'app-main'}>
        <TestGuardContext.Provider value={{ setTestGuard }}>
          <Outlet />
        </TestGuardContext.Provider>
      </main>
    </div>
  )
}
