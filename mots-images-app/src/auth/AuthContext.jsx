import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin } from '../api/auth'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setAuthToken(token)
  }, [token])

  const logout = useCallback(() => {
    setToken(null)
    setIsAdmin(false)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const { token: newToken, isAdmin: admin } = await apiLogin(email, password)
    setToken(newToken)
    setIsAdmin(Boolean(admin))
  }, [])

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, isAdmin, login, logout }),
    [token, isAdmin, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
