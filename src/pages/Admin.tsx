import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { databases } from '../lib/appwrite'
import { useAppwrite } from '../contexts/AppwriteContext'
import toast from 'react-hot-toast'

type Producto = { $id: string; nombre: string; precio: number; categoria: string; descripcion: string; disponible_hoy: boolean }
type Mesa = { $id: string; numero: number; capacidad: number; estado: string }
type Mesero = { $id: string; nombre: string; pin: string; telefono: string; activo: boolean }
type Categoria = { $id: string; nombre: string }

type Tab = 'menu' | 'mesas' | 'meseros' | 'ventas'

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('menu')
  const [productos, setProductos] = useState<Producto[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [meseros, setMeseros] = useState<Mesero[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const { logout, dbId } = useAppwrite()
  const navigate = useNavigate()

  const [formProducto, setFormProducto] = useState({ nombre: '', precio: '', categoria: '', descripcion: '' })
  const [formMesa, setFormMesa] = useState({ numero: '', capacidad: '' })
  const [formMesero, setFormMesero] = useState({ nombre: '', pin: '', telefono: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [prodRes, mesasRes, meserosRes, catRes] = await Promise.all([
        databases.listDocuments(dbId, 'productos'),
        databases.listDocuments(dbId, 'mesas'),
        databases.listDocuments(dbId, 'meseros'),
        databases.listDocuments(dbId, 'categorias'),
      ])
      setProductos(prodRes.documents as unknown as Producto[])
      setMesas(mesasRes.documents as unknown as Mesa[])
      setMeseros(meserosRes.documents as unknown as Mesero[])
      setCategorias(catRes.documents as unknown as Categoria[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  // ── Product CRUD ──
  const toggleDisponible = async (producto: Producto) => {
    try {
      await databases.updateDocument(dbId, 'productos', producto.$id, {
        disponible_hoy: !producto.disponible_hoy,
      })
      setProductos(prev => prev.map(p =>
        p.$id === producto.$id ? { ...p, disponible_hoy: !p.disponible_hoy } : p
      ))
      toast.success(producto.disponible_hoy ? 'Producto marcado como agotado' : 'Producto disponible')
    } catch {
      toast.error('Error actualizando producto')
    }
  }

  const saveProducto = async () => {
    try {
      if (editingItem) {
        await databases.updateDocument(dbId, 'productos', editingItem.$id, {
          nombre: formProducto.nombre,
          precio: parseFloat(formProducto.precio),
          categoria: formProducto.categoria,
          descripcion: formProducto.descripcion,
        })
        toast.success('Producto actualizado')
      } else {
        await databases.createDocument(dbId, 'productos', 'unique()', {
          nombre: formProducto.nombre,
          precio: parseFloat(formProducto.precio),
          categoria: formProducto.categoria,
          descripcion: formProducto.descripcion,
          disponible_hoy: true,
        })
        toast.success('Producto creado')
      }
      setShowForm(false); setEditingItem(null)
      setFormProducto({ nombre: '', precio: '', categoria: '', descripcion: '' })
      loadData()
    } catch {
      toast.error('Error guardando producto')
    }
  }

  const deleteProducto = async (id: string) => {
    if (!confirm('Eliminar este producto?')) return
    try {
      await databases.deleteDocument(dbId, 'productos', id)
      toast.success('Producto eliminado')
      loadData()
    } catch {
      toast.error('Error eliminando producto')
    }
  }

  // ── Mesa CRUD ──
  const saveMesa = async () => {
    try {
      if (editingItem) {
        await databases.updateDocument(dbId, 'mesas', editingItem.$id, {
          numero: parseInt(formMesa.numero),
          capacidad: parseInt(formMesa.capacidad),
        })
        toast.success('Mesa actualizada')
      } else {
        await databases.createDocument(dbId, 'mesas', 'unique()', {
          numero: parseInt(formMesa.numero),
          capacidad: parseInt(formMesa.capacidad),
          estado: 'libre',
        })
        toast.success('Mesa creada')
      }
      setShowForm(false); setEditingItem(null)
      setFormMesa({ numero: '', capacidad: '' })
      loadData()
    } catch {
      toast.error('Error guardando mesa')
    }
  }

  const deleteMesa = async (id: string) => {
    if (!confirm('Eliminar esta mesa?')) return
    try {
      await databases.deleteDocument(dbId, 'mesas', id)
      toast.success('Mesa eliminada')
      loadData()
    } catch {
      toast.error('Error eliminando mesa')
    }
  }

  // ── Mesero CRUD ──
  const saveMesero = async () => {
    try {
      if (editingItem) {
        await databases.updateDocument(dbId, 'meseros', editingItem.$id, {
          nombre: formMesero.nombre,
          pin: formMesero.pin || undefined,
          telefono: formMesero.telefono,
        })
        toast.success('Mesero actualizado')
      } else {
        const pin = formMesero.pin || String(Math.floor(1000 + Math.random() * 9000))
        await databases.createDocument(dbId, 'meseros', 'unique()', {
          nombre: formMesero.nombre,
          pin,
          telefono: formMesero.telefono,
          activo: true,
        })
        toast.success(`Mesero creado - PIN: ${pin}`)
      }
      setShowForm(false); setEditingItem(null)
      setFormMesero({ nombre: '', pin: '', telefono: '' })
      loadData()
    } catch {
      toast.error('Error guardando mesero')
    }
  }

  const toggleMesero = async (mesero: Mesero) => {
    try {
      await databases.updateDocument(dbId, 'meseros', mesero.$id, { activo: !mesero.activo })
      toast.success(mesero.activo ? 'Mesero desactivado' : 'Mesero activado')
      loadData()
    } catch {
      toast.error('Error actualizando mesero')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'menu', label: 'Menu' },
    { key: 'mesas', label: 'Mesas' },
    { key: 'meseros', label: 'Meseros' },
    { key: 'ventas', label: 'Ventas' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Administracion</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/mesas')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Ver Mesas</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Salir</button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingItem(null) }}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Productos</h2>
              <button onClick={() => { setShowForm(true); setEditingItem(null); setFormProducto({ nombre: '', precio: '', categoria: '', descripcion: '' }) }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Agregar</button>
            </div>
            {showForm && (
              <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
                <input placeholder="Nombre" value={formProducto.nombre} onChange={e => setFormProducto(f => ({ ...f, nombre: e.target.value }))} className="w-full p-3 border rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" placeholder="Precio" value={formProducto.precio} onChange={e => setFormProducto(f => ({ ...f, precio: e.target.value }))} className="p-3 border rounded-lg text-sm" />
                  <select value={formProducto.categoria} onChange={e => setFormProducto(f => ({ ...f, categoria: e.target.value }))} className="p-3 border rounded-lg text-sm">
                    <option value="">Categoria</option>
                    {categorias.map(c => <option key={c.$id} value={c.nombre}>{c.nombre}</option>)}
                    <option value="Entradas">Entradas</option>
                    <option value="Sopas">Sopas</option>
                    <option value="Plato Fuerte">Plato Fuerte</option>
                    <option value="Mariscos">Mariscos</option>
                    <option value="Acompanantes">Acompanantes</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Postres">Postres</option>
                  </select>
                </div>
                <input placeholder="Descripcion (opcional)" value={formProducto.descripcion} onChange={e => setFormProducto(f => ({ ...f, descripcion: e.target.value }))} className="w-full p-3 border rounded-lg text-sm" />
                <div className="flex gap-2">
                  <button onClick={saveProducto} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">{editingItem ? 'Actualizar' : 'Crear'}</button>
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {productos.map(p => (
                <div key={p.$id} className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-500">${p.precio.toFixed(2)} · {p.categoria}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleDisponible(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p.disponible_hoy ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.disponible_hoy ? 'Disponible' : 'Agotado'}</button>
                    <button onClick={() => { setEditingItem(p); setShowForm(true); setFormProducto({ nombre: p.nombre, precio: String(p.precio), categoria: p.categoria, descripcion: p.descripcion || '' }) }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">Editar</button>
                    <button onClick={() => deleteProducto(p.$id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESAS TAB */}
        {activeTab === 'mesas' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Mesas</h2>
              <button onClick={() => { setShowForm(true); setEditingItem(null); setFormMesa({ numero: '', capacidad: '' }) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Agregar</button>
            </div>
            {showForm && (
              <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Numero de mesa" value={formMesa.numero} onChange={e => setFormMesa(f => ({ ...f, numero: e.target.value }))} className="p-3 border rounded-lg text-sm" />
                  <input type="number" placeholder="Capacidad" value={formMesa.capacidad} onChange={e => setFormMesa(f => ({ ...f, capacidad: e.target.value }))} className="p-3 border rounded-lg text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveMesa} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">{editingItem ? 'Actualizar' : 'Crear'}</button>
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">Cancelar</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mesas.map(m => (
                <div key={m.$id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">Mesa {m.numero}</p>
                      <p className="text-sm text-gray-500">{m.capacidad} personas</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.estado === 'libre' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.estado}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingItem(m); setShowForm(true); setFormMesa({ numero: String(m.numero), capacidad: String(m.capacidad) }) }} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs">✎</button>
                      <button onClick={() => deleteMesa(m.$id)} className="p-1.5 rounded-lg bg-red-100 text-red-700 text-xs">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MESEROS TAB */}
        {activeTab === 'meseros' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Meseros</h2>
              <button onClick={() => { setShowForm(true); setEditingItem(null); setFormMesero({ nombre: '', pin: '', telefono: '' }) }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">+ Agregar</button>
            </div>
            {showForm && (
              <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
                <input placeholder="Nombre completo" value={formMesero.nombre} onChange={e => setFormMesero(f => ({ ...f, nombre: e.target.value }))} className="w-full p-3 border rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="PIN (4 digitos, auto si vacio)" value={formMesero.pin} onChange={e => setFormMesero(f => ({ ...f, pin: e.target.value }))} className="p-3 border rounded-lg text-sm" maxLength={4} />
                  <input placeholder="Telefono" value={formMesero.telefono} onChange={e => setFormMesero(f => ({ ...f, telefono: e.target.value }))} className="p-3 border rounded-lg text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveMesero} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">{editingItem ? 'Actualizar' : 'Crear'}</button>
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">Cancelar</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {meseros.map(m => (
                <div key={m.$id} className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{m.nombre}</p>
                    <p className="text-xs text-gray-500">PIN: {m.pin} · {m.telefono || 'Sin telefono'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMesero(m)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${m.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{m.activo ? 'Activo' : 'Inactivo'}</button>
                    <button onClick={() => { setEditingItem(m); setShowForm(true); setFormMesero({ nombre: m.nombre, pin: m.pin, telefono: m.telefono || '' }) }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VENTAS TAB */}
        {activeTab === 'ventas' && <VentasTab dbId={dbId} />}
      </div>
    </div>
  )
}

function VentasTab({ dbId }: { dbId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)

      const [facturasRes, pedidosRes, mesasRes] = await Promise.all([
        databases.listDocuments(dbId, 'facturas', []),
        databases.listDocuments(dbId, 'pedidos', []),
        databases.listDocuments(dbId, 'mesas', []),
      ])

      const facturas = (facturasRes.documents as any[]).filter((f: any) => new Date(f.fecha) >= today)
      const pedidosActivos = (pedidosRes.documents as any[]).filter((p: any) => p.estado === 'activo')
      const mesas = mesasRes.documents as any[]

      const totalIngresos = facturas.reduce((sum: number, f: any) => sum + (f.subtotal || 0), 0)
      const totalPropina = facturas.reduce((sum: number, f: any) => sum + (f.propina || 0), 0)

      setStats({
        ingresos_hoy: totalIngresos,
        propinas_hoy: totalPropina,
        facturas_hoy: facturas.length,
        ticket_promedio: facturas.length > 0 ? totalIngresos / facturas.length : 0,
        pedidos_activos: pedidosActivos.length,
        mesas_ocupadas: mesas.filter(m => m.estado === 'ocupada').length,
        mesas_libres: mesas.filter(m => m.estado === 'libre').length,
        total_mesas: mesas.length,
      })
    } catch {
      // Stats may not be available yet
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando estadisticas...</p>
  if (!stats) return <div className="text-center py-12"><p className="text-gray-500">No se pudieron cargar las estadisticas.</p></div>

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Ventas del Dia</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Ingresos" value={`$${stats.ingresos_hoy.toFixed(2)}`} color="blue" />
        <StatCard label="Propinas" value={`$${stats.propinas_hoy.toFixed(2)}`} color="green" />
        <StatCard label="Facturas" value={String(stats.facturas_hoy)} color="purple" />
        <StatCard label="Ticket Prom." value={`$${stats.ticket_promedio.toFixed(2)}`} color="amber" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Pedidos Activos" value={String(stats.pedidos_activos)} color="amber" />
        <StatCard label="Mesas Ocupadas" value={`${stats.mesas_ocupadas}/${stats.total_mesas}`} color="red" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200', green: 'bg-emerald-50 border-emerald-200',
    purple: 'bg-purple-50 border-purple-200', amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  }
  return (
    <div className={`p-4 rounded-xl border-2 ${colors[color] || colors.blue}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
