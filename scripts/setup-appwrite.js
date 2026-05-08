import { Client, Databases } from 'node-appwrite';

const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '69fe3625003ce05edab5';
const APPWRITE_DATABASE_ID = '69fe36d7002894d4896a';
const APPWRITE_API_KEY = 'standard_d157e60086e5f8401f6c7eaba3d9229ebd301829a6fb855d95dbcefb04f22a54713a732c81a72c4941c522fad5b71ed4a352d5495c6e98d7d87d8d0cf1eb7782db01ccc9ec8b2be4a26c8dbff569e8689416f9abe93133aa6ac48960161169cd32fe746b863a9087cebc538f3b4c514d5506e46d6e0325c1abec2d85b9017515';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  step: (msg) => console.log(`\n\x1b[35m📌 ${msg}\x1b[0m`),
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const collectionExists = async (collectionId) => {
  try {
    await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
    return true;
  } catch {
    return false;
  }
};

const waitForAttribute = async (collectionId, attributeKey, maxAttempts = 15) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
      const exists = collection.attributes?.some(attr => attr.key === attributeKey);
      if (exists) return true;
    } catch (e) {}
    await delay(1000);
  }
  return false;
};

const createPedidosDetalle = async () => {
  log.step('Creando colección: pedidos_detalle');
  
  if (await collectionExists('pedidos_detalle')) {
    log.warn('pedidos_detalle ya existe, saltando...');
    return;
  }
  
  const collection = await databases.createCollection(
    APPWRITE_DATABASE_ID,
    'pedidos_detalle',
    'pedidos_detalle'
  );
  log.success(`Colección creada: ${collection.$id}`);
  
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'pedido_id', 36, true);
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'producto_id', 36, true);
  await databases.createIntegerAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'cantidad', true);
  await databases.createFloatAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'precio_unitario', true);
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'notas', 500, false);
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'pedidos_detalle', 'estado_item', 20, true);
  
  await waitForAttribute('pedidos_detalle', 'pedido_id');
  log.success('Atributos de pedidos_detalle listos');
  await delay(2000);
};

const createFacturas = async () => {
  log.step('Creando colección: facturas');
  
  if (await collectionExists('facturas')) {
    log.warn('facturas ya existe, saltando...');
    return;
  }
  
  const collection = await databases.createCollection(
    APPWRITE_DATABASE_ID,
    'facturas',
    'facturas'
  );
  log.success(`Colección creada: ${collection.$id}`);
  
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'facturas', 'pedido_id', 36, true);
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'facturas', 'ticket_numero', 50, true);
  await databases.createStringAttribute(APPWRITE_DATABASE_ID, 'facturas', 'metodo_pago', 20, true);
  await databases.createFloatAttribute(APPWRITE_DATABASE_ID, 'facturas', 'subtotal', true);
  await databases.createDatetimeAttribute(APPWRITE_DATABASE_ID, 'facturas', 'fecha', true);
  
  await waitForAttribute('facturas', 'pedido_id');
  log.success('Atributos de facturas listos');
  await delay(2000);
};

const main = async () => {
  console.log('\n');
  log.info('═══════════════════════════════════════════');
  log.info('  CONFIGURANDO APPWRITE - COLLECTIONS RESTANTES');
  log.info('═══════════════════════════════════════════');
  console.log('\n');
  
  try {
    await createPedidosDetalle();
    await createFacturas();
    
    console.log('\n');
    log.success('═══════════════════════════════════════════');
    log.success('  CONFIGURACIÓN COMPLETADA');
    log.success('═══════════════════════════════════════════');
    console.log('\n');
  } catch (error) {
    console.log('\n');
    log.error('ERROR:');
    log.error(error.message);
    process.exit(1);
  }
};

main();