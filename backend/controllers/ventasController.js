import db from '../database/index.js';

// Obtener todas las ventas (ordenes pagadas o en general)
export const getVentas = (req, res) => {
  const sql = `
    SELECT *
    FROM ordenes
    WHERE estado IN ('PAGADO', 'FACTURADO')
    ORDER BY id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener ventas:', err.message);
      return res.status(500).json({ error: 'Error al obtener las ventas' });
    }

    res.json({
      total: rows.length,
      data: rows
    });
  });
};

// Obtener el detalle de una venta específica
export const getVentaDetalle = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      od.id AS detalle_id,
      od.cantidad,
      od.precio_unitario,
      od.total_linea,
      p.nombre AS producto,
      p.codigo AS codigo_producto
    FROM ordenes_detalle od
    JOIN productos p ON od.producto_id = p.id
    WHERE od.orden_id = ?
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener detalle de venta:', err.message);
      return res.status(500).json({ error: 'Error al obtener detalle de la venta' });
    }

    res.json({
      venta_id: id,
      total_items: rows.length,
      detalle: rows
    });
  });
};

// Obtener una venta completa (encabezado + detalle)
export const getVentaById = (req, res) => {
  const { id } = req.params;

  const sqlVenta = `
    SELECT *
    FROM ordenes
    WHERE id = ?
  `;

  const sqlDetalle = `
    SELECT 
      od.id AS detalle_id,
      od.cantidad,
      od.precio_unitario,
      od.total_linea,
      p.nombre AS producto,
      p.codigo AS codigo_producto
    FROM ordenes_detalle od
    JOIN productos p ON od.producto_id = p.id
    WHERE od.orden_id = ?
  `;

  db.get(sqlVenta, [id], (err, venta) => {
    if (err) {
      console.error('❌ Error al obtener venta:', err.message);
      return res.status(500).json({ error: 'Error al obtener la venta' });
    }

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    db.all(sqlDetalle, [id], (err, detalle) => {
      if (err) {
        console.error('❌ Error al obtener detalle de venta:', err.message);
        return res.status(500).json({ error: 'Error al obtener detalle de la venta' });
      }

      res.json({
        venta,
        detalle
      });
    });
  });
};
