import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'

export default function Login() {
  const [mode, setMode] = useState<'admin' | 'mesero'>('mesero')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { loginAdmin, loginMesero } = useAppwrite()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await loginAdmin(email, password)
      navigate('/mesas')
    } catch {
      setError('Credenciales incorrectas')
    }
  }

  const handleMeseroLogin = async (digit: string) => {
    setPin(prev => {
      const newPin = prev + digit
      if (newPin.length === 4) {
        setTimeout(async () => {
          try {
            await loginMesero(newPin)
            navigate('/mesas')
          } catch {
            setError('PIN incorrecto')
            setPin('')
          }
        }, 100)
      }
      return newPin
    })
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const renderKeypad = () => (
    <div className="grid grid-cols-3 gap-4 mt-8">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
        <button
          key={n}
          onClick={() => handleMeseroLogin(String(n))}
          className="h-20 w-20 rounded-lg bg-gray-100 text-3xl font-bold hover:bg-gray-200"
        >
          {n}
        </button>
      ))}
      <button
        onClick={handleBackspace}
        className="h-20 w-20 rounded-lg bg-gray-300 text-xl font-bold hover:bg-gray-400"
      >
        ←
      </button>
      <button
        onClick={() => setPin('')}
        className="h-20 w-20 rounded-lg bg-primary text-white text-xl font-bold hover:opacity-90"
      >
        ✓
      </button>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-4">
      <h1 className="text-4xl font-bold mb-8">La Séptima</h1>
      
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setMode('mesero')}
          className={`px-6 py-3 rounded ${mode === 'mesero' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Mesero
        </button>
        <button
          onClick={() => setMode('admin')}
          className={`px-6 py-3 rounded ${mode === 'admin' ? 'bg-primary text-white' : 'bg-gray-200'}`}
        >
          Admin
        </button>
      </div>

      {mode === 'admin' ? (
        <form onSubmit={handleAdminLogin} className="w-full max-w-sm">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-4 mb-4 border rounded text-lg"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-4 mb-4 border rounded text-lg"
            required
          />
          {error && <p className="text-danger mb-4">{error}</p>}
          <button type="submit" className="w-full py-4 bg-primary text-white rounded text-lg font-bold">
            Entrar
          </button>
        </form>
      ) : (
        <>
          <div className="text-6xl tracking-widest mb-8">
            {pin.split('').map((_, i) => '●').join(' ')}
          </div>
          {error && <p className="text-danger mb-4">{error}</p>}
          {renderKeypad()}
        </>
      )}
    </div>
  )
}