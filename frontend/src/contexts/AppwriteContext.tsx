import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Client, Account } from 'appwrite'

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const APPWRITE_PROJECT = import.meta.env.VITE_APPWRITE_PROJECT || ''
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || ''

// API_BASE: Use relative paths (/api/...) so requests go to the same origin.
// In production, Cloudflare Pages Function (functions/api/[[route]].ts) proxies
// these to the Worker API. In development, Vite's dev server proxy handles it.
// Optionally, VITE_API_URL can still be set to override (e.g., direct Worker URL).
const API_BASE = import.meta.env.VITE_API_URL || ''

type UserRole = 'admin' | 'mesero' | null

type UserInfo = {
  $id: string
  name: string
  role: UserRole
}

type AppwriteContextType = {
  user: UserInfo | null
  role: UserRole
  loading: boolean
  loginAdmin: (email: string, password: string) => Promise<void>
  loginMesero: (pin: string) => Promise<void>
  logout: () => Promise<void>
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>
  dbId: string
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined)

const TOKEN_KEY = 'laseptima_token'
const USER_KEY = 'laseptima_user'

export const AppwriteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client] = useState(() => new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT))
  const [account] = useState(() => new Account(client))
  const [user, setUser] = useState<UserInfo | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session on mount ──
  useEffect(() => {
    restoreSession()
  }, [])

  const restoreSession = async () => {
    // Both admin and mesero sessions are stored as JWT in localStorage
    // No need to check Appwrite Auth sessions (avoids CORS issues)
    const token = localStorage.getItem(TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as UserInfo
        // Verify token is still valid (decode payload without verification)
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp > Math.floor(Date.now() / 1000)) {
          setUser(parsed)
          setRole(parsed.role as UserRole)
        } else {
          // Token expired, clean up
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }

    setLoading(false)
  }

  // ── Admin login (via Worker API - no CORS issues) ──
  const loginAdmin = async (email: string, password: string) => {
    // All auth goes through the Worker API (server-to-server with Appwrite)
    // This avoids CORS issues since the browser only talks to our Worker
    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Credenciales incorrectas')
    }

    const data = await response.json()
    const userInfo: UserInfo = {
      $id: data.userId,
      name: data.name,
      role: 'admin',
    }

    // Store JWT and user info
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo))

    setUser(userInfo)
    setRole('admin')
  }

  // ── Mesero login (PIN → JWT) ──
  const loginMesero = async (pin: string) => {
    const response = await fetch(`${API_BASE}/api/mesero/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'PIN incorrecto')
    }

    const data = await response.json()
    const userInfo: UserInfo = {
      $id: data.userId,
      name: data.name,
      role: 'mesero',
    }

    // Store JWT and user info
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo))

    setUser(userInfo)
    setRole('mesero')
  }

  // ── Logout ──
  const logout = async () => {
    try {
      await account.deleteSession('current')
    } catch {
      // Ignore if no Appwrite session (mesero case)
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setRole(null)
  }

  // ── apiFetch: fetch with JWT header and API_BASE ──
  const apiFetch = useCallback(async (path: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem(TOKEN_KEY)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = `${API_BASE}${path}`
    const response = await fetch(url, { ...options, headers })

    // If 401, token expired → logout
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setUser(null)
      setRole(null)
      throw new Error('Sesion expirada')
    }

    return response
  }, [])

  return (
    <AppwriteContext.Provider value={{ user, role, loading, loginAdmin, loginMesero, logout, apiFetch, dbId: DB_ID }}>
      {children}
    </AppwriteContext.Provider>
  )
}

export const useAppwrite = () => {
  const ctx = useContext(AppwriteContext)
  if (!ctx) throw new Error('useAppwrite must be used within AppwriteProvider')
  return ctx
}
