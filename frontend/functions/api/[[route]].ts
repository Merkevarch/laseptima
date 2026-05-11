/**
 * Cloudflare Pages Function - API completa (sin node-appwrite)
 *
 * Usa fetch() directamente a la REST API de Appwrite.
 * No depende de node-appwrite ni modulos nativos de Node.js.
 * Se despliega automaticamente con cada push a GitHub.
 *
 * Variables de entorno (Cloudflare Pages > Settings > Environment variables):
 * - APPWRITE_ENDPOINT: https://cloud.appwrite.io/v1
 * - APPWRITE_PROJECT: tu-project-id
 * - APPWRITE_API_KEY: tu-api-key (Encrypt)
 * - APPWRITE_DATABASE_ID: tu-database-id
 * - JWT_SECRET: tu-jwt-secret (Encrypt)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Env = {
  APPWRITE_ENDPOINT: string
  APPWRITE_PROJECT: string
  APPWRITE_API_KEY: string
  APPWRITE_DATABASE_ID: string
  JWT_SECRET: string
}

type JwtPayload = {
  sub: string
  name: string
  role: 'admin' | 'mesero'
  iat: number
  exp: number
}

const app = new Hono<{ Bindings: Env }>()

// ── CORS ──
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// ── Helper: Appwrite REST API headers ──
function appwriteHeaders(env: Env, session?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': env.APPWRITE_PROJECT,
    'X-Appwrite-Key': env.APPWRITE_API_KEY,
  }
  if (session) {
    headers['X-Appwrite-Session'] = session
  }
  return headers
}

function getEndpoint(env: Env): string {
  return (env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').replace(/\/+$/, '')
}

// ── Helper: List documents with queries ──
async function listDocuments(env: Env, collectionId: string, queries: string[] = []): Promise<any> {
  const url = `${getEndpoint(env)}/databases/${env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents`
  const body = queries.length > 0 ? JSON.stringify({ queries }) : undefined
  const res = await fetch(url, {
    method: 'POST', // Appwrite uses POST for listDocuments with queries
    headers: appwriteHeaders(env),
    body: body || undefined,
  })
  // Try POST first, if method not allowed, try GET
  if (res.status === 405) {
    const getRes = await fetch(`${url}?queries[]=${queries.map(q => encodeURIComponent(q)).join('&queries[]=')}`, {
      headers: appwriteHeaders(env),
    })
    return getRes.json()
  }
  return res.json()
}

// ── Helper: Get document ──
async function getDocument(env: Env, collectionId: string, docId: string): Promise<any> {
  const url = `${getEndpoint(env)}/databases/${env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents/${docId}`
  const res = await fetch(url, { headers: appwriteHeaders(env) })
  if (!res.ok) throw new Error(`Appwrite error: ${res.status}`)
  return res.json()
}

// ── Helper: Create document ──
async function createDocument(env: Env, collectionId: string, documentId: string, data: Record<string, any>): Promise<any> {
  const url = `${getEndpoint(env)}/databases/${env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents`
  const res = await fetch(url, {
    method: 'POST',
    headers: appwriteHeaders(env),
    body: JSON.stringify({ documentId, data }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Error creando documento')
  }
  return res.json()
}

// ── Helper: Update document ──
async function updateDocument(env: Env, collectionId: string, docId: string, data: Record<string, any>): Promise<any> {
  const url = `${getEndpoint(env)}/databases/${env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents/${docId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: appwriteHeaders(env),
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Error actualizando documento')
  }
  return res.json()
}

// ── Helper: Delete document ──
async function deleteDocument(env: Env, collectionId: string, docId: string): Promise<void> {
  const url = `${getEndpoint(env)}/databases/${env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents/${docId}`
  await fetch(url, {
    method: 'DELETE',
    headers: appwriteHeaders(env),
  })
}

// ═══════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════

// ── Health check ──
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasEndpoint: !!c.env.APPWRITE_ENDPOINT,
      hasProject: !!c.env.APPWRITE_PROJECT,
      hasApiKey: !!c.env.APPWRITE_API_KEY,
      hasDbId: !!c.env.APPWRITE_DATABASE_ID,
      hasJwtSecret: !!c.env.JWT_SECRET,
    }
  })
})

// ── Mesero Login → JWT ──
app.post('/api/mesero/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()

  if (!pin || pin.length < 4) {
    return c.json({ error: 'PIN requerido (minimo 4 digitos)' }, 400)
  }

  try {
    // Query meseros by pin and activo
    const url = `${getEndpoint(c.env)}/databases/${c.env.APPWRITE_DATABASE_ID}/collections/meseros/documents`
    const res = await fetch(url, {
      method: 'POST',
      headers: appwriteHeaders(c.env),
      body: JSON.stringify({
        queries: [
          JSON.stringify({ method: 'equal', attribute: 'pin', values: [pin] }),
          JSON.stringify({ method: 'equal', attribute: 'activo', values: [true] }),
        ]
      }),
    })

    const data = await res.json()

    if (!data.documents || data.documents.length === 0) {
      return c.json({ error: 'PIN incorrecto' }, 401)
    }

    const mesero = data.documents[0]

    // Generate JWT
    const payload: JwtPayload = {
      sub: mesero.$id,
      name: mesero.nombre,
      role: 'mesero',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
    }

    const token = await sign(payload, c.env.JWT_SECRET)

    return c.json({
      token,
      userId: mesero.$id,
      name: mesero.nombre,
      role: 'mesero',
    })
  } catch (error: any) {
    console.error('Error en login mesero:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

// ── Admin Login → JWT ──
app.post('/api/admin/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) {
    return c.json({ error: 'Email y contrasena requeridos' }, 400)
  }

  try {
    const endpoint = getEndpoint(c.env)
    const projectId = c.env.APPWRITE_PROJECT

    // Step 1: Create session server-side to validate credentials
    const sessionRes = await fetch(`${endpoint}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
      },
      body: JSON.stringify({ userId: email, email, password }),
    })

    if (!sessionRes.ok) {
      const errData = await sessionRes.json() as any
      console.error('Appwrite session error:', errData.message)
      return c.json({ error: 'Credenciales incorrectas' }, 401)
    }

    const sessionData = await sessionRes.json() as any
    const userId = sessionData.userId || sessionData.$id

    // Step 2: Get user info and verify admin label
    const userRes = await fetch(`${endpoint}/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
      },
    })

    let adminUser: any
    if (userRes.ok) {
      adminUser = await userRes.json()
    } else {
      // Fallback: list users by email
      const listRes = await fetch(`${endpoint}/users?queries[]=${encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'email', values: [email] }))}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
        },
      })
      const listData = await listRes.json() as any
      if (!listData.users || listData.users.length === 0) {
        return c.json({ error: 'Credenciales incorrectas' }, 401)
      }
      adminUser = listData.users[0]
    }

    // Check admin label
    if (!adminUser.labels?.includes('admin')) {
      return c.json({ error: 'Acceso denegado - no es administrador' }, 403)
    }

    // Step 3: Delete Appwrite session (we only use JWT)
    try {
      await fetch(`${endpoint}/account/sessions/${sessionData.$id}`, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
          'X-Appwrite-Session': sessionData.$id,
        },
      })
    } catch { /* ignore */ }

    // Step 4: Generate our JWT
    const payload: JwtPayload = {
      sub: adminUser.$id,
      name: adminUser.name || adminUser.email,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
    }

    const token = await sign(payload, c.env.JWT_SECRET)

    return c.json({
      token,
      userId: adminUser.$id,
      name: adminUser.name || adminUser.email,
      role: 'admin',
    })
  } catch (error: any) {
    console.error('Error en login admin:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

// ═══════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JwtPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Token expirado' }, 401)
    }
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Token invalido' }, 401)
  }
}

