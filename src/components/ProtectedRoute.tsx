import { Navigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, role, loading } = useAppwrite()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !roles.includes(role || '')) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
