import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta absoluta al archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Agregar esta línea para debug
console.log('Directorio actual:', process.cwd());
console.log('Intentando abrir DB en:', path.resolve('./database/repox.db'));

// Abrir la base de datos SQLite
const dbPath = path.resolve('./backend/database/repox.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite:', dbPath);
  }
});

// Crear tablas

db.serialize(() => {
    console.log('Ejecutando creación de tablas...');
    
    // Tabla productos
    console.log('Creando tabla: productos');
    db.run(`CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nombre TEXT,
        precio REAL,
        stock INTEGER,
        categoria TEXT
    )`, (err) => {
        if (err) console.log('Error creando tabla productos:', err);
        else console.log('Tabla productos creada/verificada');
    });
    
    // Tabla ventas
    console.log('Creando tabla: ventas');
    db.run(`CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        total REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )`);

    // Tabla proveedores
    console.log('Creando tabla: proveedores');
    db.run(`CREATE TABLE IF NOT EXISTS proveedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        telefono TEXT,
        email TEXT,
        direccion TEXT
    )`);
    
    // Tabla detalle de entradas
    console.log('Creando tabla: entradas');
    db.run(`CREATE TABLE IF NOT EXISTS entradas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proveedor_id INTEGER,
        no_factura TEXT,
        total REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'RECIBIDO',
        bodega TEXT DEFAULT 'MAZATENANGO',
        nit_proveedor TEXT DEFAULT '',
        nombre_proveedor TEXT DEFAULT '',
        direccion_proveedor TEXT DEFAULT '',
        fecha_factura DATE,
        tipo_compra TEXT DEFAULT 'VENTA DIRECTA',
        genera_factura TEXT DEFAULT 'Si',
        serie_factura TEXT DEFAULT '',
        motivo TEXT DEFAULT '',
        FOREIGN KEY(proveedor_id) REFERENCES proveedores(id)
    )`);

    // Tabla detalle de entradas
    console.log('Creando tabla: det_entrada');
    db.run(`CREATE TABLE IF NOT EXISTS entradas_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entrada_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER,
        precio_compra REAL,
        FOREIGN KEY(entrada_id) REFERENCES entradas(id),
        FOREIGN KEY(producto_id) REFERENCES productos(id)
    )`);

    // Tabla devoluciones de ventas
    console.log('Creando tabla: dev_venta');
    db.run(`CREATE TABLE IF NOT EXISTS devoluciones_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER,
        motivo TEXT,
        total_devolucion REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'PROCESADA',
        FOREIGN KEY(venta_id) REFERENCES ventas(id)
    )`);
    
    // Tabla detalle devoluciones ventas
    console.log('Creando tabla: det_dev_venta');
    db.run(`CREATE TABLE IF NOT EXISTS devoluciones_ventas_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        devolucion_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER,
        precio REAL,
        FOREIGN KEY(devolucion_id) REFERENCES devoluciones_ventas(id),
        FOREIGN KEY(producto_id) REFERENCES productos(id)
    )`);
    
    // Tabla devoluciones a proveedores
    console.log('Creando tabla: dev_:proveedores');
    db.run(`CREATE TABLE IF NOT EXISTS devoluciones_compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entrada_id INTEGER,
        proveedor_id INTEGER,
        motivo TEXT,
        total_devolucion REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'PENDIENTE',
        FOREIGN KEY(entrada_id) REFERENCES entradas(id),
        FOREIGN KEY(proveedor_id) REFERENCES proveedores(id)
    )`);
    
    // Tabla detalle devoluciones compras
    console.log('Creando tabla: det_dev_proveedores');
    db.run(`CREATE TABLE IF NOT EXISTS devoluciones_compras_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        devolucion_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER,
        precio REAL,
        FOREIGN KEY(devolucion_id) REFERENCES devoluciones_compras(id),
        FOREIGN KEY(producto_id) REFERENCES productos(id)
    )`);

    // Tabla clientes empresariales
    console.log('Creando tabla: clientes_emp');
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        empresa TEXT,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        limite_credito REAL DEFAULT 0,
        saldo_pendiente REAL DEFAULT 0
    )`);
    
    // Tabla cotizaciones
    console.log('Creando tabla: cotizaciones');
    db.run(`CREATE TABLE IF NOT EXISTS cotizaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        subtotal REAL,
        total REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento DATE,
        estado TEXT DEFAULT 'ENVIADA',
        observaciones TEXT,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )`);
    
    // Tabla de órdenes
    console.log('Creando tabla: ordenes');
    db.run(`CREATE TABLE IF NOT EXISTS ordenes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        subtotal REAL,
        total REAL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'PEDIDO',
        motivo_cancelacion TEXT,
        fecha_cancelacion DATETIME,
        observaciones TEXT,
        bodega TEXT DEFAULT '',
        nit_cliente TEXT DEFAULT '',
        nombre_cliente TEXT DEFAULT '',
        direccion_cliente TEXT DEFAULT '',
        transporte TEXT DEFAULT 'Entrega en tienda',
        nombre_entrega TEXT DEFAULT '',
        forma_pago TEXT DEFAULT 'CONTADO',
        tipo_venta TEXT DEFAULT 'CONTADO',
        monto_envio REAL DEFAULT 0,
        total_pagar REAL DEFAULT 0,
        numero_fel TEXT DEFAULT NULL,
        uuid_fel TEXT DEFAULT NULL,
        fecha_autorizacion DATETIME DEFAULT NULL,
        xml_fel TEXT DEFAULT NULL,
        estado_fel TEXT DEFAULT NULL,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )`);
    
    // Tabla detalle de órdenes
    console.log('Creando tabla: det_ordenes');
    db.run(`CREATE TABLE IF NOT EXISTS ordenes_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orden_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER,
        precio_unitario REAL,
        total_linea REAL,
        FOREIGN KEY(orden_id) REFERENCES ordenes(id),
        FOREIGN KEY(producto_id) REFERENCES productos(id)
    )`);

    // Tabla roles de usuario
    console.log('Creando tabla: usuario_roles');
    db.run(`CREATE TABLE IF NOT EXISTS usuarios_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_uid TEXT UNIQUE,
        email TEXT,
        rol TEXT DEFAULT 'vendedor',
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de auditoría de cambios de precios
    console.log('Creando tabla: audit_precios');
    db.run(`CREATE TABLE IF NOT EXISTS auditoria_precios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id INTEGER,
        precio_anterior REAL,
        precio_nuevo REAL,
        usuario_email TEXT,
        usuario_rol TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(producto_id) REFERENCES productos(id)
    )`, (err) => {
        if (err) console.log('Error creando tabla auditoria_precios:', err);
        else console.log('Tabla auditoria_precios creada/verificada');
    });
});

// Tabla de ajustes de inventario
console.log('Creando tabla: ajustes_inv');
db.run(`CREATE TABLE IF NOT EXISTS ajustes_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER,
    stock_anterior INTEGER,
    stock_nuevo INTEGER,
    diferencia INTEGER,
    motivo TEXT,
    usuario_email TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(producto_id) REFERENCES productos(id)
)`);

// Líneas temporales para actualizar estados
db.run(`UPDATE entradas SET estado = 'RECIBIDO' WHERE estado = 'PENDIENTE'`, (err) => {
    if (err) console.log('Error actualizando estados:', err);
    else console.log('Estados de entradas actualizados correctamente');
});

export default db;