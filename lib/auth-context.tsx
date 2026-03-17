'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'

/* =====================================================
   TYPES
===================================================== */

export interface User {
  id:            string
  email:         string
  name:          string
  role:          'ADMIN' | 'INTERVIEWER' | 'CANDIDATE'
  profileImage:  string | null
  phone:         string | null
  emailVerified: boolean
}

export interface AuthContextType {
  user:            User | null
  accessToken:     string | null
  isLoading:       boolean
  error:           string | null
  isAuthenticated: boolean
  login:              (email: string, password: string) => Promise<void>
  register:           (email: string, password: string, name: string, role?: string) => Promise<void>
  logout:             () => Promise<void>
  clearError:         () => void
  refreshAccessToken: () => Promise<string | null>
}

/* =====================================================
   CONSTANTS
===================================================== */

// Refresh 2 minutes before the 15-minute token expiry
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000

/* =====================================================
   HELPERS
===================================================== */

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

async function apiFetch(url: string, options: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  })
}

/* =====================================================
   CONTEXT
===================================================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/* =====================================================
   PROVIDER
===================================================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // Prevent duplicate refresh calls from React StrictMode double-invoking effects
  const isRefreshingRef = useRef(false)
  // Track if initial restore has already run
  const didRestoreRef   = useRef(false)

  /* -------------------------
     Save / clear auth state
  -------------------------- */

  const setAuth = useCallback((userData: User, token: string) => {
    setUser(userData)
    setAccessToken(token)
    // Store user for UI restoration only — token is memory-only
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  const clearAuth = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setError(null)
    localStorage.removeItem('user')
  }, [])

  /* =====================================================
     REFRESH ACCESS TOKEN
     Uses a ref-based lock to prevent simultaneous calls
  ===================================================== */

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    // If a refresh is already in flight, skip this call
    if (isRefreshingRef.current) return null
    isRefreshingRef.current = true

    try {
      const res = await apiFetch('/api/auth/refresh', { method: 'POST' })

      if (!res.ok) {
        clearAuth()
        return null
      }

      const json     = await res.json()
      const newToken: string = json.accessToken
      const newUser:  User   = json.user

      setAuth(newUser, newToken)
      return newToken
    } catch {
      clearAuth()
      return null
    } finally {
      isRefreshingRef.current = false
    }
  }, [setAuth, clearAuth])

  /* =====================================================
     RESTORE AUTH ON MOUNT
     Runs once — guarded by didRestoreRef so StrictMode
     double-invocation does not fire two refresh calls
  ===================================================== */

  useEffect(() => {
    // Guard against StrictMode double-invoke
    if (didRestoreRef.current) return
    didRestoreRef.current = true

    const restoreAuth = async () => {
      try {
        const token = await refreshAccessToken()

        if (!token) {
          // Refresh failed — restore user from localStorage for UI
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            try { setUser(JSON.parse(storedUser)) }
            catch { localStorage.removeItem('user') }
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    restoreAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* =====================================================
     AUTO-REFRESH — schedule once per token
     Fires a single setTimeout 2 minutes before expiry
  ===================================================== */

  useEffect(() => {
    if (!accessToken) return

    const expiry = parseJwtExpiry(accessToken)
    if (!expiry) return

    const delay = expiry - Date.now() - REFRESH_BEFORE_EXPIRY_MS

    if (delay <= 0) {
      // Token already near-expired — refresh immediately
      refreshAccessToken()
      return
    }

    const timer = setTimeout(() => {
      refreshAccessToken()
    }, delay)

    return () => clearTimeout(timer)
  }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  /* =====================================================
     LOGIN
  ===================================================== */

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      const res  = await apiFetch('/api/auth/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Login failed')
      setAuth(json.user, json.tokens.accessToken)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  /* =====================================================
     REGISTER
  ===================================================== */

  const register = async (
    email:    string,
    password: string,
    name:     string,
    role    = 'CANDIDATE'
  ) => {
    try {
      setError(null)
      setIsLoading(true)
      const res  = await apiFetch('/api/auth/register', {
        method: 'POST',
        body:   JSON.stringify({ email, password, name, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Registration failed')
      setAuth(json.user, json.tokens.accessToken)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw new Error(message)
    } finally {
      setIsLoading(false)
    }
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Silent — clear local state regardless
    } finally {
      clearAuth()
    }
  }

  /* =====================================================
     VALUE
  ===================================================== */

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated: !!user && !!accessToken,
    login,
    register,
    logout,
    clearError: () => setError(null),
    refreshAccessToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/* =====================================================
   HOOK
===================================================== */

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}