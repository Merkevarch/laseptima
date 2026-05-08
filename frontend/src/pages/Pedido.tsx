import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { databases } from '../lib/appwrite'
import { Query } from 'appwrite'

type Producto = {
  $id: string
  nombre: string
  precio: number
  categoria: string
}

type Mesa = {
  $id: string
  numero: number
  estado: 'libre' | 'ocupada'
}

type ItemPedido = {
  producto: Producto
  cantidad: number
  notas: string
}

export default function Pedido() {
  const { mesaId } = useParams<{ mesaId: string }>()
  const navigate = useNavigate()
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [items, setItems] = useState<ItemPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    loadData()
  }, [mesaId])

  const loadData = async () => {
    try {
      const [mesaRes, productosRes] = await Promise.all([
        databases.getDocument(import.meta.env.VITE_APPWRITE_DATABASE_ID!, 'mesas', mesaId!),
        databases.listDocuments(import.meta.env.VITE_APPWRITE_DATABASE_ID!, 'productos', [
          Query.equal('disponible_hoy', true)
        ])
      ])
      setMesa(mesaRes as Mesa)
      setProductos(productosRes.documents as Producto[])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addItem = (producto: Producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.producto.$id === producto.$id)
      if (existing) {
        return prev.map(i => 
          i.producto.$id === producto.$id 
            ? { ...i, cantidad: i.cantidad + 1 } 
            : i
        )
      }
      return [...prev, { producto, cantidad: 1, notas: '' }]
    })
  }

  const updateCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(prev => prev.filter(i => i.producto.$id !== productoId))
    } else {
      setItems(prev => prev.map(i => 
        i.producto.$id === productoId ? { ...i, cantidad } : i
      ))
    }
  }

  const updateNotas = (productoId: string, notas: string) => {
    setItems(prev => prev.map(i => 
      i.producto.$id === productoId ? { ...i, notas } : i
    ))
  }

  const total = items.reduce((sum, i) => sum + (i.producto.precio * i.cantidad), 0)

  const enviarACocina = async () => {
    if (!mesa || items.length === 0) return
    
    setEnviando(true)
    try {
      const pedido = await databases.createDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        'pedidos',
        'unique()',
        {
          mesa_id: mesa.$id,
          fecha_hora: new Date().toISOString(),
          total,
          estado: 'activo'
        }
      )

      for (const item of items) {
        await databases.createDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID!,
          'pedidos_detalle',
          'unique()',
          {
            pedido_id: pedido.$id,
            producto_id: item.producto.$id,
            cantidad: item.cantidad,
            precio_unitario: item.producto.precio,
            notas: item.notas
          }
        )
      }

      await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        'mesas',
        mesa.$id,
        { estado: 'ocupada' }
      )

      fetch('/api/print/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa: mesa.numero, items })
      })

      navigate('/mesas')
    } catch (error) {
      console.error('Error sending order:', error)
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>
  if (!mesa) return <div>Mesa no encontrada</div>

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Mesa {mesa.numero}</h1>
        <p className="text-gray-600">Total: ${total.toFixed(2)}</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-lg font-semibold mb-2">Productos</h2>
        <div className="grid grid-cols-2 gap-2">
          {productos.map(p => (
            <button
              key={p.$id}
              onClick={() => addItem(p)}
              className="p-4 border rounded-lg text-left hover:bg-gray-50"
            >
              <p className="font-bold">{p.nombre}</p>
              <p className="text-primary">${p.precio}</p>
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="border-t p-4 max-h-64 overflow-auto">
          <h2 className="text-lg font-semibold mb-2">Pedido</h2>
          {items.map(item => (
            <div key={item.producto.$id} className="flex items-center gap-2 mb-2">
              <span className="flex-1">{item.producto.nombre}</span>
              <input
                type="number"
                value={item.cantidad}
                onChange={e => updateCantidad(item.producto.$id, parseInt(e.target.value) || 0)}
                className="w-16 p-1 border rounded"
                min="1"
              />
              <input
                type="text"
                placeholder="Notas"
                value={item.notas}
                onChange={e => updateNotas(item.producto.$id, e.target.value)}
                className="flex-1 p-1 border rounded text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div className="p-4 border-t">
        <button
          onClick={enviarACocina}
          disabled={!items.length || enviando}
          className="w-full py-4 bg-primary text-white rounded-lg text-xl font-bold disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'ENVIAR A COCINA'}
        </button>
      </div>
    </div>
  )
}