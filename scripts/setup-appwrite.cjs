const { Client, Databases } = require('/home/z/my-project/laseptima/node_modules/node-appwrite');

const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '69fe3625003ce05edab5';
const APPWRITE_DATABASE_ID = '69fe36d7002894d4896a';
const APPWRITE_API_KEY = 'standard_d157e60086e5f8401f6c7eaba3d9229ebd301829a6fb855d95dbcefb04f22a54713a732c81a72c4941c522fad5b71ed4a352d5495c6e98d7d87d8d0cf1eb7782db01ccc9ec8b2be4a26c8dbff569e8689416f9abe93133aa6ac48960161169cd32fe746b863a9087cebc538f3b4c514d5506e46d6e0325c1abec2d85b9017515';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

const DB = APPWRITE_DATABASE_ID;

const log = {
  info: (msg) => console.log(`\x1b[36m[i] ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m[OK] ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m[ERROR] ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m[WARN] ${msg}\x1b[0m`),
  step: (msg) => console.log(`\n\x1b[35m>> ${msg}\x1b[0m`),
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const collectionExists = async (collectionId) => {
  try {
    await databases.getCollection(DB, collectionId);
    return true;
  } catch (e) {
    return false;
  }
};

const waitForAttributes = async (collectionId, expectedAttrs, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const collection = await databases.getCollection(DB, collectionId);
      const existingKeys = (collection.attributes || []).map(a => a.key);
      const allPresent = expectedAttrs.every(attr => existingKeys.includes(attr));
      if (allPresent) return true;
    } catch (e) {}
    await delay(1000);
  }
  return false;
};

const createCollectionWithAttrs = async (collectionId, name, attrsFn, attrKeys) => {
  log.step(`Creando coleccion: ${name} (${collectionId})`);
  
  if (await collectionExists(collectionId)) {
    log.warn(`${name} ya existe, saltando...`);
    return;
  }
  
  try {
    await databases.createCollection(DB, collectionId, name);
    log.success(`Coleccion creada: ${collectionId}`);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      log.warn(`${name} ya existe, continuando...`);
    } else {
      throw e;
    }
  }
  
  await delay(500);
  
  // Create attributes
  await attrsFn();
  
  // Wait for attributes to be available
  log.info(`Esperando atributos para ${name}...`);
  const ready = await waitForAttributes(collectionId, attrKeys);
  if (ready) {
    log.success(`Atributos de ${name} listos`);
  } else {
    log.warn(`Algunos atributos de ${name} pueden no estar listos todavia`);
  }
  
  await delay(1000);
};

// ===== COLLECTION DEFINITIONS =====

const createCategorias = async () => {
  await createCollectionWithAttrs('categorias', 'Categorias', async () => {
    await databases.createStringAttribute(DB, 'categorias', 'nombre', 100, true);
    await databases.createStringAttribute(DB, 'categorias', 'descripcion', 500, false);
    await databases.createStringAttribute(DB, 'categorias', 'icono', 50, false);
    await databases.createIntegerAttribute(DB, 'categorias', 'orden', true);
  }, ['nombre', 'descripcion', 'icono', 'orden']);
};

const createMeseros = async () => {
  await createCollectionWithAttrs('meseros', 'Meseros', async () => {
    await databases.createStringAttribute(DB, 'meseros', 'nombre', 100, true);
    await databases.createStringAttribute(DB, 'meseros', 'pin', 10, true);
    await databases.createStringAttribute(DB, 'meseros', 'telefono', 20, false);
    await databases.createBooleanAttribute(DB, 'meseros', 'activo', true);
  }, ['nombre', 'pin', 'telefono', 'activo']);
};

const createMesas = async () => {
  await createCollectionWithAttrs('mesas', 'Mesas', async () => {
    await databases.createIntegerAttribute(DB, 'mesas', 'numero', true);
    await databases.createIntegerAttribute(DB, 'mesas', 'capacidad', true);
    await databases.createStringAttribute(DB, 'mesas', 'estado', 20, true);
  }, ['numero', 'capacidad', 'estado']);
};

const createProductos = async () => {
  await createCollectionWithAttrs('productos', 'Productos', async () => {
    await databases.createStringAttribute(DB, 'productos', 'nombre', 200, true);
    await databases.createStringAttribute(DB, 'productos', 'descripcion', 1000, false);
    await databases.createFloatAttribute(DB, 'productos', 'precio', true);
    await databases.createStringAttribute(DB, 'productos', 'categoria', 100, true);
    await databases.createBooleanAttribute(DB, 'productos', 'disponible_hoy', true);
    await databases.createStringAttribute(DB, 'productos', 'imagen_url', 500, false);
  }, ['nombre', 'descripcion', 'precio', 'categoria', 'disponible_hoy', 'imagen_url']);
};

const createPedidos = async () => {
  await createCollectionWithAttrs('pedidos', 'Pedidos', async () => {
    await databases.createStringAttribute(DB, 'pedidos', 'mesa_id', 36, true);
    await databases.createStringAttribute(DB, 'pedidos', 'mesero_id', 36, false);
    await databases.createDatetimeAttribute(DB, 'pedidos', 'fecha_hora', true);
    await databases.createFloatAttribute(DB, 'pedidos', 'total', true);
    await databases.createStringAttribute(DB, 'pedidos', 'estado', 20, true);
  }, ['mesa_id', 'mesero_id', 'fecha_hora', 'total', 'estado']);
};

