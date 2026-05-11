/**
 * Cloudflare Pages Function - API completa
 *
 * Toda la lógica del API está aquí, no se necesita un Worker separado.
 * Se despliega automáticamente con cada push a GitHub.
 *
 * Variables de entorno (configurar en Cloudflare Pages > Settings > Environment variables):
 * - APPWRITE_ENDPOINT: https://cloud.appwrite.io/v1
 * - APPWRITE_PROJECT: tu-project-id
 * - APPWRITE_API_KEY: tu-api-key (SECRET)
 * - APPWRITE_DATABASE_ID: tu-database-id
 * - JWT_SECRET: tu-jwt-secret (SECRET)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { Client, Databases, Query, Users } from 'node-appwrite'

type Bindings = {
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

type Variables = {
  user: JwtPayload
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ── CORS ──
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// ── Helper: create Appwrite server client ──
function createServerClient(c: { env: Bindings }) {
  const client = new Client()
    .setEndpoint(c.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(c.env.APPWRITE_PROJECT)
    .setKey(c.env.APPWRITE_API_KEY)
  return new Databases(client)
}

// ── Helper: cast Appwrite Document to typed object ──
function asDoc<T>(doc: any): T & { $id: string } {
  return doc as T & { $id: string }
}

type MeseroDoc = { nombre: string; pin: string; activo: boolean }
type CounterDoc = { nombre: string; valor: number }
type PedidoDoc = { mesa_id: string; mesero_id: string; fecha_hora: string; total: number; estado: string }

// ═══════════════════════════════════════
// PUBLIC ENDPOINTS (no auth required)
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

// ── Mesero Login → returns JWT ──
app.post('/api/mesero/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()

  if (!pin || pin.length < 4) {
    return c.json({ error: 'PIN requerido (minimo 4 digitos)' }, 400)
  }

  try {
    const databases = createServerClient(c)
    const dbId = c.env.APPWRITE_DATABASE_ID

    const result = await databases.listDocuments(dbId, 'meseros', [
      Query.equal('pin', pin),
      Query.equal('activo', true),
    ])

    if (result.documents.length === 0) {
      return c.json({ error: 'PIN incorrecto' }, 401)
    }

    const mesero = asDoc<MeseroDoc>(result.documents[0])

    // Generate JWT
    const payload: JwtPayload = {
      sub: mesero.$id,
      name: mesero.nombre,
      role: 'mesero',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours
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

// ── Admin Login → returns JWT ──
app.post('/api/admin/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) {
    return c.json({ error: 'Email y contrasena requeridos' }, 400)
  }

  try {
    const endpoint = c.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
    const projectId = c.env.APPWRITE_PROJECT

    // Step 1: Validate credentials by creating a session server-side via REST API
    const sessionResponse = await fetch(`${endpoint}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
      },
      body: JSON.stringify({
        userId: email,
        email,
        password,
      }),
    })

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json() as any
      console.error('Appwrite session error:', errorData.message)
      return c.json({ error: 'Credenciales incorrectas' }, 401)
    }

    const sessionData = await sessionResponse.json() as any
    const userId = sessionData.userId || sessionData.$id

    // Step 2: Verify the user has the 'admin' label
    const adminClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(c.env.APPWRITE_API_KEY)

    const users = new Users(adminClient)

    let adminUser: any
    try {
      adminUser = await users.get(userId)
    } catch {
      // Fallback: try to find by email
      const adminUsers = await users.list([
        Query.equal('email', email),
      ])
      if (adminUsers.total === 0) {
        return c.json({ error: 'Credenciales incorrectas' }, 401)
      }
      adminUser = adminUsers.users[0]
    }

    // Check if user has admin label
    if (!adminUser.labels?.includes('admin')) {
      return c.json({ error: 'Acceso denegado - no es administrador' }, 403)
    }

    // Step 3: Delete the Appwrite session (we only use JWT, not Appwrite sessions)
    try {
      await fetch(`${endpoint}/account/sessions/${sessionData.$id}`, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
          'X-Appwrite-Session': sessionData.$id,
        },
      })
    } catch {
      // Ignore cleanup errors
    }

    // Step 4: Generate our JWT
    const payload: JwtPayload = {
      sub: adminUser.$id,
      name: adminUser.name || adminUser.email,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours
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
// PROTECTED ENDPOINTS (JWT required)
// ═══════════════════════════════════════

// ── Auth middleware ──
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JwtPayload

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Token expirado' }, 401)
    }

    // Attach user to context
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ error: 'Token invalido' }, 401)
  }
}

// ── Create Pedido (batch) ──
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

  const databases = createServerClient(c)
  const dbId = c.env.APPWRITE_DATABASE_ID

  try {
    // 1. Create pedido
    const pedido = await databases.createDocument(dbId, 'pedidos', 'unique()', {
      mesa_id: body.mesa_id,
      mesero_id: user.sub,
      fecha_hora: new Date().toISOString(),
      total: body.total,
      estado: 'activo',
    })

    // 2. Create all items
    const createdItems: any[] = []
    try {
      for (const item of body.items) {
        const detail = await databases.createDocument(dbId, 'pedidos_detalle', 'unique()', {
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
      // Compensation: delete already created items and the pedido
      console.error('Error creando item, aplicando compensacion:', itemError)
      for (const item of createdItems) {
        try { await databases.deleteDocument(dbId, 'pedidos_detalle', item.$id) } catch (e) { /* ignore */ }
      }
      try { await databases.deleteDocument(dbId, 'pedidos', pedido.$id) } catch (e) { /* ignore */ }
      return c.json({ error: 'Error creando items del pedido' }, 500)
    }

    // 3. Update mesa status
    await databases.updateDocument(dbId, 'mesas', body.mesa_id, {
      estado: 'ocupada',
    })

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

