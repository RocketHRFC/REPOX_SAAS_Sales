import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database/index.js';
import { config } from './config/index.js';
import productosRoutes from './routes/productos.js';
import ventasRoutes from './routes/ventas.js';
import comprasRoutes from './routes/compras.js';
import reportesRoutes from './routes/reportes.js';
import pdfRoutes from './routes/pdf.js';
import pdfInventarioRoutes from './routes/pdfInventario.js';
import pdfKardexRoutes from './routes/pdfKardex.js';
import pdfKardexGeneralRoutes from './routes/pdfKardexGeneral.js';


// Necesario para simular __dirname en módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/pdf', pdfInventarioRoutes);
app.use('/api/pdf', pdfKardexRoutes);
app.use('/api/pdf', pdfKardexGeneralRoutes);


// Ejemplo de endpoint temporal para probar
app.get('/', (req, res) => {
  res.send('✅ Servidor REPOX funcionando correctamente');
});

// API - Obtener productos
app.get('/api/productos', (req, res) => {
    db.all('SELECT * FROM productos', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Buscar productos
app.get('/api/productos/buscar/:termino', (req, res) => {
    const termino = req.params.termino;
    console.log('Término buscado:', JSON.stringify(termino));
    console.log('Comparando con codigo 1:', termino === '1');
    
    db.all('SELECT * FROM productos', [], (err, allRows) => {
        console.log('Todos los productos:', allRows);
        const filtered = allRows.filter(p => p.codigo === termino || p.nombre.includes(termino));
        console.log('Productos filtrados:', filtered);
        res.json(filtered);
    });
});

// API - Procesar venta
app.post('/api/ventas', (req, res) => {
    const { productos, total } = req.body;
    
    // VALIDACIÓN PREVIA - ANTES de tocar la DB
    let erroresStock = [];
    let validacionesCompletas = 0;
    
    productos.forEach(item => {
        db.get('SELECT stock FROM productos WHERE id = ?', [item.id], (err, producto) => {
            if (err || !producto) {
                erroresStock.push(`Producto ${item.nombre}: no encontrado`);
            } else if (producto.stock < item.cantidad) {
                erroresStock.push(`Producto ${item.nombre}: stock insuficiente (disponible: ${producto.stock})`);
            }
            
            validacionesCompletas++;
            
            // Cuando termine de validar todos
            if (validacionesCompletas === productos.length) {
                if (erroresStock.length > 0) {
                    return res.status(400).json({ error: erroresStock.join(', ') });
                }
                
                // AHORA SÍ procesar la venta (sin riesgo de errores)
                procesarVentaSegura();
            }
        });
    });
    
    function procesarVentaSegura() {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run('INSERT INTO ventas (cliente_id, total) VALUES (?, ?)', 
                [null, total], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const ventaId = this.lastID;
                    let productosProcessed = 0;
                    
                    productos.forEach(item => {
                        db.run('UPDATE productos SET stock = stock - ? WHERE id = ?',
                            [item.cantidad, item.id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                productosProcessed++;
                                
                                if (productosProcessed === productos.length) {
                                    db.run('COMMIT');
                                    res.json({ id: ventaId, total: total });
                                }
                            });
                    });
            });
        });
    }
});

// API - Obtener proveedores
app.get('/api/proveedores', (req, res) => {
    db.all('SELECT * FROM proveedores', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Agregar proveedor
app.post('/api/proveedores', (req, res) => {
    const { nombre, telefono, email, direccion } = req.body;
    db.run('INSERT INTO proveedores (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)',
        [nombre, telefono, email || null, direccion || null], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nombre });
    });
});

