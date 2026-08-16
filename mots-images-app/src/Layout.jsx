import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

export default function Layout() {
  const { logout } = useAuth()
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [theme, setTheme] = useState('light')

  const fontFamily = dyslexicFont ? 'OpenDyslexic' : 'system-ui'

  return (
    <div className={`app ${dyslexicFont ? 'font-dys' : ''}`}>
      <header className="app-header no-print">
        <h1>
          <NavLink to="/" className="app-logo-link">
            Mots-images
          </NavLink>
        </h1>
        <nav className="app-nav">
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

      <main className="app-main">
        <Outlet context={{ dyslexicFont, theme, fontFamily }} />
      </main>
    </div>
  )
}
