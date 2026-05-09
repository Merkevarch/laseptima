const { Client, Databases, Query } = require('/home/z/my-project/laseptima/node_modules/node-appwrite');

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

const collectionHasData = async (collectionId) => {
  try {
    const res = await databases.listDocuments(DB, collectionId, [Query.limit(1)]);
    return res.total > 0;
  } catch (e) {
    return false;
  }
};

const createDoc = async (collectionId, docId, data) => {
  try {
    const doc = await databases.createDocument(DB, collectionId, docId, data);
    return doc;
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      log.warn(`Documento ya existe en ${collectionId}: ${docId}`);
      return null;
    }
    throw e;
  }
};

// ===== SEED DATA =====

const seedCategorias = async () => {
  log.step('Cargando categorias...');
  
  if (await collectionHasData('categorias')) {
    log.warn('categorias ya tiene datos, saltando...');
    return;
  }
  
  const categorias = [
    { id: 'cat-entradas', nombre: 'Entradas', descripcion: 'Aperitivos y entradas del menu', icono: '🥗', orden: 1 },
    { id: 'cat-sopas', nombre: 'Sopas', descripcion: 'Sopas y caldos tradicionales', icono: '🍲', orden: 2 },
    { id: 'cat-fuertes', nombre: 'Platos Fuertes', descripcion: 'Platos principales del menu', icono: '🥩', orden: 3 },
    { id: 'cat-mariscos', nombre: 'Mariscos', descripcion: 'Especialidades del mar', icono: '🦐', orden: 4 },
    { id: 'cat-acompanantes', nombre: 'Acompanantes', descripcion: 'Guarniciones y acompanantes', icono: '🍟', orden: 5 },
    { id: 'cat-bebidas', nombre: 'Bebidas', descripcion: 'Refrescos, jugos y bebidas', icono: '🥤', orden: 6 },
    { id: 'cat-postres', nombre: 'Postres', descripcion: 'Postres y dulces caseros', icono: '🍰', orden: 7 },
  ];
  
  for (const cat of categorias) {
    const doc = await createDoc('categorias', cat.id, {
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      icono: cat.icono,
      orden: cat.orden,
    });
    if (doc) log.success(`Categoria: ${cat.nombre}`);
  }
};

const seedMeseros = async () => {
  log.step('Cargando meseros...');
  
  if (await collectionHasData('meseros')) {
    log.warn('meseros ya tiene datos, saltando...');
    return;
  }
  
  const meseros = [
    { id: 'mesero-1', nombre: 'Carlos Martinez', pin: '1234', telefono: '3001112222', activo: true },
    { id: 'mesero-2', nombre: 'Maria Lopez', pin: '5678', telefono: '3003334444', activo: true },
    { id: 'mesero-3', nombre: 'Juan Perez', pin: '9012', telefono: '3005556666', activo: true },
  ];
  
  for (const m of meseros) {
    const doc = await createDoc('meseros', m.id, {
      nombre: m.nombre,
      pin: m.pin,
      telefono: m.telefono,
      activo: m.activo,
    });
    if (doc) log.success(`Mesero: ${m.nombre} (PIN: ${m.pin})`);
  }
};

const seedMesas = async () => {
  log.step('Cargando mesas...');
  
  if (await collectionHasData('mesas')) {
    log.warn('mesas ya tiene datos, saltando...');
    return;
  }
  
  // Schema: numero (string), capacidad (integer), estado (string)
  const mesas = [
    { numero: '1', capacidad: 4, estado: 'libre' },
    { numero: '2', capacidad: 4, estado: 'libre' },
    { numero: '3', capacidad: 2, estado: 'libre' },
    { numero: '4', capacidad: 2, estado: 'libre' },
    { numero: '5', capacidad: 6, estado: 'libre' },
    { numero: '6', capacidad: 6, estado: 'libre' },
    { numero: '7', capacidad: 8, estado: 'libre' },
    { numero: '8', capacidad: 8, estado: 'libre' },
    { numero: '9', capacidad: 4, estado: 'libre' },
    { numero: '10', capacidad: 10, estado: 'libre' },
  ];
  
  for (const m of mesas) {
    const doc = await createDoc('mesas', 'unique()', {
      numero: m.numero,
      capacidad: m.capacidad,
      estado: m.estado,
    });
    if (doc) log.success(`Mesa ${m.numero} (cap: ${m.capacidad})`);
  }
};