// API - Registrar entrada
app.post('/api/entradas', (req, res) => {
    const { productos, productos_nuevos, total } = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insertar entrada
        db.run(`INSERT INTO entradas (proveedor_id, no_factura, total, bodega, nit_proveedor, 
            nombre_proveedor, direccion_proveedor, fecha, tipo_compra, genera_factura, 
            fecha_factura, serie_factura, motivo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [null, req.body.no_factura, req.body.total, req.body.bodega, req.body.nit_proveedor,
        req.body.nombre_proveedor, req.body.direccion_proveedor, req.body.fecha,
        req.body.tipo_compra, req.body.genera_factura, req.body.fecha_factura,
        req.body.serie_factura, req.body.motivo], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }
            
            const entradaId = this.lastID;
            let operacionesCompletas = 0;
            const totalOperaciones = productos.length + productos_nuevos.length;
            
            if (totalOperaciones === 0) {
                db.run('COMMIT');
                return res.json({ id: entradaId });
            }
            
            // Procesar productos existentes
            productos.forEach(item => {
                db.run('INSERT INTO entradas_detalle (entrada_id, producto_id, cantidad, precio_compra) VALUES (?, ?, ?, ?)',
                    [entradaId, item.producto_id, item.cantidad, item.precio], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        db.run('UPDATE productos SET stock = stock + ? WHERE id = ?',
                            [item.cantidad, item.producto_id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                operacionesCompletas++;
                                if (operacionesCompletas === totalOperaciones) {
                                    db.run('COMMIT');
                                    res.json({ id: entradaId });
                                }
                        });
                });
            });
            
            // Procesar productos nuevos
            productos_nuevos.forEach(item => {
                // Crear producto
                db.run('INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES (?, ?, ?, ?, ?)',
                    [item.codigo, item.nombre, item.precio, item.cantidad, item.categoria], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        const nuevoProductoId = this.lastID;
                        
                        // Agregar a detalle de entrada
                        db.run('INSERT INTO entradas_detalle (entrada_id, producto_id, cantidad, precio_compra) VALUES (?, ?, ?, ?)',
                            [entradaId, nuevoProductoId, item.cantidad, item.precio_compra], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                operacionesCompletas++;
                                if (operacionesCompletas === totalOperaciones) {
                                    db.run('COMMIT');
                                    res.json({ id: entradaId });
                                }
                        });
                });
            });
        });
    });
});

// API - Obtener entradas
app.get('/api/entradas', (req, res) => {
    db.all(`SELECT e.id, e.fecha, e.estado, e.tipo_compra, e.nombre_proveedor, 
                e.serie_factura, e.no_factura, e.total, e.bodega, e.nit_proveedor,
                e.direccion_proveedor, e.motivo, e.fecha_factura, e.genera_factura
        FROM entradas e 
        ORDER BY e.fecha DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Buscar orden por ID (para devoluciones)  
app.get('/api/ordenes/:id', (req, res) => {
    const ordenId = req.params.id;
    db.get(`SELECT o.*, c.nombre as cliente_nombre 
            FROM ordenes o 
            LEFT JOIN clientes c ON o.cliente_id = c.id 
            WHERE o.id = ?`, [ordenId], (err, orden) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
        
        // Obtener productos de la orden
        db.all(`SELECT od.*, p.nombre as producto_nombre 
                FROM ordenes_detalle od 
                JOIN productos p ON od.producto_id = p.id 
                WHERE od.orden_id = ?`, [ordenId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            orden.productos = productos;
            res.json(orden);
        });
    });
});

// API - Buscar entrada por ID (para devoluciones)
app.get('/api/entradas/:id', (req, res) => {
    const entradaId = req.params.id;
    db.get(`SELECT e.*, p.nombre as proveedor_nombre 
            FROM entradas e 
            LEFT JOIN proveedores p ON e.proveedor_id = p.id 
            WHERE e.id = ?`, [entradaId], (err, entrada) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
        
        // Obtener productos de la entrada
        db.all(`SELECT ed.*, pr.nombre as producto_nombre, pr.codigo 
                FROM entradas_detalle ed 
                JOIN productos pr ON ed.producto_id = pr.id 
                WHERE ed.entrada_id = ?`, [entradaId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            entrada.productos = productos;
            res.json(entrada);
        });
    });
});

// API - Procesar devolución de venta
app.post('/api/devoluciones/venta', (req, res) => {
    const { venta_id, motivo, productos, total } = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insertar devolución
        db.run('INSERT INTO devoluciones_ventas (venta_id, motivo, total_devolucion) VALUES (?, ?, ?)',
            [venta_id, motivo, total], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                const devolucionId = this.lastID;
                let productosProcessed = 0;
                
                // Procesar cada producto devuelto
                productos.forEach(item => {
                    // Insertar detalle
                    db.run('INSERT INTO devoluciones_ventas_detalle (devolucion_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
                        [devolucionId, item.producto_id, item.cantidad, item.precio], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            
                            // Devolver stock
                            db.run('UPDATE productos SET stock = stock + ? WHERE id = ?',
                                [item.cantidad, item.producto_id], function(err) {
                                    if (err) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: err.message });
                                    }
                                    
                                    productosProcessed++;
                                    if (productosProcessed === productos.length) {
                                        db.run('COMMIT');
                                        res.json({ id: devolucionId });
                                    }
                            });
                    });
                });
        });
    });
});

// API - Procesar devolución a proveedor
app.post('/api/devoluciones/compra', (req, res) => {
    const { entrada_id, proveedor_id, motivo, productos, total } = req.body;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insertar devolución
        db.run('INSERT INTO devoluciones_compras (entrada_id, proveedor_id, motivo, total_devolucion) VALUES (?, ?, ?, ?)',
            [entrada_id, proveedor_id, motivo, total], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                const devolucionId = this.lastID;
                let productosProcessed = 0;
                
                // Procesar cada producto devuelto
                productos.forEach(item => {
                    // Insertar detalle
                    db.run('INSERT INTO devoluciones_compras_detalle (devolucion_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
                        [devolucionId, item.producto_id, item.cantidad, item.precio], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            
                            // Reducir stock
                            db.run('UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?',
                                [item.cantidad, item.producto_id, item.cantidad], function(err) {
                                    if (err || this.changes === 0) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Stock insuficiente para devolución' });
                                    }
                                    
                                    productosProcessed++;
                                    if (productosProcessed === productos.length) {
                                        db.run('COMMIT');
                                        res.json({ id: devolucionId });
                                    }
                            });
                    });
                });
        });
    });
});

