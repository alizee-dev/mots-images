import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { TestGuardContext } from './testGuardContext'
import ChildIcon from './components/ChildIcon'
import ImageIcon from './components/ImageIcon'
import TargetIcon from './components/TargetIcon'
import EvaluationIcon from './components/EvaluationIcon'
import LogoutIcon from './components/LogoutIcon'

const TEST_ROUTE_PATTERN = /^\/students\/[^/]+\/assignments\/[^/]+\/test$/
// Practice is ungraded and purely local (see PracticeSessionPage), so
// unlike the real test it never sets `testGuard` below — leaving early
// costs nothing to confirm.
const PRACTICE_ROUTE_PATTERN = /^\/series\/[^/]+\/practice$/

export default function Layout() {
  const { logout, isAdmin } = useAuth()
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
                Totémots
              </NavLink>
            </h1>
            <div className="app-header-actions">
              {/* Only ever rendered for an admin account — not just hidden
                  by CSS, absent from the DOM entirely when isAdmin is
                  false. */}
              {isAdmin && (
                <NavLink to="/admin" className="btn btn-ghost">
                  Administration
                </NavLink>
              )}
              <button type="button" className="btn btn-secondary" onClick={logout}>
                <LogoutIcon size={18} />
                Déconnexion
              </button>
            </div>
          </div>
          {/* "Accueil" isn't repeated here — the logo above already links
              there, so this row only lists the destinations that would
              otherwise need a second click through Accueil to reach. */}
          {/* Ordered by how often a parent actually reaches for each one day
              to day — material and the two activities built on it first,
              the child's own record last, since that one is consulted more
              occasionally (a check-in on progress) than acted on. */}
          {/* aria-label/title on each, alongside the visible label — the
              label text is hidden (not removed from the DOM) on a narrow
              screen (see .nav-link in index.css), so the accessible name
              still needs a source that survives that. */}
          <nav className="app-nav">
            <NavLink
              to="/words"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              aria-label="Banque de mots"
              title="Banque de mots"
            >
              <ImageIcon size={20} />
              <span>Banque de mots</span>
            </NavLink>
            <NavLink
              to="/training"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              aria-label="Entraînements"
              title="Entraînements"
            >
              <TargetIcon size={20} />
              <span>Entraînements</span>
            </NavLink>
            <NavLink
              to="/evaluations"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              aria-label="Évaluations"
              title="Évaluations"
            >
              <EvaluationIcon size={20} />
              <span>Évaluations</span>
            </NavLink>
            <NavLink
              to="/students"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              aria-label="Enfants"
              title="Enfants"
            >
              <ChildIcon size={20} />
              <span>Enfants</span>
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
