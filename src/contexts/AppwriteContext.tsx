import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { account, databases } from '../lib/appwrite'
import { Query } from 'appwrite'

const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || ''

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
  dbId: string
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined)

const USER_KEY = 'laseptima_user'

export const AppwriteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session on mount ──
  useEffect(() => {
    restoreSession()
  }, [])

  const restoreSession = async () => {
    // Try to get current Appwrite session
    try {
      const currentAccount = await account.get()

      // Check if admin or mesero
      const storedUser = localStorage.getItem(USER_KEY)
      let parsed: UserInfo | null = null
      if (storedUser) {
        parsed = JSON.parse(storedUser) as UserInfo
      }

      // Verify admin label or mesero status
      if (currentAccount.labels?.includes('admin')) {
        const userInfo: UserInfo = {
          $id: currentAccount.$id,
          name: currentAccount.name,
          role: 'admin',
        }
        setUser(userInfo)
        setRole('admin')
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      } else if (parsed?.role === 'mesero') {
        // Mesero session - keep the stored user info
        setUser(parsed)
        setRole('mesero')
      } else {
        // Unknown user type - just treat as mesero
        const userInfo: UserInfo = {
          $id: currentAccount.$id,
          name: currentAccount.name || 'Mesero',
          role: 'mesero',
        }
        setUser(userInfo)
        setRole('mesero')
        localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
      }
    } catch {
      // No active session - clean up
      localStorage.removeItem(USER_KEY)
    }
    setLoading(false)
  }

  // ── Admin login via Appwrite Auth ──
  const loginAdmin = async (email: string, password: string) => {
    // Create email session directly with Appwrite
    await account.createEmailPasswordSession(email, password)

    // Verify the user is an admin
    const currentAccount = await account.get()
    if (!currentAccount.labels?.includes('admin')) {
      // Not admin - delete session and throw
      await account.deleteSession('current')
      throw new Error('Acceso denegado - no es administrador')
    }

    const userInfo: UserInfo = {
      $id: currentAccount.$id,
      name: currentAccount.name,
      role: 'admin',
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
    setUser(userInfo)
    setRole('admin')
  }

  // ── Mesero login via PIN ──
  // Uses anonymous session + PIN lookup in meseros collection
  const loginMesero = async (pin: string) => {
    // Create anonymous session first (gives us Appwrite access)
    await account.createAnonymousSession()

    // Look up mesero by PIN
    const result = await databases.listDocuments(DB_ID, 'meseros', [
      Query.equal('pin', pin),
      Query.equal('activo', true),
    ])

    if (result.documents.length === 0) {
      await account.deleteSession('current')
      throw new Error('PIN incorrecto')
    }

    const mesero = result.documents[0]
    const userInfo: UserInfo = {
      $id: mesero.$id,
      name: mesero.nombre,
      role: 'mesero',
    }

    localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
    setUser(userInfo)
    setRole('mesero')
  }

  // ── Logout ──
  const logout = async () => {
    try {
      await account.deleteSession('current')
    } catch {
      // Ignore if no session
    }
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setRole(null)
  }

  return (
    <AppwriteContext.Provider value={{ user, role, loading, loginAdmin, loginMesero, logout, dbId: DB_ID }}>
      {children}
    </AppwriteContext.Provider>
  )
}

export const useAppwrite = () => {
  const ctx = useContext(AppwriteContext)
  if (!ctx) throw new Error('useAppwrite must be used within AppwriteProvider')
  return ctx
}