// API - Obtener clientes
app.get('/api/clientes', (req, res) => {
    db.all('SELECT * FROM clientes ORDER BY nombre', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Agregar cliente
app.post('/api/clientes', (req, res) => {
    const { nombre, empresa, telefono, email, direccion, limite_credito } = req.body;
    db.run('INSERT INTO clientes (nombre, empresa, telefono, email, direccion, limite_credito) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, empresa, telefono, email, direccion, limite_credito || 0], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
    });
});

// API - Procesar orden (desde ventas)
app.post('/api/ordenes', (req, res) => {
    const { cliente_id, productos, total, observaciones } = req.body;
    
    // VALIDACIÓN PREVIA - ANTES de tocar la DB
    let erroresStock = [];
    let validacionesCompletas = 0;
    
    productos.forEach(item => {
        db.get('SELECT stock FROM productos WHERE id = ?', [item.id], (err, producto) => {
            if (err || !producto) {
                erroresStock.push(`Producto ${item.nombre}: no encontrado`);
            } else if (producto.stock < item.cantidad) {
                erroresStock.push(`Producto ${item.nombre}: stock insuficiente (disponible: ${producto.stock})`);
            }
            
            validacionesCompletas++;
            
            // Cuando termine de validar todos
            if (validacionesCompletas === productos.length) {
                if (erroresStock.length > 0) {
                    return res.status(400).json({ error: erroresStock.join(', ') });
                }
                
                // AHORA SÍ procesar la orden (sin riesgo de errores)
                procesarOrdenSegura();
            }
        });
    });
    
    function procesarOrdenSegura() {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run(`INSERT INTO ordenes (cliente_id, total, observaciones, bodega, nit_cliente, 
                    nombre_cliente, direccion_cliente, transporte, nombre_entrega, forma_pago, 
                    tipo_venta, monto_envio, total_pagar) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [cliente_id || null, total, observaciones || null, 
                req.body.bodega || '', req.body.nit_cliente || '', req.body.nombre_cliente || '',
                req.body.direccion_cliente || '', req.body.transporte || 'Entrega en tienda',
                req.body.nombre_entrega || '', req.body.forma_pago || 'CONTADO',
                req.body.tipo_venta || 'CONTADO', req.body.monto_envio || 0,
                (total + (req.body.monto_envio || 0))], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const ordenId = this.lastID;
                    let productosProcessed = 0;
                    
                    productos.forEach(item => {
                        // Insertar detalle
                        db.run('INSERT INTO ordenes_detalle (orden_id, producto_id, cantidad, precio_unitario, total_linea) VALUES (?, ?, ?, ?, ?)',
                            [ordenId, item.id, item.cantidad, item.precio, item.cantidad * item.precio], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                // Actualizar stock
                                db.run('UPDATE productos SET stock = stock - ? WHERE id = ?',
                                    [item.cantidad, item.id], function(err) {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }
                                        
                                        productosProcessed++;
                                        
                                        if (productosProcessed === productos.length) {
                                            db.run('COMMIT');
                                            res.json({ id: ordenId, numero: ordenId });
                                        }
                                });
                        });
                    });
            });
        });
    }
});

// API - Obtener órdenes
app.get('/api/ordenes', (req, res) => {
    db.all(`SELECT o.*, c.nombre as cliente_nombre, c.empresa 
            FROM ordenes o 
            LEFT JOIN clientes c ON o.cliente_id = c.id 
            ORDER BY o.fecha DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Cambiar estado de orden
app.put('/api/ordenes/:id/estado', (req, res) => {
    const ordenId = req.params.id;
    const { estado, motivo_cancelacion } = req.body;
    
    if (estado === 'CANCELADO') {
        // Si cancela, devolver stock
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Obtener productos de la orden
            db.all('SELECT od.*, p.nombre FROM ordenes_detalle od JOIN productos p ON od.producto_id = p.id WHERE od.orden_id = ?', [ordenId], (err, productos) => {
                
                console.log('Productos actuales a devolver:', productos);
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                let productosProcessed = 0;
                
                productos.forEach(item => {
                    // Devolver stock
                    db.run('UPDATE productos SET stock = stock + ? WHERE id = ?',
                        [item.cantidad, item.producto_id], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            
                            productosProcessed++;
                            
                            if (productosProcessed === productos.length) {
                                // Actualizar estado de orden
                                db.run('UPDATE ordenes SET estado = ?, motivo_cancelacion = ?, fecha_cancelacion = CURRENT_TIMESTAMP WHERE id = ?',
                                    [estado, motivo_cancelacion, ordenId], (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }
                                        
                                        db.run('COMMIT');
                                        res.json({ success: true });
                                });
                            }
                    });
                });
            });
        });
    } else {
        // Solo cambiar estado (sin afectar stock)
        db.run('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, ordenId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

// API - Reporte de inventario general
app.get('/api/reportes/inventario', (req, res) => {
    db.all(`SELECT 
                p.id, p.codigo, p.nombre, p.precio, p.stock, p.categoria,
                (p.precio * p.stock) as valor_total
            FROM productos p 
            ORDER BY p.categoria, p.nombre`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Calcular totales
        const resumen = {
            total_productos: rows.length,
            valor_total_inventario: rows.reduce((sum, p) => sum + p.valor_total, 0),
            productos_sin_stock: rows.filter(p => p.stock <= 0).length,
            productos_stock_bajo: rows.filter(p => p.stock > 0 && p.stock <= 5).length
        };
        
        res.json({ productos: rows, resumen });
    });
});

// API - Reporte de movimientos de inventario
app.get('/api/reportes/movimientos', (req, res) => {
    db.all(`
        SELECT 'ENTRADA' as tipo, e.fecha, p.nombre as producto, p.codigo,
               ed.cantidad, ed.precio_compra as precio, pr.nombre as origen
        FROM entradas e
        JOIN entradas_detalle ed ON e.id = ed.entrada_id
        JOIN productos p ON ed.producto_id = p.id
        JOIN proveedores pr ON e.proveedor_id = pr.id
        
        UNION ALL
        
        SELECT 'SALIDA' as tipo, o.fecha, p.nombre as producto, p.codigo,
               od.cantidad, od.precio_unitario as precio, 
               COALESCE(c.nombre, 'Venta General') as origen
        FROM ordenes o
        JOIN ordenes_detalle od ON o.id = od.orden_id
        JOIN productos p ON od.producto_id = p.id
        LEFT JOIN clientes c ON o.cliente_id = c.id
        WHERE o.estado != 'CANCELADO'
        
        ORDER BY fecha DESC
        LIMIT 100
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Reporte Kardex por producto
app.get('/api/reportes/kardex/:producto_id', (req, res) => {
    const productoId = req.params.producto_id;
    
    db.all(`
        SELECT 'ENTRADA' as tipo, e.fecha, ed.cantidad, 0 as salida,
               ed.precio_compra as precio, pr.nombre as referencia,
               e.no_factura as documento
        FROM entradas e
        JOIN entradas_detalle ed ON e.id = ed.entrada_id
        JOIN proveedores pr ON e.proveedor_id = pr.id
        WHERE ed.producto_id = ?
        
        UNION ALL
        
        SELECT 'SALIDA' as tipo, o.fecha, 0 as cantidad, od.cantidad as salida,
               od.precio_unitario as precio, 
               COALESCE(c.nombre, 'Venta General') as referencia,
               'Orden #' || o.id as documento
        FROM ordenes o
        JOIN ordenes_detalle od ON o.id = od.orden_id
        LEFT JOIN clientes c ON o.cliente_id = c.id
        WHERE od.producto_id = ? AND o.estado != 'CANCELADO'
        
        ORDER BY fecha ASC
    `, [productoId, productoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Calcular saldo acumulado
        let saldo = 0;
        const movimientos = rows.map(mov => {
            saldo += (mov.cantidad - mov.salida);
            return { ...mov, saldo };
        });
        
        res.json(movimientos);
    });
});

// API - Obtener rol del usuario actual
app.get('/api/usuario/rol', async (req, res) => {
    const firebaseUid = req.headers['firebase-uid'];
    
    if (!firebaseUid) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    db.get('SELECT * FROM usuarios_roles WHERE firebase_uid = ?', [firebaseUid], (err, usuario) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!usuario) {
            // Usuario nuevo, asignar rol por defecto
            db.run('INSERT INTO usuarios_roles (firebase_uid, email, rol) VALUES (?, ?, ?)',
                [firebaseUid, req.headers['email'] || '', 'vendedor'], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ rol: 'vendedor', es_nuevo: true });
            });
        } else {
            res.json({ rol: usuario.rol, activo: usuario.activo });
        }
    });
});

// API - Gestionar usuarios (solo admin)
app.get('/api/usuarios', (req, res) => {
    db.all('SELECT id, firebase_uid, email, rol, activo, fecha_creacion FROM usuarios_roles ORDER BY fecha_creacion DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API - Cambiar rol de usuario (solo admin)
app.put('/api/usuarios/:id/rol', (req, res) => {
    const { rol } = req.body;
    const userId = req.params.id;
    
    db.run('UPDATE usuarios_roles SET rol = ? WHERE id = ?', [rol, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// API - Editar orden (solo en estado PEDIDO)
app.put('/api/ordenes/:id/editar', (req, res) => {
    const ordenId = req.params.id;
    const { cambios, eliminados } = req.body;
    
    console.log('BACKEND - Cambios recibidos:', cambios);
    console.log('BACKEND - Eliminados recibidos:', eliminados);
    
    // Verificar que la orden esté en estado PEDIDO
    db.get('SELECT estado FROM ordenes WHERE id = ?', [ordenId], (err, orden) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
        if (orden.estado !== 'PEDIDO') {
            return res.status(400).json({ error: 'Solo se pueden editar órdenes en estado PEDIDO' });
        }
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let operacionesCompletas = 0;
            const totalOperaciones = cambios.length + eliminados.length;
            
            if (totalOperaciones === 0) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: 'No hay cambios para aplicar' });
            }
            
            // Procesar cambios de cantidad
            cambios.forEach(cambio => {
                if (cambio.diferencia !== 0) {
                    // Actualizar stock según si aumentó o disminuyó
                    if (cambio.diferencia > 0) {
                        // Aumentó cantidad - quitar más stock
                        db.run('UPDATE productos SET stock = stock - ? WHERE id = ?',
                            [cambio.diferencia, cambio.producto_id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                // Actualizar detalle de orden
                                db.run('UPDATE ordenes_detalle SET cantidad = ?, total_linea = cantidad * precio_unitario WHERE orden_id = ? AND producto_id = ?',
                                    [cambio.cantidad_nueva, ordenId, cambio.producto_id], function(err) {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }
                                        
                                        operacionesCompletas++;
                                        if (operacionesCompletas === totalOperaciones) {
                                            finalizarEdicion();
                                        }
                                });
                        });
                    } else if (cambio.diferencia < 0) {
                        // Disminuyó cantidad - devolver stock
                        db.run('UPDATE productos SET stock = stock + ? WHERE id = ?',
                            [Math.abs(cambio.diferencia), cambio.producto_id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                // Actualizar detalle de orden
                                db.run('UPDATE ordenes_detalle SET cantidad = ?, total_linea = cantidad * precio_unitario WHERE orden_id = ? AND producto_id = ?',
                                    [cambio.cantidad_nueva, ordenId, cambio.producto_id], function(err) {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }
                                        
                                        operacionesCompletas++;
                                        if (operacionesCompletas === totalOperaciones) {
                                            finalizarEdicion();
                                        }
                                });
                        });
                    }
                }
            });
            
            // Procesar productos eliminados
            eliminados.forEach(eliminado => {
                // Devolver stock
                db.run('UPDATE productos SET stock = stock + ? WHERE id = ?',
                    [eliminado.cantidad, eliminado.producto_id], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        // Eliminar de detalle
                        db.run('DELETE FROM ordenes_detalle WHERE orden_id = ? AND producto_id = ?',
                            [ordenId, eliminado.producto_id], function(err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                operacionesCompletas++;
                                if (operacionesCompletas === totalOperaciones) {
                                    finalizarEdicion();
                                }
                        });
                });
            });
            
            function finalizarEdicion() {
                // Recalcular total de la orden
                db.get('SELECT SUM(total_linea) as nuevo_total FROM ordenes_detalle WHERE orden_id = ?', 
                    [ordenId], (err, resultado) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        const nuevoTotal = resultado.nuevo_total || 0;
                        
                        // Actualizar orden con nuevo total
                        db.run('UPDATE ordenes SET total = ?, total_pagar = total + monto_envio WHERE id = ?',
                            [nuevoTotal, ordenId], (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                db.run('COMMIT');
                                res.json({ success: true, nuevo_total: nuevoTotal });
                        });
                });
            }
        });
    });
});

// =================== NUEVOS ENDPOINTS DASHBOARD ===================

// API - Dashboard: Métricas generales
app.get('/api/dashboard/metricas', (req, res) => {
    db.serialize(() => {
        let metricas = {};
        let consultasCompletas = 0;
        const totalConsultas = 6;
        
        // 1. Valor total del inventario
        db.get(`SELECT 
                COALESCE(SUM(CASE WHEN precio > 0 AND stock > 0 THEN precio * stock ELSE 0 END), 0) as valor_total,
                COUNT(*) as total_productos,
                SUM(CASE WHEN precio > 0 THEN 1 ELSE 0 END) as productos_con_precio,
                SUM(stock) as total_stock
                FROM productos`, (err, inventario) => {  // <- AGREGUÉ "FROM productos"
            if (!err && inventario) {
                metricas.valor_inventario = inventario.valor_total || 0;
                metricas.total_productos = inventario.total_productos || 0;
            }
            
            // TEMPORAL - para debugging
            console.log('Datos inventario:', inventario);
            db.all('SELECT codigo, nombre, precio, stock, (precio * stock) as valor FROM productos LIMIT 5', (err, sample) => {
                console.log('Muestra productos:', sample);
            });
            
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);  // <- MOVÍ ESTO AL FINAL
        });
        
        // 2. Ventas del día
        db.get(`SELECT SUM(total) as ventas_hoy, COUNT(*) as ordenes_hoy 
                FROM ordenes 
                WHERE DATE(fecha) = DATE('now') AND estado != 'CANCELADO'`, (err, ventas) => {
            if (!err && ventas) {
                metricas.ventas_hoy = ventas.ventas_hoy || 0;
                metricas.ordenes_hoy = ventas.ordenes_hoy || 0;
            }
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);
        });
        
        // 3. Stock crítico (productos con stock <= 5)
        db.get(`SELECT COUNT(*) as stock_critico 
                FROM productos WHERE stock <= 5 AND stock > 0`, (err, critico) => {
            if (!err && critico) {
                metricas.stock_critico = critico.stock_critico || 0;
            }
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);
        });
        
        // 4. Productos sin stock
        db.get(`SELECT COUNT(*) as sin_stock 
                FROM productos WHERE stock = 0`, (err, sinStock) => {
            if (!err && sinStock) {
                metricas.sin_stock = sinStock.sin_stock || 0;
            }
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);
        });
        
        // 5. Órdenes pendientes
        db.get(`SELECT COUNT(*) as ordenes_pendientes 
                FROM ordenes WHERE estado = 'PEDIDO'`, (err, pendientes) => {
            if (!err && pendientes) {
                metricas.ordenes_pendientes = pendientes.ordenes_pendientes || 0;
            }
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);
        });
        
        // 6. Tasa de rotación (mejorada)
        db.get(`SELECT 
            COALESCE(SUM(od.cantidad), 0) as productos_vendidos_mes,
            (SELECT AVG(stock) FROM productos WHERE stock > 0) as stock_promedio_actual,
            (SELECT COUNT(*) FROM productos WHERE stock > 0) as productos_activos
        FROM ordenes_detalle od 
        JOIN productos p ON od.producto_id = p.id
        JOIN ordenes o ON od.orden_id = o.id
        WHERE o.fecha >= DATE('now', '-30 days') AND o.estado != 'CANCELADO'`, (err, rotacion) => {
            if (!err && rotacion) {
                // Cálculo más conservador: si stock promedio < 5, usar 5 como mínimo
                const stockMinimo = Math.max(rotacion.stock_promedio_actual || 1, 5);
                const ventasMensuales = rotacion.productos_vendidos_mes || 0;
                const rotacionAnual = stockMinimo > 0 ? 
                    ((ventasMensuales / stockMinimo) * 12) : 0;
                
                // Limitar a máximo 24x por año para que sea realista
                metricas.tasa_rotacion = Math.min(parseFloat(rotacionAnual.toFixed(1)), 24);
            }
            consultasCompletas++;
            if (consultasCompletas === totalConsultas) res.json(metricas);
        });
    });
});

// API - Dashboard: Productos con stock crítico
app.get('/api/dashboard/stock-critico', (req, res) => {
    db.all(`SELECT id, codigo, nombre, stock, precio, 
                CASE 
                    WHEN stock = 0 THEN 'SIN_STOCK'
                    WHEN stock <= 3 THEN 'CRITICO' 
                    WHEN stock <= 5 THEN 'BAJO'
                END as estado_stock
            FROM productos 
            WHERE stock <= 5 
            ORDER BY stock ASC, nombre ASC 
            LIMIT 10`, (err, productos) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(productos);
    });
});

// API - Dashboard: Top productos más vendidos
app.get('/api/dashboard/top-productos', (req, res) => {
    db.all(`SELECT 
                p.id, p.codigo, p.nombre, p.stock, p.precio,
                COALESCE(SUM(od.cantidad), 0) as total_vendido,
                COALESCE(SUM(od.total_linea), 0) as revenue_total
            FROM productos p
            LEFT JOIN ordenes_detalle od ON p.id = od.producto_id
            LEFT JOIN ordenes o ON od.orden_id = o.id 
                AND o.fecha >= DATE('now', '-30 days') 
                AND o.estado != 'CANCELADO'
            GROUP BY p.id, p.codigo, p.nombre, p.stock, p.precio
            ORDER BY total_vendido DESC, revenue_total DESC
            LIMIT 8`, (err, productos) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(productos);
    });
});

// API - Dashboard: Órdenes pendientes recientes
app.get('/api/dashboard/ordenes-pendientes', (req, res) => {
    db.all(`SELECT 
                o.id, o.fecha, o.total, o.estado, o.nombre_cliente,
                COUNT(od.id) as total_items
            FROM ordenes o
            LEFT JOIN ordenes_detalle od ON o.id = od.orden_id
            WHERE o.estado IN ('PEDIDO', 'FACTURADO')
            GROUP BY o.id, o.fecha, o.total, o.estado, o.nombre_cliente
            ORDER BY o.fecha DESC
            LIMIT 6`, (err, ordenes) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(ordenes);
    });
});

// API - Dashboard: Predicción de días para agotarse
app.get('/api/dashboard/prediccion-stock', (req, res) => {
    db.all(`SELECT 
                p.id, p.codigo, p.nombre, p.stock,
                COALESCE(AVG(od.cantidad), 0) as venta_promedio_diaria
            FROM productos p
            LEFT JOIN ordenes_detalle od ON p.id = od.producto_id
            LEFT JOIN ordenes o ON od.orden_id = o.id 
                AND o.fecha >= DATE('now', '-30 days') 
                AND o.estado != 'CANCELADO'
            WHERE p.stock > 0 AND p.stock <= 20
            GROUP BY p.id, p.codigo, p.nombre, p.stock
            HAVING venta_promedio_diaria > 0
            ORDER BY (p.stock / (venta_promedio_diaria / 30)) ASC
            LIMIT 5`, (err, predicciones) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const resultado = predicciones.map(p => ({
            ...p,
            dias_restantes: Math.ceil(p.stock / (p.venta_promedio_diaria / 30))
        }));
        
        res.json(resultado);
    });
});

// API - Dashboard: Entradas recientes
app.get('/api/dashboard/entradas-recientes', (req, res) => {
    db.all(`SELECT 
                e.id, e.fecha, e.total, e.estado, e.nombre_proveedor,
                COUNT(ed.id) as total_items
            FROM entradas e
            LEFT JOIN entradas_detalle ed ON e.id = ed.entrada_id
            GROUP BY e.id, e.fecha, e.total, e.estado, e.nombre_proveedor
            ORDER BY e.fecha DESC
            LIMIT 5`, (err, entradas) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(entradas);
    });
});

// API - Historial de producto específico (incluye cambios de precio)
app.get('/api/productos/:id/historial', (req, res) => {
    const productoId = req.params.id;
    
    db.all(`
        SELECT 
            'ENTRADA' as tipo,
            e.fecha,
            ed.cantidad,
            0 as salida,
            ed.precio_compra as precio,
            e.nombre_proveedor as referencia,
            'Entrada #' || e.id as documento,
            e.no_factura as factura,
            'stock' as categoria
        FROM entradas e
        JOIN entradas_detalle ed ON e.id = ed.entrada_id
        WHERE ed.producto_id = ?
        
        UNION ALL
        
        SELECT 
            'VENTA' as tipo,
            o.fecha,
            0 as cantidad,
            od.cantidad as salida,
            od.precio_unitario as precio,
            COALESCE(o.nombre_cliente, 'Cliente General') as referencia,
            'Orden #' || o.id as documento,
            '' as factura,
            'stock' as categoria
        FROM ordenes o
        JOIN ordenes_detalle od ON o.id = od.orden_id
        WHERE od.producto_id = ? AND o.estado != 'CANCELADO'
        
        UNION ALL
        
        SELECT 
            'PRECIO' as tipo,
            ap.fecha,
            0 as cantidad,
            0 as salida,
            ap.precio_nuevo as precio,
            ap.usuario_email as referencia,
            'Cambio precio' as documento,
            '$' || ap.precio_anterior || ' → $' || ap.precio_nuevo as factura,
            'precio' as categoria
        FROM auditoria_precios ap
        WHERE ap.producto_id = ?
        
        ORDER BY fecha DESC
        LIMIT 50
    `, [productoId, productoId, productoId], (err, movimientos) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let saldoActual = 0;
        const movimientosConSaldo = movimientos.reverse().map(mov => {
            if (mov.categoria === 'stock') {
                saldoActual += (mov.cantidad - mov.salida);
                return { ...mov, saldo: saldoActual };
            } else {
                return { ...mov, saldo: '-' };
            }
        });
        
        res.json(movimientosConSaldo.reverse());
    });
});

// API - Actualizar precio de producto (solo admin)
app.put('/api/productos/:id/precio', (req, res) => {
    const { precio } = req.body;
    const productoId = req.params.id;
    const usuarioEmail = req.headers['user-email'] || 'unknown';
    const usuarioRol = req.headers['user-role'] || 'unknown';
    
    // Validar precio
    if (!precio || precio <= 0) {
        return res.status(400).json({ error: 'Precio debe ser mayor a 0' });
    }
    
    // Primero obtener el precio actual
    db.get('SELECT precio FROM productos WHERE id = ?', [productoId], (err, producto) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        
        const precioAnterior = producto.precio;
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Actualizar precio
            db.run('UPDATE productos SET precio = ? WHERE id = ?', [precio, productoId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                // Registrar auditoría
                db.run(`INSERT INTO auditoria_precios (producto_id, precio_anterior, precio_nuevo, usuario_email, usuario_rol) 
                        VALUES (?, ?, ?, ?, ?)`,
                    [productoId, precioAnterior, precio, usuarioEmail, usuarioRol], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        db.run('COMMIT');
                        res.json({ 
                            success: true, 
                            precio: precio,
                            precio_anterior: precioAnterior 
                        });
                });
            });
        });
    });
});

// API - Obtener detalle completo de entrada
app.get('/api/entradas/:id/detalle', (req, res) => {
    const entradaId = req.params.id;
    
    db.get(`SELECT e.*, p.nombre as proveedor_nombre 
            FROM entradas e 
            LEFT JOIN proveedores p ON e.proveedor_id = p.id 
            WHERE e.id = ?`, [entradaId], (err, entrada) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
        
        // Obtener productos de la entrada
        db.all(`SELECT ed.*, pr.nombre as producto_nombre, pr.codigo 
                FROM entradas_detalle ed 
                JOIN productos pr ON ed.producto_id = pr.id 
                WHERE ed.entrada_id = ?`, [entradaId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            entrada.productos = productos;
            res.json(entrada);
        });
    });
});

// API - Ajuste manual de stock
app.put('/api/productos/:id/ajuste-stock', (req, res) => {
    const { stock_nuevo, motivo } = req.body;
    const productoId = req.params.id;
    const usuarioEmail = req.headers['user-email'] || 'unknown';
    
    if (stock_nuevo < 0) {
        return res.status(400).json({ error: 'Stock no puede ser negativo' });
    }
    
    db.get('SELECT stock, nombre FROM productos WHERE id = ?', [productoId], (err, producto) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        
        const stockAnterior = producto.stock;
        const diferencia = stock_nuevo - stockAnterior;
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run('UPDATE productos SET stock = ? WHERE id = ?', [stock_nuevo, productoId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                
                // Registrar ajuste
                db.run(`INSERT INTO ajustes_inventario (producto_id, stock_anterior, stock_nuevo, diferencia, motivo, usuario_email) 
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [productoId, stockAnterior, stock_nuevo, diferencia, motivo, usuarioEmail], function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        
                        db.run('COMMIT');
                        res.json({ 
                            success: true, 
                            diferencia,
                            stock_anterior: stockAnterior,
                            stock_nuevo: stock_nuevo,
                            producto_nombre: producto.nombre
                        });
                });
            });
        });
    });
});

