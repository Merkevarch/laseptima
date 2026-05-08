# La Séptima - Restaurant Control System

Sistema ultrasimplificado de control para restaurante.

## Setup

1. Configurar Appwrite:
   - Crear proyecto en Appwrite Cloud
   - Crear base de datos `laseptima`
   - Crear colecciones: `mesas`, `productos`, `pedidos`, `pedidos_detalle`, `facturas`
   - Crear usuario admin con etiqueta `admin`

2. Variables de entorno:
   ```bash
   # frontend/.env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT=tu-project-id
   VITE_APPWRITE_DATABASE_ID=tu-database-id
   ```

3. Instalar dependencias:
   ```bash
   npm install
   cd frontend && npm install
   cd workers/api && npm install
   ```

4. Desarrollo:
   ```bash
   npm run dev
   ```

## Estructura
- `frontend/` - React + TypeScript + Tailwind
- `workers/api/` - Cloudflare Worker con Hono
- `print-bridge/` - Servicio local para impresoras térmicas

## Roles
- **Mesero**: PIN 4 dígitos, solo toma pedidos
- **Admin**: Email + contraseña, facturación y administración