import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin } from '../api/auth'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  const logout = useCallback(() => {
    setToken(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const { token: newToken } = await apiLogin(email, password)
    setToken(newToken)
  }, [])

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, login, logout }),
    [token, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
