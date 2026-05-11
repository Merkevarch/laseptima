import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { databases } from '../lib/appwrite'
import { useAppwrite } from '../contexts/AppwriteContext'
import toast from 'react-hot-toast'
import type { Pedido, PedidoDetalle } from '../../../shared/index'

export default function Facturacion() {
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([])
  const [detalles, setDetalles] = useState<Record<string, PedidoDetalle[]>>({})
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [propina, setPropina] = useState(0)
  const [propinaPercent, setPropinaPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [facturando, setFacturando] = useState(false)
  const { dbId, apiFetch } = useAppwrite()
  const navigate = useNavigate()

  useEffect(() => {
    loadPedidos()
  }, [])

  const loadPedidos = async () => {
    try {
      const res = await databases.listDocuments(dbId, 'pedidos', [])
      const activos = (res.documents as unknown as Pedido[]).filter(p => p.estado === 'activo')
      setPedidosActivos(activos)

      // Load details for each pedido
      const detallesMap: Record<string, PedidoDetalle[]> = {}
      for (const pedido of activos) {
        try {
          const detailRes = await databases.listDocuments(dbId, 'pedidos_detalle', [])
          detallesMap[pedido.$id] = (detailRes.documents as unknown as PedidoDetalle[]).filter(
            d => d.pedido_id === pedido.$id
          )
        } catch {
          detallesMap[pedido.$id] = []
        }
      }
      setDetalles(detallesMap)
    } catch {
      toast.error('Error cargando pedidos')
    } finally {
      setLoading(false)
    }
  }

  const facturar = async () => {
    if (!selectedPedido) return

    setFacturando(true)
    try {
      const subtotal = selectedPedido.total
      const totalPropina = propinaPercent > 0 ? subtotal * (propinaPercent / 100) : propina

      const response = await apiFetch('/api/facturas', {
        method: 'POST',
        body: JSON.stringify({
          pedido_id: selectedPedido.$id,
          metodo_pago: metodoPago,
          subtotal,
          propina: totalPropina,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error creando factura')
      }

      const data = await response.json()
      toast.success(`Factura #${data.factura.ticket_numero} creada correctamente`)
      setSelectedPedido(null)
      setPropina(0)
      setPropinaPercent(0)
      loadPedidos()
    } catch (err: any) {
      toast.error(err.message || 'Error facturando')
    } finally {
      setFacturando(false)
    }
  }

  const handlePropinaPercent = (pct: number) => {
    setPropinaPercent(pct)
    if (selectedPedido) {
      setPropina(selectedPedido.total * (pct / 100))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Facturacion</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
            >
              Admin
            </button>
            <button
              onClick={() => navigate('/mesas')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
            >
              Mesas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {pedidosActivos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No hay pedidos activos para facturar</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pedidos list */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pedidos Activos</h2>
              <div className="space-y-2">
                {pedidosActivos.map(p => (
                  <button
                    key={p.$id}
                    onClick={() => setSelectedPedido(p)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPedido?.$id === p.$id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-gray-900">Mesa: {p.mesa_id}</p>
                      <p className="font-bold text-blue-600">${p.total.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {detalles[p.$id]?.length || 0} items · {new Date(p.fecha_hora).toLocaleTimeString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Facturacion form */}
            <div>
              {selectedPedido ? (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Detalles de Factura</h2>

                  {/* Items */}
                  <div className="space-y-2">
                    {(detalles[selectedPedido.$id] || []).map(d => (
                      <div key={d.$id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{d.cantidad}x producto</span>
                        <span className="text-gray-900 font-medium">${(d.precio_unitario * d.cantidad).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Subtotal</span>
                      <span>${selectedPedido.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Metodo de pago */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Metodo de Pago</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['efectivo', 'tarjeta', 'transferencia'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setMetodoPago(m)}
                          className={`py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                            metodoPago === m
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Propina */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Propina</p>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[0, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          onClick={() => handlePropinaPercent(pct)}
                          className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                            propinaPercent === pct
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        value={propina}
                        onChange={e => { setPropina(parseFloat(e.target.value) || 0); setPropinaPercent(0) }}
                        className="flex-1 p-2 border rounded-lg text-sm"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>${selectedPedido.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Propina</span>
                      <span>${propina.toFixed(2)}</span>
                    </div>
                    <div className="border-t mt-2 pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600">${(selectedPedido.total + propina).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={facturar}
                    disabled={facturando}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl text-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {facturando ? 'Facturando...' : 'GENERAR FACTURA'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p>Selecciona un pedido para facturar</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