// ═══════════════════════════════════════
// PROTECTED ENDPOINTS
// ═══════════════════════════════════════

// ── Create Pedido ──
app.post('/api/pedidos', authMiddleware, async (c) => {
  const user = c.get('user') as JwtPayload
  const body = await c.req.json<{
    mesa_id: string
    total: number
    items: Array<{
      producto_id: string
      producto_nombre: string
      cantidad: number
      precio_unitario: number
      notas: string
    }>
  }>()

  if (!body.mesa_id || !body.items || body.items.length === 0) {
    return c.json({ error: 'mesa_id e items son requeridos' }, 400)
  }

  try {
    // 1. Create pedido
    const pedido = await createDocument(c.env, 'pedidos', 'unique()', {
      mesa_id: body.mesa_id,
      mesero_id: user.sub,
      fecha_hora: new Date().toISOString(),
      total: body.total,
      estado: 'activo',
    })

    // 2. Create items
    const createdItems: any[] = []
    try {
      for (const item of body.items) {
        const detail = await createDocument(c.env, 'pedidos_detalle', 'unique()', {
          pedido_id: pedido.$id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          notas: item.notas || '',
          estado_item: 'pendiente',
        })
        createdItems.push(detail)
      }
    } catch (itemError) {
      // Compensation: delete created items and pedido
      for (const item of createdItems) {
        try { await deleteDocument(c.env, 'pedidos_detalle', item.$id) } catch {}
      }
      try { await deleteDocument(c.env, 'pedidos', pedido.$id) } catch {}
      return c.json({ error: 'Error creando items del pedido' }, 500)
    }

    // 3. Update mesa status
    await updateDocument(c.env, 'mesas', body.mesa_id, { estado: 'ocupada' })

    return c.json({
      success: true,
      pedido: {
        $id: pedido.$id,
        mesa_id: body.mesa_id,
        total: body.total,
        estado: 'activo',
        items: createdItems.length,
      },
    })
  } catch (error: any) {
    console.error('Error creando pedido:', error.message)
    return c.json({ error: 'Error del servidor creando pedido' }, 500)
  }
})

