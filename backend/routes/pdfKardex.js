import express from 'express';
import db from '../database/index.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';

const router = express.Router();

router.get('/kardex/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos del producto
    const sqlProducto = `SELECT id, codigo, nombre, precio FROM productos WHERE id = ?`;
    db.get(sqlProducto, [id], (err, producto) => {
      if (err || !producto) return res.status(404).json({ error: 'Producto no encontrado' });

      // Movimientos del Kardex (entradas + ventas + ajustes)
      const sqlMovimientos = `
        SELECT 
          fecha,
          'ENTRADA' AS tipo,
          d.cantidad AS cantidad,
          p.stock AS stock_resultante
        FROM entradas_detalle d
        JOIN entradas e ON d.entrada_id = e.id
        JOIN productos p ON d.producto_id = p.id
        WHERE p.id = ?

        UNION ALL

        SELECT 
          o.fecha,
          'VENTA' AS tipo,
          -d.cantidad AS cantidad,
          p.stock AS stock_resultante
        FROM ordenes_detalle d
        JOIN ordenes o ON d.orden_id = o.id
        JOIN productos p ON d.producto_id = p.id
        WHERE p.id = ?

        UNION ALL

        SELECT 
          datetime('now') AS fecha,
          'AJUSTE' AS tipo,
          0 AS cantidad,
          p.stock AS stock_resultante
        FROM productos p
        WHERE p.id = ?

        ORDER BY fecha ASC
      `;

      db.all(sqlMovimientos, [id, id, id], (err, movimientos) => {
        if (err) return res.status(500).json({ error: 'Error al obtener movimientos' });

        if (movimientos.length === 0)
          return res.status(404).json({ mensaje: 'Sin movimientos registrados para este producto' });

        const headers = ['Fecha', 'Tipo', 'Cantidad', 'Stock resultante'];
        const rows = movimientos.map(m => ({
          Fecha: m.fecha,
          Tipo: m.tipo,
          Cantidad: m.cantidad,
          'Stock resultante': m.stock_resultante
        }));

        const filename = `Kardex_${producto.codigo}_${Date.now()}`;
        const title = `📊 Kardex del producto ${producto.nombre} (${producto.codigo})`;
        const filePath = generatePDF(filename, title, headers, rows);

        // Esperar a que el archivo exista
        const waitForFile = setInterval(() => {
          if (fs.existsSync(filePath)) {
            clearInterval(waitForFile);
            console.log(`✅ PDF Kardex generado: ${filePath}`);

            res.download(filePath, `${filename}.pdf`, (err) => {
              if (err) console.error('❌ Error al descargar:', err);
              else fs.unlink(filePath, () => console.log('🧹 Kardex PDF eliminado temporalmente'));
            });
          }
        }, 300);
      });
    });
  } catch (error) {
    console.error('❌ Error general al generar Kardex PDF:', error);
    res.status(500).json({ error: 'Error interno al generar PDF' });
  }
});

export default router;
