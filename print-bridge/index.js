require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Appwrite SDK for Realtime subscription
const { Client, Databases, Query } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const PORT = process.env.PRINT_BRIDGE_PORT || 3001;

// ── Express + Socket.IO setup ──
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(express.json());

// ── Socket.IO connections ──
io.on('connection', (socket) => {
  console.log('[IO] Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('[IO] Cliente desconectado:', socket.id);
  });
});

// ── REST endpoints (legacy fallback) ──
app.post('/print/kitchen', (req, res) => {
  const { mesa, items } = req.body;
  console.log('[REST] Kitchen ticket:', { mesa, items });
  io.emit('kitchen-ticket', { mesa, items });
  res.json({ success: true });
});

app.post('/print/caja', (req, res) => {
  const { items, total, metodo } = req.body;
  console.log('[REST] Caja ticket:', { items, total, metodo });
  io.emit('caja-ticket', { items, total, metodo });
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Appwrite Realtime subscription ──
async function subscribeToAppwrite() {
  if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.log('[RT] Appwrite no configurado, ejecutando solo modo REST');
    return;
  }

  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Subscribe to pedidos_detalle changes for kitchen printing
    client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.pedidos_detalle.documents`,
      async (response) => {
        const { payload, events } = response;

        // New pedido detail created with estado_item = pendiente
        if (events.includes('databases.*.collections.*.documents.*.create') && payload.estado_item === 'pendiente') {
          console.log('[RT] Nuevo item de pedido:', payload);

          // Get the parent pedido
          try {
            const pedido = await databases.getDocument(APPWRITE_DATABASE_ID, 'pedidos', payload.pedido_id);
            const mesa = await databases.getDocument(APPWRITE_DATABASE_ID, 'mesas', pedido.mesa_id);

            const ticketData = {
              mesa: mesa.numero,
              producto: payload.producto_id,
              cantidad: payload.cantidad,
              notas: payload.notas,
              precio: payload.precio_unitario,
            };

            console.log('[RT] Enviando ticket de cocina:', ticketData);
            io.emit('kitchen-ticket', ticketData);

            // Try to print via escpos
            try {
              printTicket('kitchen', ticketData);
            } catch (printErr) {
              console.log('[PRINT] Impresion directa no disponible, enviado via Socket.IO');
            }

            // Update estado_item to "impreso"
            await databases.updateDocument(APPWRITE_DATABASE_ID, 'pedidos_detalle', payload.$id, {
              estado_item: 'impreso',
            });

          } catch (err) {
            console.error('[RT] Error procesando ticket de cocina:', err.message);
          }
        }
      }
    );

    // Subscribe to facturas for caja printing
    client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.facturas.documents`,
      async (response) => {
        const { payload, events } = response;

        if (events.includes('databases.*.collections.*.documents.*.create')) {
          console.log('[RT] Nueva factura:', payload);

          const ticketData = {
            ticket_numero: payload.ticket_numero,
            metodo_pago: payload.metodo_pago,
            subtotal: payload.subtotal,
            propina: payload.propina,
            fecha: payload.fecha,
          };

          console.log('[RT] Enviando ticket de caja:', ticketData);
          io.emit('caja-ticket', ticketData);

          try {
            printTicket('caja', ticketData);
          } catch (printErr) {
            console.log('[PRINT] Impresion directa no disponible, enviado via Socket.IO');
          }
        }
      }
    );

    console.log('[RT] Suscrito a Appwrite Realtime');
  } catch (err) {
    console.error('[RT] Error conectando a Appwrite Realtime:', err.message);
  }
}

// ── Print via escpos (optional) ──
function printTicket(type, data) {
  // This requires escpos package and a connected USB printer
  // Implementation depends on the specific printer model
  console.log(`[PRINT] Ticket ${type}:`, JSON.stringify(data));
}

// ── Start server ──
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  La Septima - Print Bridge`);
  console.log(`  Puerto: ${PORT}`);
  console.log(`  Appwrite: ${APPWRITE_PROJECT_ID ? 'Configurado' : 'No configurado'}`);
  console.log(`========================================\n`);

  subscribeToAppwrite();
});