// API - Agregar producto
app.post('/api/productos', (req, res) => {
    const { codigo, nombre, precio, stock, categoria } = req.body;
    db.run('INSERT INTO productos (codigo, nombre, precio, stock, categoria) VALUES (?, ?, ?, ?, ?)',
        [codigo, nombre, precio, stock, categoria], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
    });
});

// API - Anular entrada con validación de stock
app.put('/api/entradas/:id/anular', (req, res) => {
    const entradaId = req.params.id;
    const { motivo } = req.body;
    const usuarioEmail = req.headers['user-email'] || 'unknown';
    
    if (!motivo) {
        return res.status(400).json({ error: 'Motivo es requerido' });
    }
    
    // Verificar que la entrada no esté ya anulada
    db.get('SELECT estado FROM entradas WHERE id = ?', [entradaId], (err, entrada) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
        if (entrada.estado === 'ANULADO') {
            return res.status(400).json({ error: 'La entrada ya está anulada' });
        }
        
        // Obtener productos de la entrada con stock actual
        db.all(`SELECT ed.producto_id, ed.cantidad, p.nombre, p.stock, p.codigo
                FROM entradas_detalle ed 
                JOIN productos p ON ed.producto_id = p.id 
                WHERE ed.entrada_id = ?`, [entradaId], (err, productos) => {
            
            if (err) return res.status(500).json({ error: err.message });
            
            // VALIDACIÓN CRÍTICA: Verificar stock suficiente
            const erroresStock = [];
            productos.forEach(prod => {
                if (prod.stock < prod.cantidad) {
                    erroresStock.push(`${prod.codigo} - ${prod.nombre}: Stock actual ${prod.stock}, necesario ${prod.cantidad}`);
                }
            });
            
            if (erroresStock.length > 0) {
                return res.status(400).json({ 
                    error: `No se puede anular. Stock insuficiente en:\n${erroresStock.join('\n')}\n\nUsa ajuste manual para corregir las diferencias.` 
                });
            }
            
            // PROCEDER CON ANULACIÓN
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                let productosProcessed = 0;
                
                productos.forEach(prod => {
                    // Reducir stock
                    db.run('UPDATE productos SET stock = stock - ? WHERE id = ?',
                        [prod.cantidad, prod.producto_id], function(err) {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            
                            productosProcessed++;
                            
                            if (productosProcessed === productos.length) {
                                // Actualizar estado de entrada
                                db.run('UPDATE entradas SET estado = ?, motivo = ? WHERE id = ?',
                                    ['ANULADO', `ANULADO: ${motivo} (${usuarioEmail})`, entradaId], (err) => {
                                        if (err) {
                                            db.run('ROLLBACK');
                                            return res.status(500).json({ error: err.message });
                                        }
                                        
                                        db.run('COMMIT');
                                        res.json({ 
                                            success: true, 
                                            productos_devueltos: productos.length,
                                            motivo: motivo
                                        });
                                });
                            }
                    });
                });
            });
        });
    });
});