const createPedidosDetalle = async () => {
  await createCollectionWithAttrs('pedidos_detalle', 'Pedidos Detalle', async () => {
    await databases.createStringAttribute(DB, 'pedidos_detalle', 'pedido_id', 36, true);
    await databases.createStringAttribute(DB, 'pedidos_detalle', 'producto_id', 36, true);
    await databases.createIntegerAttribute(DB, 'pedidos_detalle', 'cantidad', true);
    await databases.createFloatAttribute(DB, 'pedidos_detalle', 'precio_unitario', true);
    await databases.createStringAttribute(DB, 'pedidos_detalle', 'notas', 500, false);
    await databases.createStringAttribute(DB, 'pedidos_detalle', 'estado_item', 20, true);
  }, ['pedido_id', 'producto_id', 'cantidad', 'precio_unitario', 'notas', 'estado_item']);
};

const createFacturas = async () => {
  await createCollectionWithAttrs('facturas', 'Facturas', async () => {
    await databases.createStringAttribute(DB, 'facturas', 'pedido_id', 36, true);
    await databases.createStringAttribute(DB, 'facturas', 'ticket_numero', 50, true);
    await databases.createStringAttribute(DB, 'facturas', 'metodo_pago', 20, true);
    await databases.createFloatAttribute(DB, 'facturas', 'subtotal', true);
    await databases.createFloatAttribute(DB, 'facturas', 'propina', false);
    await databases.createDatetimeAttribute(DB, 'facturas', 'fecha', true);
  }, ['pedido_id', 'ticket_numero', 'metodo_pago', 'subtotal', 'propina', 'fecha']);
};

// ===== INDEXES =====

const createIndexes = async () => {
  log.step('Creando indices...');
  
  const indexDefs = [
    { coll: 'mesas', key: 'idx_mesas_estado', type: 'key', attrs: ['estado'] },
    { coll: 'mesas', key: 'idx_mesas_numero', type: 'key', attrs: ['numero'] },
    { coll: 'productos', key: 'idx_productos_categoria', type: 'key', attrs: ['categoria'] },
    { coll: 'productos', key: 'idx_productos_disponible', type: 'key', attrs: ['disponible_hoy'] },
    { coll: 'pedidos', key: 'idx_pedidos_mesa', type: 'key', attrs: ['mesa_id'] },
    { coll: 'pedidos', key: 'idx_pedidos_estado', type: 'key', attrs: ['estado'] },
    { coll: 'pedidos', key: 'idx_pedidos_fecha', type: 'key', attrs: ['fecha_hora'] },
    { coll: 'pedidos_detalle', key: 'idx_detalle_pedido', type: 'key', attrs: ['pedido_id'] },
    { coll: 'pedidos_detalle', key: 'idx_detalle_producto', type: 'key', attrs: ['producto_id'] },
    { coll: 'facturas', key: 'idx_facturas_pedido', type: 'key', attrs: ['pedido_id'] },
    { coll: 'meseros', key: 'idx_meseros_pin', type: 'key', attrs: ['pin'] },
    { coll: 'meseros', key: 'idx_meseros_activo', type: 'key', attrs: ['activo'] },
  ];
  
  for (const idx of indexDefs) {
    try {
      if (idx.type === 'key') {
        await databases.createIndex(DB, idx.coll, idx.key, 'key', idx.attrs, idx.attrs.map(() => 'ASC'));
      }
      log.success(`Indice creado: ${idx.key}`);
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        log.warn(`Indice ya existe: ${idx.key}`);
      } else {
        log.warn(`Error creando indice ${idx.key}: ${e.message}`);
      }
    }
  }
};

// ===== MAIN =====

const main = async () => {
  console.log('\n');
  log.info('=================================================');
  log.info('  CONFIGURANDO APPWRITE - LA SEPTIMA');
  log.info('  Database ID: ' + APPWRITE_DATABASE_ID);
  log.info('=================================================');
  console.log('\n');
  
  try {
    // Verify database exists or create it
    log.step('Verificando base de datos...');
    try {
      await databases.get(DB);
      log.success(`Base de datos encontrada: ${DB}`);
    } catch (e) {
      log.info('Creando base de datos...');
      await databases.create(DB, 'La Septima');
      log.success(`Base de datos creada: ${DB}`);
    }
    
    // Create all collections
    await createCategorias();
    await createMeseros();
    await createMesas();
    await createProductos();
    await createPedidos();
    await createPedidosDetalle();
    await createFacturas();
    
    // Create indexes
    await createIndexes();
    
    console.log('\n');
    log.success('=================================================');
    log.success('  CONFIGURACION COMPLETADA EXITOSAMENTE');
    log.success('=================================================');
    console.log('\n');
    log.info('Colecciones creadas:');
    log.info('  - categorias');
    log.info('  - meseros');
    log.info('  - mesas');
    log.info('  - productos');
    log.info('  - pedidos');
    log.info('  - pedidos_detalle');
    log.info('  - facturas');
    console.log('\n');
    log.info('Proximo paso: ejecutar seed-appwrite.js para cargar datos demo');
    
  } catch (error) {
    console.log('\n');
    log.error('ERROR EN LA CONFIGURACION:');
    log.error(error.message);
    if (error.code) log.error(`Codigo: ${error.code}`);
    process.exit(1);
  }
};

main();