// ── Get pedidos by mesa ──
app.get('/api/pedidos/mesa/:mesaId', authMiddleware, async (c) => {
  const mesaId = c.req.param('mesaId')

  try {
    const url = `${getEndpoint(c.env)}/databases/${c.env.APPWRITE_DATABASE_ID}/collections/pedidos/documents`
    const res = await fetch(url, {
      method: 'POST',
      headers: appwriteHeaders(c.env),
      body: JSON.stringify({
        queries: [
          JSON.stringify({ method: 'equal', attribute: 'mesa_id', values: [mesaId] }),
          JSON.stringify({ method: 'equal', attribute: 'estado', values: ['activo'] }),
          JSON.stringify({ method: 'limit', values: [10] }),
        ]
      }),
    })
    const data = await res.json()
    return c.json({ pedidos: data.documents || [] })
  } catch (error: any) {
    console.error('Error fetching pedidos:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

// ── Facturar pedido ──
app.post('/api/facturas', authMiddleware, async (c) => {
  const body = await c.req.json<{
    pedido_id: string
    metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia'
    propina: number
    subtotal: number
  }>()

  if (!body.pedido_id || !body.metodo_pago) {
    return c.json({ error: 'pedido_id y metodo_pago son requeridos' }, 400)
  }

  try {
    // Get ticket counter
    let ticketNumero = '000001'
    try {
      const counter = await getDocument(c.env, 'contadores', 'ticket-counter')
      const nextVal = (counter.valor || 0) + 1
      ticketNumero = String(nextVal).padStart(6, '0')
      await updateDocument(c.env, 'contadores', 'ticket-counter', { valor: nextVal })
    } catch {
      // Counter doesn't exist, create it
      try {
        await createDocument(c.env, 'contadores', 'ticket-counter', { nombre: 'ticket', valor: 1 })
      } catch { /* ignore if already created */ }
    }

    // Create factura
    const factura = await createDocument(c.env, 'facturas', 'unique()', {
      pedido_id: body.pedido_id,
      ticket_numero: ticketNumero,
      metodo_pago: body.metodo_pago,
      subtotal: body.subtotal,
      propina: body.propina || 0,
      fecha: new Date().toISOString(),
    })

    // Update pedido estado
    await updateDocument(c.env, 'pedidos', body.pedido_id, { estado: 'facturado' })

    // Free mesa
    const pedido = await getDocument(c.env, 'pedidos', body.pedido_id)
    if (pedido.mesa_id) {
      await updateDocument(c.env, 'mesas', pedido.mesa_id, { estado: 'libre' })
    }

    return c.json({
      success: true,
      factura: {
        $id: factura.$id,
        ticket_numero: ticketNumero,
        metodo_pago: body.metodo_pago,
        subtotal: body.subtotal,
        propina: body.propina || 0,
      },
    })
  } catch (error: any) {
    console.error('Error creando factura:', error.message)
    return c.json({ error: 'Error del servidor creando factura' }, 500)
  }
})

// ── Stats (admin only) ──
app.get('/api/stats', authMiddleware, async (c) => {
  const user = c.get('user') as JwtPayload
  if (user.role !== 'admin') {
    return c.json({ error: 'Acceso denegado' }, 403)
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's facturas
    const facturasUrl = `${getEndpoint(c.env)}/databases/${c.env.APPWRITE_DATABASE_ID}/collections/facturas/documents`
    const facturasRes = await fetch(facturasUrl, {
      method: 'POST',
      headers: appwriteHeaders(c.env),
      body: JSON.stringify({
        queries: [
          JSON.stringify({ method: 'greaterThanEqual', attribute: 'fecha', values: [today.toISOString()] }),
          JSON.stringify({ method: 'limit', values: [500] }),
        ]
      }),
    })
    const facturasData = await facturasRes.json()
    const facturas = facturasData.documents || []

    const totalIngresos = facturas.reduce((sum: number, f: any) => sum + (f.subtotal || 0), 0)
    const totalPropina = facturas.reduce((sum: number, f: any) => sum + (f.propina || 0), 0)
    const totalFacturas = facturasData.total || facturas.length

    // Get active pedidos
    const pedidosUrl = `${getEndpoint(c.env)}/databases/${c.env.APPWRITE_DATABASE_ID}/collections/pedidos/documents`
    const pedidosRes = await fetch(pedidosUrl, {
      method: 'POST',
      headers: appwriteHeaders(c.env),
      body: JSON.stringify({
        queries: [
          JSON.stringify({ method: 'equal', attribute: 'estado', values: ['activo'] }),
          JSON.stringify({ method: 'limit', values: [100] }),
        ]
      }),
    })
    const pedidosData = await pedidosRes.json()

    // Get mesas
    const mesasUrl = `${getEndpoint(c.env)}/databases/${c.env.APPWRITE_DATABASE_ID}/collections/mesas/documents`
    const mesasRes = await fetch(mesasUrl, {
      method: 'POST',
      headers: appwriteHeaders(c.env),
      body: JSON.stringify({
        queries: [JSON.stringify({ method: 'limit', values: [100] })]
      }),
    })
    const mesasData = await mesasRes.json()
    const mesas = mesasData.documents || []
    const mesasOcupadas = mesas.filter((m: any) => m.estado === 'ocupada').length
    const mesasLibres = mesas.filter((m: any) => m.estado === 'libre').length

    return c.json({
      ingresos_hoy: totalIngresos,
      propinas_hoy: totalPropina,
      facturas_hoy: totalFacturas,
      ticket_promedio: totalFacturas > 0 ? totalIngresos / totalFacturas : 0,
      pedidos_activos: pedidosData.total || 0,
      mesas_ocupadas: mesasOcupadas,
      mesas_libres: mesasLibres,
      total_mesas: mesasData.total || mesas.length,
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

// ── Print endpoints ──
app.post('/api/print/kitchen', authMiddleware, async (c) => {
  const body = await c.req.json()
  console.log('Kitchen print request:', body)
  return c.json({ success: true })
})

app.post('/api/print/caja', authMiddleware, async (c) => {
  const body = await c.req.json()
  console.log('Caja print request:', body)
  return c.json({ success: true })
})

// ── Catch-all ──
app.all('/api/*', (c) => {
  return c.json({ error: 'Endpoint no encontrado' }, 404)
})

export const onRequest = app
