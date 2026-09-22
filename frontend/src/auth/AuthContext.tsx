import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import type { User } from '../api/types'
import { disconnectCableConsumer } from '../cable/cableConsumer'

const TOKEN_STORAGE_KEY = 'zilla_token'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (params: authApi.RegisterParams) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)))

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setAuthToken(null)
    setUser(null)
    disconnectCableConsumer()
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!storedToken) return

    setAuthToken(storedToken)
    authApi
      .me()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [clearSession])

  const applySession = useCallback((token: string, nextUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    setAuthToken(token)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: loggedInUser } = await authApi.login(email, password)
      applySession(token, loggedInUser)
    },
    [applySession],
  )

  const register = useCallback(
    async (params: authApi.RegisterParams) => {
      await authApi.register(params)
      await login(params.email, params.password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
