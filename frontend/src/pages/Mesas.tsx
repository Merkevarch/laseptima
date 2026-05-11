import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppwrite } from '../contexts/AppwriteContext'
import { databases } from '../lib/appwrite'
import client from '../lib/appwrite'
import type { Mesa } from '../../../shared/index'

export default function Mesas() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { logout, role, dbId } = useAppwrite()

  const fetchMesas = useCallback(async () => {
    try {
      const response = await databases.listDocuments(dbId, 'mesas')
      setMesas(response.documents as unknown as Mesa[])
    } catch (error) {
      console.error('Error fetching mesas:', error)
    }
  }, [dbId])

  useEffect(() => {
    fetchMesas().finally(() => setLoading(false))
  }, [fetchMesas])

  // ── Appwrite Realtime subscription ──
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${dbId}.collections.mesas.documents`,
      (response: any) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update') ||
            response.events.includes('databases.*.collections.*.documents.*.create')) {
          setMesas(prev => {
            const idx = prev.findIndex(m => m.$id === response.payload.$id)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = response.payload as unknown as Mesa
              return updated
            }
            return [...prev, response.payload as unknown as Mesa]
          })
        }
        if (response.events.includes('databases.*.collections.*.documents.*.delete')) {
          setMesas(prev => prev.filter(m => m.$id !== response.payload.$id))
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [dbId])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const libres = mesas.filter(m => m.estado === 'libre').length
  const ocupadas = mesas.filter(m => m.estado === 'ocupada').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-3">Cargando mesas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mesas</h1>
            <p className="text-xs text-gray-500">{libres} libres · {ocupadas} ocupadas</p>
          </div>
          <div className="flex gap-2">
            {role === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/facturacion')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  Facturar
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Admin
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Grid de mesas */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {mesas.map(mesa => (
            <button
              key={mesa.$id}
              onClick={() => navigate(`/pedido/${mesa.$id}`)}
              className={`h-32 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm ${
                mesa.estado === 'libre'
                  ? 'bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400'
                  : 'bg-amber-50 border-2 border-amber-200 hover:border-amber-400'
              }`}
            >
              <span className="text-3xl font-bold text-gray-800">{mesa.numero}</span>
              <span className="text-xs text-gray-500 mt-1">{mesa.capacidad} pers</span>
              <span className={`text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full ${
                mesa.estado === 'libre' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
              }`}>
                {mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
