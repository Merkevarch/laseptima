import React, { createContext, useContext, useEffect, useState } from 'react'
import { Client, Account } from 'appwrite'

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const APPWRITE_PROJECT = import.meta.env.VITE_APPWRITE_PROJECT || ''

type UserRole = 'admin' | 'mesero' | null

type AppwriteContextType = {
  user: any
  role: UserRole
  loading: boolean
  loginAdmin: (email: string, password: string) => Promise<void>
  loginMesero: (pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AppwriteContext = createContext<AppwriteContextType | undefined>(undefined)

export const AppwriteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client] = useState(() => new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT))
  const [account] = useState(() => new Account(client))
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const session = await account.get()
      setUser(session)
      const userRole = session.labels?.includes('admin') ? 'admin' : 'mesero'
      setRole(userRole)
    } catch {
      setUser(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  const loginAdmin = async (email: string, password: string) => {
    await account.createEmailSession(email, password)
    await checkSession()
  }

  const loginMesero = async (pin: string) => {
    const response = await fetch('/api/mesero/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
    if (!response.ok) throw new Error('PIN incorrecto')
    const data = await response.json()
    setUser({ $id: data.userId, name: data.name })
    setRole('mesero')
  }

  const logout = async () => {
    await account.deleteSession('current')
    setUser(null)
    setRole(null)
  }

  return (
    <AppwriteContext.Provider value={{ user, role, loading, loginAdmin, loginMesero, logout }}>
      {children}
    </AppwriteContext.Provider>
  )
}

export const useAppwrite = () => {
  const ctx = useContext(AppwriteContext)
  if (!ctx) throw new Error('useAppwrite must be used within AppwriteProvider')
  return ctx
}