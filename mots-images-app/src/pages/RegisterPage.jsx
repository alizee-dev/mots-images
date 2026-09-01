import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import '../index.css'

export default function RegisterPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Totémots</h1>
        <p className="login-subtitle">Créer un compte enseignant</p>

        <label htmlFor="register-name" className="word-input-label">
          Nom
        </label>
        <input
          id="register-name"
          type="text"
          className="word-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />

        <label htmlFor="register-email" className="word-input-label">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          className="word-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="register-password" className="word-input-label">
          Mot de passe
        </label>
        <input
          id="register-password"
          type="password"
          className="word-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="field-hint">Minimum 8 caractères</p>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-toggle active login-submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>

        <p className="login-switch">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  )
}
