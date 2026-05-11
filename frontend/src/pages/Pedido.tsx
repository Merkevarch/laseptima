import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { databases } from '../lib/appwrite'
import { useAppwrite } from '../contexts/AppwriteContext'
import toast from 'react-hot-toast'
import type { Producto, Categoria, Mesa } from '../../../shared/index'

type ItemPedido = {
  producto: Producto
  cantidad: number
  notas: string
}

export default function Pedido() {
  const { mesaId } = useParams<{ mesaId: string }>()
  const navigate = useNavigate()
  const { apiFetch, dbId, user } = useAppwrite()
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('Todas')
  const [items, setItems] = useState<ItemPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    loadData()
  }, [mesaId])

  const loadData = async () => {
    try {
      const [mesaRes, productosRes, categoriasRes] = await Promise.all([
        databases.getDocument(dbId, 'mesas', mesaId!),
        databases.listDocuments(dbId, 'productos', []),
        databases.listDocuments(dbId, 'categorias', []),
      ])
      setMesa(mesaRes as unknown as Mesa)

      // Only show available products
      const available = (productosRes.documents as unknown as Producto[]).filter(p => p.disponible_hoy)
      setProductos(available)
      setCategorias(categoriasRes.documents as unknown as Categoria[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
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

  const filteredProducts = activeCategory === 'Todas'
    ? productos
    : productos.filter(p => p.categoria === activeCategory)

  // Get unique categories from products
  const productCategories = [...new Set(productos.map(p => p.categoria))]

  const enviarACocina = async () => {
    if (!mesa || items.length === 0) return

    setEnviando(true)
    try {
      const response = await apiFetch('/api/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          mesa_id: mesa.$id,
          total,
          items: items.map(item => ({
            producto_id: item.producto.$id,
            producto_nombre: item.producto.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.producto.precio,
            notas: item.notas,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error creando pedido')
      }

      toast.success(`Pedido enviado a cocina - Mesa ${mesa.numero}`)
      navigate('/mesas')
    } catch (err: any) {
      toast.error(err.message || 'Error enviando pedido')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!mesa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Mesa no encontrada</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mesa {mesa.numero}</h1>
          <p className="text-xs text-gray-500">{mesa.capacidad} personas</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-blue-600">${total.toFixed(2)}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-4 py-2">
          <button
            onClick={() => setActiveCategory('Todas')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === 'Todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {productCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredProducts.map(p => {
            const inCart = items.find(i => i.producto.$id === p.$id)
            return (
              <button
                key={p.$id}
                onClick={() => addItem(p)}
                className={`p-3 rounded-xl text-left transition-all active:scale-95 border-2 ${
                  inCart
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-transparent bg-white hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{p.nombre}</p>
                  {inCart && (
                    <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-1">
                      {inCart.cantidad}
                    </span>
                  )}
                </div>
                <p className="text-blue-600 font-bold text-sm mt-1">${p.precio.toFixed(2)}</p>
                <p className="text-[10px] text-gray-400">{p.categoria}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cart */}
      {items.length > 0 && (
        <div className="bg-white border-t shadow-lg">
          <div className="max-h-48 overflow-auto p-4 space-y-2">
            {items.map(item => (
              <div key={item.producto.$id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.producto.nombre}</p>
                  <p className="text-xs text-gray-500">${item.producto.precio.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCantidad(item.producto.$id, item.cantidad - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold hover:bg-gray-200"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                  <button
                    onClick={() => updateCantidad(item.producto.$id, item.cantidad + 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Notas"
                  value={item.notas}
                  onChange={e => updateNotas(item.producto.$id, e.target.value)}
                  className="w-24 p-1 border rounded text-xs"
                />
                <p className="text-sm font-semibold text-gray-900 w-16 text-right">
                  ${(item.producto.precio * item.cantidad).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={enviarACocina}
              disabled={enviando}
              className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {enviando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Enviando...
                </span>
              ) : (
                `ENVIAR A COCINA · $${total.toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
