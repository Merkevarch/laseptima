import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  APPWRITE_ENDPOINT: string
  APPWRITE_PROJECT: string
  APPWRITE_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

app.post('/api/mesero/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()
  
  if (pin === '1234') {
    return c.json({ userId: 'mesero-1', name: 'Mesero' })
  }
  
  return c.json({ error: 'PIN incorrecto' }, 401)
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