import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppwriteProvider } from './contexts/AppwriteContext'
import Login from './pages/Login'
import Mesas from './pages/Mesas'
import Pedido from './pages/Pedido'
import Admin from './pages/Admin'
import Facturacion from './pages/Facturacion'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AppwriteProvider>
      <div className="h-full bg-white">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#181816',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 20px',
            },
            success: { duration: 3000 },
            error: { duration: 5000 },
          }}
        />
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
          <Route path="/facturacion" element={
            <ProtectedRoute roles={['admin']}>
              <Facturacion />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </AppwriteProvider>
  )
}

export default App
