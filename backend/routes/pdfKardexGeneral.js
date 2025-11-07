import express from 'express';
import db from '../database/index.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';

const router = express.Router();

router.get('/kardex-general', async (req, res) => {
  try {
    // 🔹 Unir movimientos de entradas y ventas para todos los productos
    const sql = `
      SELECT 
        p.codigo,
        p.nombre,
        e.fecha AS fecha,
        'ENTRADA' AS tipo,
        d.cantidad AS cantidad,
        p.stock AS stock_resultante
      FROM entradas_detalle d
      JOIN entradas e ON d.entrada_id = e.id
      JOIN productos p ON d.producto_id = p.id

      UNION ALL

      SELECT 
        p.codigo,
        p.nombre,
        o.fecha AS fecha,
        'VENTA' AS tipo,
        -d.cantidad AS cantidad,
        p.stock AS stock_resultante
      FROM ordenes_detalle d
      JOIN ordenes o ON d.orden_id = o.id
      JOIN productos p ON d.producto_id = p.id

      ORDER BY p.nombre ASC, fecha ASC
    `;

    db.all(sql, [], (err, movimientos) => {
      if (err) return res.status(500).json({ error: 'Error al obtener Kardex general' });

      if (movimientos.length === 0)
        return res.status(404).json({ mensaje: 'No hay movimientos registrados' });

      const headers = ['Código', 'Producto', 'Fecha', 'Tipo', 'Cantidad', 'Stock'];
      const rows = movimientos.map(m => ({
        Código: m.codigo,
        Producto: m.nombre,
        Fecha: m.fecha,
        Tipo: m.tipo,
        Cantidad: m.cantidad,
        Stock: m.stock_resultante
      }));

      const filename = `KardexGeneral_${Date.now()}`;
      const title = '📊 Kardex General - Movimientos de Inventario';
      const filePath = generatePDF(filename, title, headers, rows);

      // Esperar a que el archivo exista
      const waitForFile = setInterval(() => {
        if (fs.existsSync(filePath)) {
          clearInterval(waitForFile);
          console.log(`✅ PDF Kardex General generado: ${filePath}`);

          res.download(filePath, `${filename}.pdf`, (err) => {
            if (err) console.error('❌ Error al descargar:', err);
            else fs.unlink(filePath, () => console.log('🧹 Kardex General PDF eliminado temporalmente'));
          });
        }
      }, 300);
    });
  } catch (error) {
    console.error('❌ Error general al generar Kardex General PDF:', error);
    res.status(500).json({ error: 'Error interno al generar PDF' });
  }
});

export default router;