const seedProductos = async () => {
  log.step('Cargando productos...');
  
  if (await collectionHasData('productos')) {
    log.warn('productos ya tiene datos, saltando...');
    return;
  }
  
  // Schema: nombre (string 100), precio (double), categoria (string 50), disponible_hoy (boolean)
  const productos = [
    // Entradas
    { nombre: 'Empanadas de Carne', precio: 8.0, categoria: 'Entradas', disponible_hoy: true },
    { nombre: 'Nachos con Guacamole', precio: 12.0, categoria: 'Entradas', disponible_hoy: true },
    { nombre: 'Tequenos', precio: 9.0, categoria: 'Entradas', disponible_hoy: true },
    { nombre: 'Ceviche Mixto', precio: 15.0, categoria: 'Entradas', disponible_hoy: true },
    
    // Sopas
    { nombre: 'Sancocho de Gallina', precio: 14.0, categoria: 'Sopas', disponible_hoy: true },
    { nombre: 'Ajiaco Bogotano', precio: 16.0, categoria: 'Sopas', disponible_hoy: true },
    
    // Platos Fuertes
    { nombre: 'Bandeja Paisa', precio: 25.0, categoria: 'Plato Fuerte', disponible_hoy: true },
    { nombre: 'Churrasco', precio: 28.0, categoria: 'Plato Fuerte', disponible_hoy: true },
    { nombre: 'Costillas BBQ', precio: 30.0, categoria: 'Plato Fuerte', disponible_hoy: true },
    { nombre: 'Pollo a la Plancha', precio: 18.0, categoria: 'Plato Fuerte', disponible_hoy: true },
    { nombre: 'Lomo Saltado', precio: 26.0, categoria: 'Plato Fuerte', disponible_hoy: true },
    
    // Mariscos
    { nombre: 'Camaron al Ajillo', precio: 32.0, categoria: 'Mariscos', disponible_hoy: true },
    { nombre: 'Pescado Frito', precio: 22.0, categoria: 'Mariscos', disponible_hoy: true },
    { nombre: 'Cazuela de Mariscos', precio: 35.0, categoria: 'Mariscos', disponible_hoy: true },
    
    // Acompanantes
    { nombre: 'Papas Fritas', precio: 5.0, categoria: 'Acompanantes', disponible_hoy: true },
    { nombre: 'Arroz Blanco', precio: 4.0, categoria: 'Acompanantes', disponible_hoy: true },
    { nombre: 'Ensalada Cesar', precio: 8.0, categoria: 'Acompanantes', disponible_hoy: true },
    
    // Bebidas
    { nombre: 'Jugo Natural', precio: 5.0, categoria: 'Bebidas', disponible_hoy: true },
    { nombre: 'Limonada', precio: 4.0, categoria: 'Bebidas', disponible_hoy: true },
    { nombre: 'Cerveza', precio: 6.0, categoria: 'Bebidas', disponible_hoy: true },
    { nombre: 'Agua', precio: 3.0, categoria: 'Bebidas', disponible_hoy: true },
    
    // Postres
    { nombre: 'Tres Leches', precio: 8.0, categoria: 'Postres', disponible_hoy: true },
    { nombre: 'Flan de Caramelo', precio: 6.0, categoria: 'Postres', disponible_hoy: true },
    { nombre: 'Helado', precio: 5.0, categoria: 'Postres', disponible_hoy: true },
  ];
  
  for (const p of productos) {
    const doc = await createDoc('productos', 'unique()', {
      nombre: p.nombre,
      precio: p.precio,
      categoria: p.categoria,
      disponible_hoy: p.disponible_hoy,
    });
    if (doc) log.success(`Producto: ${p.nombre} - $${p.precio}`);
  }
};

// ===== MAIN =====

const main = async () => {
  console.log('\n');
  log.info('=================================================');
  log.info('  CARGANDO DATOS DEMO - LA SEPTIMA');
  log.info('  Database ID: ' + APPWRITE_DATABASE_ID);
  log.info('=================================================');
  console.log('\n');
  
  try {
    await seedCategorias();
    await delay(500);
    await seedMeseros();
    await delay(500);
    await seedMesas();
    await delay(500);
    await seedProductos();
    
    console.log('\n');
    log.success('=================================================');
    log.success('  DATOS DEMO CARGADOS EXITOSAMENTE');
    log.success('=================================================');
    console.log('\n');
    
    // Show summary
    const collections = ['categorias', 'meseros', 'mesas', 'productos', 'pedidos', 'pedidos_detalle', 'facturas'];
    log.info('Resumen de documentos:');
    for (const col of collections) {
      try {
        const res = await databases.listDocuments(DB, col, [Query.limit(1)]);
        log.info('  ' + col + ': ' + res.total + ' documentos');
      } catch (e) {}
    }
    
    console.log('\n');
    log.info('Credenciales de mesero para probar:');
    log.info('  PIN 1234 - Carlos Martinez');
    log.info('  PIN 5678 - Maria Lopez');
    log.info('  PIN 9012 - Juan Perez');
    console.log('\n');
    
  } catch (error) {
    console.log('\n');
    log.error('ERROR CARGANDO DATOS:');
    log.error(error.message);
    if (error.code) log.error(`Codigo: ${error.code}`);
    process.exit(1);
  }
};

main();