// API - Obtener detalle completo de entrada para impresión
app.get('/api/entradas/:id/detalle', (req, res) => {
    const entradaId = req.params.id;
    
    db.get(`SELECT e.*, p.nombre as proveedor_nombre 
            FROM entradas e 
            LEFT JOIN proveedores p ON e.proveedor_id = p.id 
            WHERE e.id = ?`, [entradaId], (err, entrada) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!entrada) return res.status(404).json({ error: 'Entrada no encontrada' });
        
        // Obtener productos
        db.all(`SELECT ed.*, pr.nombre as producto_nombre, pr.codigo 
                FROM entradas_detalle ed 
                JOIN productos pr ON ed.producto_id = pr.id 
                WHERE ed.entrada_id = ?`, [entradaId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            entrada.productos = productos;
            res.json(entrada);
        });
    });
});

// Endpoint para actualizar estados (temporal)
app.get('/debug/estados', (req, res) => {
    db.run(`UPDATE entradas SET estado = 'RECIBIDO' WHERE estado = 'PENDIENTE'`, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `${this.changes} entradas actualizadas` });
    });
});

// API - Obtener devoluciones recientes
app.get('/api/devoluciones/recientes', (req, res) => {
    const query = `
        SELECT 
            dv.id, dv.motivo, dv.total_devolucion, dv.fecha, dv.estado,
            'VENTA' as tipo,
            'Orden #' || dv.venta_id as referencia
        FROM devoluciones_ventas dv
        
        UNION ALL
        
        SELECT 
            dc.id, dc.motivo, dc.total_devolucion, dc.fecha, dc.estado,
            'COMPRA' as tipo,
            'Entrada #' || dc.entrada_id as referencia
        FROM devoluciones_compras dc
        
        ORDER BY fecha DESC
        LIMIT 10
    `;
    
    db.all(query, (err, devoluciones) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(devoluciones);
    });
});

