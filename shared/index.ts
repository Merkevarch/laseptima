export type Mesa = {
  $id: string
  numero: number
  capacidad: number
  estado: 'libre' | 'ocupada'
}

export type Producto = {
  $id: string
  nombre: string
  precio: number
  categoria: string
  disponible_hoy: boolean
}

export type Pedido = {
  $id: string
  mesa_id: string
  fecha_hora: string
  total: number
  estado: 'activo' | 'facturado' | 'cancelado'
}

export type PedidoDetalle = {
  $id: string
  pedido_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  notas?: string
}

export type Factura = {
  $id: string
  pedido_id: string
  ticket_numero: string
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  subtotal: number
}

export type UserRole = 'admin' | 'mesero'

export type MesaEstado = 'libre' | 'ocupada'