// ── Get active pedidos for a mesa ──
app.get('/api/pedidos/mesa/:mesaId', authMiddleware, async (c) => {
  const mesaId = c.req.param('mesaId')
  const databases = createServerClient(c)
  const dbId = c.env.APPWRITE_DATABASE_ID

  try {
    const result = await databases.listDocuments(dbId, 'pedidos', [
      Query.equal('mesa_id', mesaId),
      Query.equal('estado', 'activo'),
      Query.limit(10),
    ])
    return c.json({ pedidos: result.documents })
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

  const databases = createServerClient(c)
  const dbId = c.env.APPWRITE_DATABASE_ID

  try {
    // Get ticket counter
    let ticketNumero: string
    try {
      const counterDoc = asDoc<CounterDoc>(await databases.getDocument(dbId, 'contadores', 'ticket-counter'))
      ticketNumero = String(Number(counterDoc.valor) + 1).padStart(6, '0')
      await databases.updateDocument(dbId, 'contadores', 'ticket-counter', {
        valor: Number(counterDoc.valor) + 1,
      })
    } catch {
      ticketNumero = '000001'
      try {
        await databases.createDocument(dbId, 'contadores', 'ticket-counter', {
          nombre: 'ticket',
          valor: 1,
        })
      } catch { /* ignore if already created */ }
    }

    // Create factura
    const factura = await databases.createDocument(dbId, 'facturas', 'unique()', {
      pedido_id: body.pedido_id,
      ticket_numero: ticketNumero,
      metodo_pago: body.metodo_pago,
      subtotal: body.subtotal,
      propina: body.propina || 0,
      fecha: new Date().toISOString(),
    })

    // Update pedido estado
    await databases.updateDocument(dbId, 'pedidos', body.pedido_id, {
      estado: 'facturado',
    })

    // Get pedido to free mesa
    const pedido = asDoc<PedidoDoc>(await databases.getDocument(dbId, 'pedidos', body.pedido_id))
    await databases.updateDocument(dbId, 'mesas', pedido.mesa_id, {
      estado: 'libre',
    })

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

  const databases = createServerClient(c)
  const dbId = c.env.APPWRITE_DATABASE_ID

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const facturas = await databases.listDocuments(dbId, 'facturas', [
      Query.greaterThanEqual('fecha', today.toISOString()),
      Query.limit(500),
    ])

    const totalIngresos = facturas.documents.reduce((sum: number, f: any) => sum + (f.subtotal || 0), 0)
    const totalPropina = facturas.documents.reduce((sum: number, f: any) => sum + (f.propina || 0), 0)
    const totalFacturas = facturas.total

    const pedidosActivos = await databases.listDocuments(dbId, 'pedidos', [
      Query.equal('estado', 'activo'),
      Query.limit(100),
    ])

    const mesas = await databases.listDocuments(dbId, 'mesas', [Query.limit(100)])
    const mesasOcupadas = mesas.documents.filter((m: any) => m.estado === 'ocupada').length
    const mesasLibres = mesas.documents.filter((m: any) => m.estado === 'libre').length

    return c.json({
      ingresos_hoy: totalIngresos,
      propinas_hoy: totalPropina,
      facturas_hoy: totalFacturas,
      ticket_promedio: totalFacturas > 0 ? totalIngresos / totalFacturas : 0,
      pedidos_activos: pedidosActivos.total,
      mesas_ocupadas: mesasOcupadas,
      mesas_libres: mesasLibres,
      total_mesas: mesas.total,
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

// ── Print endpoints (authenticated) ──
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

// ── Catch-all for undefined API routes ──
app.all('/api/*', (c) => {
  return c.json({ error: 'Endpoint no encontrado' }, 404)
})

export const onRequest = app
