import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'
import { databases } from '../lib/appwrite'

type Mesa = {
  $id: string
  numero: number
  capacidad: number
  estado: 'libre' | 'ocupada'
}

export default function Mesas() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { logout, role } = useAppwrite()

  useEffect(() => {
    fetchMesas()
  }, [])

  const fetchMesas = async () => {
    try {
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        'mesas'
      )
      setMesas(response.documents as Mesa[])
    } catch (error) {
      console.error('Error fetching mesas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando mesas...</div>

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mesas</h1>
        <div className="flex gap-2">
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {mesas.map(mesa => (
          <button
            key={mesa.$id}
            onClick={() => navigate(`/pedido/${mesa.$id}`)}
            className={`h-36 w-36 rounded-lg flex flex-col items-center justify-center text-xl font-bold transition-transform active:scale-95
              ${mesa.estado === 'libre' ? 'bg-mesaLibre text-white' : 'bg-mesaOcupada text-black'}`}
          >
            <span className="text-4xl">{mesa.numero}</span>
            <span className="text-sm">{mesa.capacidad} pers</span>
          </button>
        ))}
      </div>
    </div>
  )
}