// API - Detalle de devolución de venta
app.get('/api/devoluciones/venta/:id/detalle', (req, res) => {
    const devolucionId = req.params.id;
    
    db.get(`SELECT dv.*, o.nombre_cliente, o.fecha as fecha_venta, o.id as orden_id
            FROM devoluciones_ventas dv 
            LEFT JOIN ordenes o ON dv.venta_id = o.id 
            WHERE dv.id = ?`, [devolucionId], (err, devolucion) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!devolucion) return res.status(404).json({ error: 'Devolución no encontrada' });
        
        // Obtener productos devueltos
        db.all(`SELECT dvd.*, p.nombre as producto_nombre, p.codigo 
                FROM devoluciones_ventas_detalle dvd 
                JOIN productos p ON dvd.producto_id = p.id 
                WHERE dvd.devolucion_id = ?`, [devolucionId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            devolucion.productos = productos;
            res.json(devolucion);
        });
    });
});

// API - Detalle de devolución de compra
app.get('/api/devoluciones/compra/:id/detalle', (req, res) => {
    const devolucionId = req.params.id;
    
    db.get(`SELECT dc.*, e.nombre_proveedor, e.fecha as fecha_entrada, e.id as entrada_id
            FROM devoluciones_compras dc 
            LEFT JOIN entradas e ON dc.entrada_id = e.id 
            WHERE dc.id = ?`, [devolucionId], (err, devolucion) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!devolucion) return res.status(404).json({ error: 'Devolución no encontrada' });
        
        // Obtener productos devueltos
        db.all(`SELECT dcd.*, p.nombre as producto_nombre, p.codigo 
                FROM devoluciones_compras_detalle dcd 
                JOIN productos p ON dcd.producto_id = p.id 
                WHERE dcd.devolucion_id = ?`, [devolucionId], (err, productos) => {
            if (err) return res.status(500).json({ error: err.message });
            devolucion.productos = productos;
            res.json(devolucion);
        });
    });
});

/* Iniciar servidor
app.listen(PORT, () => {
    console.log(`REPOX corriendo en http://localhost:${PORT}`);
});
*/

export default app;
