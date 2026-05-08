import { Routes, Route, Navigate } from 'react-router-dom'
import { AppwriteProvider } from './contexts/AppwriteContext'
import Login from './pages/Login'
import Mesas from './pages/Mesas'
import Pedido from './pages/Pedido'
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AppwriteProvider>
      <div className="h-full bg-white">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/mesas" replace />} />
          <Route path="/mesas" element={
            <ProtectedRoute roles={['admin', 'mesero']}>
              <Mesas />
            </ProtectedRoute>
          } />
          <Route path="/pedido/:mesaId" element={
            <ProtectedRoute roles={['admin', 'mesero']}>
              <Pedido />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AppwriteProvider>
  )
}

export default App