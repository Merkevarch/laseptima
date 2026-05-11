import { Navigate, useLocation } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'

type Props = {
  children: React.ReactNode
  roles: Array<'admin' | 'mesero'>
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, role, loading } = useAppwrite()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-3">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!roles.includes(role)) {
    return <Navigate to="/mesas" replace />
  }

  return <>{children}</>
}
