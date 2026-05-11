/**
 * Cloudflare Pages Function - API Proxy
 *
 * Proxies all /api/* requests to the Worker API.
 * This eliminates CORS issues and the need for VITE_API_URL at build time.
 *
 * Setup: Set API_WORKER_URL in Cloudflare Pages > Settings > Environment variables
 * Example: https://laseptima-api.your-account.workers.dev
 */

interface Env {
  API_WORKER_URL: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context

  const workerUrl = env.API_WORKER_URL

  if (!workerUrl) {
    return new Response(
      JSON.stringify({
        error: 'API_WORKER_URL no configurada.',
        hint: 'Ve a Cloudflare Pages > Settings > Environment variables y agrega API_WORKER_URL con la URL de tu Worker (ej: https://laseptima-api.tu-cuenta.workers.dev)',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // Build target URL from the catch-all route parameter
  const url = new URL(request.url)
  const routeParts = (params.route as string[]) || []
  const cleanWorkerUrl = workerUrl.replace(/\/+$/, '') // remove trailing slashes
  const targetUrl = `${cleanWorkerUrl}/api/${routeParts.join('/')}${url.search}`

  // Forward request headers (remove host to avoid conflicts)
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ipcountry')
  headers.delete('cf-ray')
  headers.delete('cf-visitor')

  try {
    // Proxy the request to the Worker API
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    })

    return response
  } catch (error: any) {
    console.error('API proxy error:', error.message)
    return new Response(
      JSON.stringify({
        error: 'Error conectando con el servidor API.',
        detail: error.message,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
