export type Mesa = {
  $id: string
  numero: number
  capacidad: number
  estado: 'libre' | 'ocupada'
}

export type Producto = {
  $id: string
  nombre: string
  descripcion?: string
  precio: number
  categoria: string
  disponible_hoy: boolean
  imagen_url?: string
}

export type Pedido = {
  $id: string
  mesa_id: string
  mesero_id?: string
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
  estado_item: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'impreso'
}

export type Factura = {
  $id: string
  pedido_id: string
  ticket_numero: string
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia'
  subtotal: number
  propina: number
  fecha: string
}

export type Mesero = {
  $id: string
  nombre: string
  pin: string
  telefono?: string
  activo: boolean
}

export type Categoria = {
  $id: string
  nombre: string
  descripcion?: string
  icono?: string
  orden: number
}

export type UserRole = 'admin' | 'mesero'

export type MesaEstado = 'libre' | 'ocupada'
