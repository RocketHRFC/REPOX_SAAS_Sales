import db from '../database/index.js';

// 📊 Reporte de ventas (resumen general)
export const getReporteVentas = (req, res) => {
  const { desde, hasta } = req.query;

  let sql = `
    SELECT 
      DATE(fecha) AS fecha,
      COUNT(*) AS total_ventas,
      SUM(total_pagar) AS total_ingresos
    FROM ordenes
    WHERE estado = 'PAGADO'
  `;

  const params = [];

  if (desde && hasta) {
    sql += ` AND DATE(fecha) BETWEEN ? AND ?`;
    params.push(desde, hasta);
  }

  sql += ` GROUP BY DATE(fecha) ORDER BY fecha DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('❌ Error al generar reporte de ventas:', err.message);
      return res.status(500).json({ error: 'Error al generar reporte de ventas' });
    }

    res.json({
      total_dias: rows.length,
      data: rows
    });
  });
};

// 📦 Reporte de ventas por producto
export const getReporteVentasPorProducto = (req, res) => {
  const { desde, hasta } = req.query;

  let sql = `
    SELECT 
      p.codigo AS codigo_producto,
      p.nombre AS producto,
      SUM(od.cantidad) AS unidades_vendidas,
      SUM(od.total_linea) AS total_ingresos
    FROM ordenes_detalle od
    JOIN productos p ON od.producto_id = p.id
    JOIN ordenes o ON od.orden_id = o.id
    WHERE o.estado = 'PAGADO'
  `;

  const params = [];

  if (desde && hasta) {
    sql += ` AND DATE(o.fecha) BETWEEN ? AND ?`;
    params.push(desde, hasta);
  }

  sql += `
    GROUP BY p.id
    ORDER BY total_ingresos DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('❌ Error al generar reporte de ventas por producto:', err.message);
      return res.status(500).json({ error: 'Error al generar reporte de ventas por producto' });
    }

    res.json({
      total_productos: rows.length,
      data: rows
    });
  });
};

// 🧾 Reporte de inventario actual
export const getReporteInventario = (req, res) => {
  const sql = `
    SELECT 
      codigo,
      nombre,
      categoria,
      precio,
      stock,
      (precio * stock) AS valor_total
    FROM productos
    ORDER BY nombre ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al generar reporte de inventario:', err.message);
      return res.status(500).json({ error: 'Error al generar reporte de inventario' });
    }

    const totalProductos = rows.length;
    const valorInventario = rows.reduce((sum, row) => sum + (row.valor_total || 0), 0);

    res.json({
      total_productos: totalProductos,
      valor_inventario: valorInventario,
      data: rows
    });
  });
};

// 📦 Reporte Kardex - movimientos de inventario por producto
// 📦 Reporte Kardex con existencia acumulada
export const getReporteKardex = (req, res) => {
  const { producto_id } = req.query;

  if (!producto_id) {
    return res.status(400).json({ error: 'Debe proporcionar un producto_id' });
  }

  const sql = `
    SELECT 
      p.codigo AS codigo_producto,
      p.nombre AS producto,
      'ENTRADA' AS tipo_movimiento,
      e.fecha AS fecha,
      de.cantidad AS cantidad,
      de.precio_compra AS precio,
      (de.cantidad * de.precio_compra) AS total
    FROM entradas_detalle de
    JOIN entradas e ON de.entrada_id = e.id
    JOIN productos p ON de.producto_id = p.id
    WHERE p.id = ?

    UNION ALL

    SELECT 
      p.codigo AS codigo_producto,
      p.nombre AS producto,
      'SALIDA' AS tipo_movimiento,
      o.fecha AS fecha,
      od.cantidad AS cantidad,
      od.precio_unitario AS precio,
      (od.cantidad * od.precio_unitario) AS total
    FROM ordenes_detalle od
    JOIN ordenes o ON od.orden_id = o.id
    JOIN productos p ON od.producto_id = p.id
    WHERE p.id = ?

    ORDER BY fecha ASC
  `;

  db.all(sql, [producto_id, producto_id], (err, rows) => {
    if (err) {
      console.error('❌ Error al generar Kardex:', err.message);
      return res.status(500).json({ error: 'Error al generar Kardex' });
    }

    // Calcular existencia acumulada
    let existencia = 0;
    const movimientos = rows.map(row => {
      if (row.tipo_movimiento === 'ENTRADA') {
        existencia += row.cantidad;
      } else if (row.tipo_movimiento === 'SALIDA') {
        existencia -= row.cantidad;
      }

      return {
        ...row,
        existencia_acumulada: existencia
      };
    });

    res.json({
      producto_id,
      movimientos: movimientos.length,
      data: movimientos
    });
  });
};
