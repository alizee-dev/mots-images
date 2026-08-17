import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    // Always sends straight back to /login with no "return to where I was"
    // state — logging in should always land on the dashboard, not wherever
    // an expired session happened to be.
    return <Navigate to="/login" replace />
  }

  return children
}
