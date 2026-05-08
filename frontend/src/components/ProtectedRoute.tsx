import { Navigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'

type Props = {
  children: React.ReactNode
  roles: Array<'admin' | 'mesero'>
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, role, loading } = useAppwrite()

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>
  
  if (!user || !role) return <Navigate to="/login" replace />
  
  if (!roles.includes(role)) return <Navigate to="/mesas" replace />

  return <>{children}</>
}