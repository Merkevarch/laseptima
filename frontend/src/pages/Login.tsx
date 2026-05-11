import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [mode, setMode] = useState<'admin' | 'mesero'>('mesero')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loginAdmin, loginMesero } = useAppwrite()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await loginAdmin(email, password)
      toast.success('Bienvenido, Administrador')
      navigate('/mesas')
    } catch {
      toast.error('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const handleMeseroLogin = async (digit: string) => {
    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === 4) {
      setLoading(true)
      try {
        await loginMesero(newPin)
        toast.success('Sesion iniciada correctamente')
        navigate('/mesas')
      } catch (err: any) {
        toast.error(err.message || 'PIN incorrecto')
        setPin('')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const renderKeypad = () => (
    <div className="grid grid-cols-3 gap-3 mt-6 max-w-xs mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button
          key={n}
          onClick={() => !loading && handleMeseroLogin(String(n))}
          disabled={loading}
          className="h-16 w-16 rounded-xl bg-gray-100 text-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {n}
        </button>
      ))}
      <button
        onClick={handleBackspace}
        disabled={loading}
        className="h-16 w-16 rounded-xl bg-gray-200 text-lg font-bold hover:bg-gray-300 active:scale-95 transition-all"
      >
        ←
      </button>
      <button
        onClick={() => !loading && handleMeseroLogin('0')}
        disabled={loading}
        className="h-16 w-16 rounded-xl bg-gray-100 text-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
      >
        0
      </button>
      <button
        onClick={() => setPin('')}
        disabled={loading}
        className="h-16 w-16 rounded-xl bg-red-100 text-red-600 text-lg font-bold hover:bg-red-200 active:scale-95 transition-all"
      >
        ✕
      </button>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">La Septima</h1>
          <p className="text-gray-500 mt-2">Sistema de Restaurante</p>
        </div>

        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setMode('mesero')}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              mode === 'mesero' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Mesero
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              mode === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Admin
          </button>
        </div>

        {mode === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <input
              type="password"
              placeholder="Contrasena"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-blue-600 scale-125' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            {loading && <p className="text-gray-500 mb-4">Verificando...</p>}
            {renderKeypad()}
          </div>
        )}
      </div>
    </div>
  )
}
