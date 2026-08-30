import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { TestGuardContext } from './testGuardContext'

const TEST_ROUTE_PATTERN = /^\/students\/[^/]+\/assignments\/[^/]+\/test$/
// Practice is ungraded and purely local (see PracticeSessionPage), so
// unlike the real test it never sets `testGuard` below — leaving early
// costs nothing to confirm.
const PRACTICE_ROUTE_PATTERN = /^\/series\/[^/]+\/practice$/

export default function Layout() {
  const { logout } = useAuth()
  const { studentId, seriesId } = useParams()
  const location = useLocation()
  const [testGuard, setTestGuard] = useState(null)

  const isTestScreen = TEST_ROUTE_PATTERN.test(location.pathname)
  const isPracticeScreen = PRACTICE_ROUTE_PATTERN.test(location.pathname)
  // Both are the same kind of immersive, distraction-free screen — full nav
  // swapped for a single "quitter" link — just with a different
  // destination and label.
  const isImmersiveScreen = isTestScreen || isPracticeScreen

  const handleExitClick = (e) => {
    if (testGuard && !window.confirm(testGuard)) {
      e.preventDefault()
    }
  }

  return (
    <div className="app">
      {isImmersiveScreen ? (
        <div className="test-exit-bar no-print">
          <Link
            to={isTestScreen ? (studentId ? `/students/${studentId}` : '/students') : `/series/${seriesId}`}
            className="test-exit-link"
            onClick={handleExitClick}
          >
            {isTestScreen ? '← Quitter le test' : '← Quitter l’entraînement'}
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
              Enfants
            </NavLink>
            <NavLink to="/words" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Banque de mots
            </NavLink>
            <NavLink to="/series" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Entraînements
            </NavLink>
          </nav>
        </header>
      )}

      <main className={isImmersiveScreen ? 'app-main app-main-bare' : 'app-main'}>
        <TestGuardContext.Provider value={{ setTestGuard }}>
          <Outlet />
        </TestGuardContext.Provider>
      </main>
    </div>
  )
}
