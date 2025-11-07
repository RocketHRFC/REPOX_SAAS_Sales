import express from 'express';
import db from '../database/index.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';

const router = express.Router();

router.get('/venta/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sqlVenta = `SELECT * FROM ordenes WHERE id = ?`;
    const sqlDetalle = `
      SELECT 
        p.codigo, 
        p.nombre, 
        od.cantidad, 
        od.precio_unitario, 
        od.total_linea
      FROM ordenes_detalle od
      JOIN productos p ON od.producto_id = p.id
      WHERE od.orden_id = ?
    `;

    db.get(sqlVenta, [id], (err, venta) => {
      if (err || !venta) return res.status(404).json({ error: 'Venta no encontrada' });

      db.all(sqlDetalle, [id], async (err, detalle) => {
        if (err) return res.status(500).json({ error: 'Error al obtener detalle' });

        const headers = ['Código', 'Producto', 'Cantidad', 'Precio', 'Total'];
        const rows = detalle.map(d => ({
          Código: d.codigo,
          Producto: d.nombre,
          Cantidad: d.cantidad,
          Precio: d.precio_unitario.toFixed(2),
          Total: d.total_linea.toFixed(2)
        }));

        const filename = `Factura_${venta.id}_${Date.now()}`;
        const title = `Factura #${venta.id} - Cliente: ${venta.nombre_cliente}`;
        const filePath = generatePDF(filename, title, headers, rows);

        // Esperar a que el archivo exista y se cierre correctamente
        const checkFile = setInterval(() => {
          if (fs.existsSync(filePath)) {
            clearInterval(checkFile);
            console.log(`✅ PDF listo: ${filePath}`);

            // Enviar descarga
            res.download(filePath, `${filename}.pdf`, (err) => {
              if (err) console.error('❌ Error al descargar:', err);
              else {
                // Eliminar archivo después de enviarlo (opcional)
                fs.unlink(filePath, (delErr) => {
                  if (delErr) console.error('⚠️ No se pudo borrar el archivo:', delErr);
                  else console.log('🧹 Archivo temporal eliminado:', filePath);
                });
              }
            });
          }
        }, 300);
      });
    });
  } catch (error) {
    console.error('❌ Error general en PDF:', error);
    res.status(500).json({ error: 'Error interno al generar PDF' });
  }
});

export default router;
