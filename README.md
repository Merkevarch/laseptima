# La Séptima - Restaurant Control System

Sistema de control para restaurante con autenticación JWT, tiempo real, facturación y panel de administración completo.

## Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **API**: Cloudflare Workers + Hono (con JWT)
- **Base de datos**: Appwrite Cloud (7 colecciones + Realtime)
- **Print Bridge**: Express + Socket.IO + Appwrite Realtime SDK

## Setup

### 1. Configurar Appwrite
- Crear proyecto en [Appwrite Cloud](https://cloud.appwrite.io)
- Crear base de datos `laseptima`
- Crear colecciones: `mesas`, `productos`, `pedidos`, `pedidos_detalle`, `facturas`, `meseros`, `categorias`, `contadores`
- Crear usuario admin con etiqueta `admin`

### 2. Variables de entorno

```bash
# Raíz del proyecto (.env)
cp .env.example .env
# Editar .env con tus valores reales

# Frontend (.env)
cd frontend
cp .env.example .env
# Editar .env con tus valores reales

# Cloudflare Worker (secrets)
cd workers/api
wrangler secret put APPWRITE_PROJECT
wrangler secret put APPWRITE_DATABASE_ID
wrangler secret put APPWRITE_API_KEY
wrangler secret put JWT_SECRET
```

### 3. Instalar dependencias

```bash
npm install                    # Raíz (dotenv, node-appwrite)
cd frontend && npm install     # Frontend (React, react-hot-toast)
cd workers/api && npm install  # Worker (Hono)
cd print-bridge && npm install # Print Bridge
```

### 4. Inicializar Appwrite (primera vez)

```bash
npm run setup   # Crear colecciones e índices
npm run seed    # Cargar datos demo
```

### 5. Desarrollo

```bash
npm run dev          # Frontend en :3000
npm run dev:api      # Worker API en :8787
npm run dev:print    # Print Bridge en :3001
```

## Roles

| Rol | Autenticación | Permisos |
|-----|--------------|----------|
| **Mesero** | PIN 4 dígitos → JWT | Tomar pedidos, ver mesas |
| **Admin** | Email + contraseña | Facturación, CRUD, dashboard |

## Rutas

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/login` | Público | Login mesero/admin |
| `/mesas` | Mesero, Admin | Vista de mesas en tiempo real |
| `/pedido/:mesaId` | Mesero, Admin | Crear pedido con categorías |
| `/admin` | Admin | CRUD productos, mesas, meseros, ventas |
| `/facturacion` | Admin | Facturar pedidos activos |

## API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/mesero/login` | No | Login mesero → JWT |
| POST | `/api/pedidos` | JWT | Crear pedido batch (cabecera + detalles) |
| GET | `/api/pedidos/mesa/:mesaId` | JWT | Pedidos activos de una mesa |
| POST | `/api/facturas` | JWT | Crear factura + liberar mesa |
| GET | `/api/stats` | Admin | Estadísticas del día |
| POST | `/api/print/kitchen` | No | Imprimir ticket cocina (legacy) |
| POST | `/api/print/caja` | No | Imprimir ticket caja (legacy) |

## Mejoras implementadas

- ✅ Credenciales en variables de entorno (no más API keys en código)
- ✅ JWT para autenticación de meseros (sesiones persistentes)
- ✅ Endpoint batch para creación de pedidos (atomicidad con compensación)
- ✅ Sistema de notificaciones toast
- ✅ Appwrite Realtime para sincronización de mesas
- ✅ Print Bridge conectado via Appwrite Realtime
- ✅ Tipos TypeScript unificados desde shared/
- ✅ Filtro por categoría en vista de pedido
- ✅ CRUD completo en Admin (productos, mesas, meseros)
- ✅ Flujo de facturación end-to-end
- ✅ Dashboard de ventas con métricas
- ✅ UX mejorada (responsive, animaciones, loading states)
