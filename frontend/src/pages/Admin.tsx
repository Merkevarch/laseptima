import { useState, useEffect } from 'react'
import { databases, Query } from '../lib/appwrite'
import { useAppwrite } from '../contexts/AppwriteContext'

type Producto = {
  $id: string
  nombre: string
  precio: number
  categoria: string
  disponible_hoy: boolean
}

export default function Admin() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const { logout } = useAppwrite()

  useEffect(() => {
    loadProductos()
  }, [])

  const loadProductos = async () => {
    try {
      const res = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        'productos'
      )
      setProductos(res.documents as Producto[])
    } catch (error) {
      console.error('Error loading productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleDisponible = async (producto: Producto) => {
    try {
      await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        'productos',
        producto.$id,
        { disponible_hoy: !producto.disponible_hoy }
      )
      setProductos(prev => prev.map(p => 
        p.$id === producto.$id ? { ...p, disponible_hoy: !p.disponible_hoy } : p
      ))
    } catch (error) {
      console.error('Error updating producto:', error)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Administración</h1>
        <button onClick={logout} className="px-4 py-2 bg-danger text-white rounded">
          Salir
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Menú del día</h2>
      <div className="space-y-2">
        {productos.map(p => (
          <div key={p.$id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-bold">{p.nombre}</p>
              <p className="text-gray-600">${p.precio} - {p.categoria}</p>
            </div>
            <button
              onClick={() => toggleDisponible(p)}
              className={`px-4 py-2 rounded ${p.disponible_hoy ? 'bg-mesaLibre text-white' : 'bg-gray-300'}`}
            >
              {p.disponible_hoy ? 'Disponible' : 'Agotado'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={() => navigate('/mesas')}
          className="px-6 py-3 bg-primary text-white rounded"
        >
          Ver Mesas
        </button>
      </div>
    </div>
  )
}