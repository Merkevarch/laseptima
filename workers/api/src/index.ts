import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Client, Databases, Query } from 'appwrite'

type Bindings = {
  APPWRITE_ENDPOINT: string
  APPWRITE_PROJECT: string
  APPWRITE_API_KEY: string
  APPWRITE_DATABASE_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

app.post('/api/mesero/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()
  
  if (!pin || pin.length < 4) {
    return c.json({ error: 'PIN requerido' }, 400)
  }

  try {
    const client = new Client()
      .setEndpoint(c.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
      .setProject(c.env.APPWRITE_PROJECT)
      .setKey(c.env.APPWRITE_API_KEY)

    const databases = new Databases(client)
    const dbId = c.env.APPWRITE_DATABASE_ID

    // Buscar mesero por PIN en la coleccion meseros
    const result = await databases.listDocuments(dbId, 'meseros', [
      Query.equal('pin', pin),
      Query.equal('activo', true),
    ])

    if (result.documents.length === 0) {
      return c.json({ error: 'PIN incorrecto' }, 401)
    }

    const mesero = result.documents[0]
    return c.json({
      userId: mesero.$id,
      name: mesero.nombre,
    })
  } catch (error: any) {
    console.error('Error en login mesero:', error.message)
    return c.json({ error: 'Error del servidor' }, 500)
  }
})

app.post('/api/print/kitchen', async (c) => {
  const body = await c.req.json()
  console.log('Kitchen print request:', body)
  return c.json({ success: true })
})

app.post('/api/print/caja', async (c) => {
  const body = await c.req.json()
  console.log('Caja print request:', body)
  return c.json({ success: true })
})

export default app
