import express from 'express';
import db from '../database/index.js';
import { generatePDF } from '../utils/pdfGenerator.js';
import fs from 'fs';

const router = express.Router();

router.get('/inventario', async (req, res) => {
  try {
    const sql = `
      SELECT 
        codigo, 
        nombre, 
        stock, 
        precio,
        (stock * precio) AS valor_total
      FROM productos
      ORDER BY nombre ASC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener inventario' });

      if (rows.length === 0) return res.status(404).json({ mensaje: 'No hay productos en inventario' });

      const headers = ['Código', 'Producto', 'Stock', 'Precio', 'Valor total'];
      const dataRows = rows.map(r => ({
        Código: r.codigo,
        Producto: r.nombre,
        Stock: r.stock,
        Precio: r.precio.toFixed(2),
        'Valor total': r.valor_total.toFixed(2)
      }));

      const filename = `Inventario_${Date.now()}`;
      const title = '📦 Reporte de Inventario - Sistema REPOX';
      const filePath = generatePDF(filename, title, headers, dataRows);

      // Esperar a que el archivo exista
      const waitForFile = setInterval(() => {
        if (fs.existsSync(filePath)) {
          clearInterval(waitForFile);
          console.log(`✅ PDF de inventario generado: ${filePath}`);

          res.download(filePath, `${filename}.pdf`, (err) => {
            if (err) console.error('❌ Error al descargar:', err);
            else fs.unlink(filePath, () => console.log('🧹 Inventario PDF eliminado temporalmente'));
          });
        }
      }, 300);
    });
  } catch (error) {
    console.error('❌ Error general al generar inventario PDF:', error);
    res.status(500).json({ error: 'Error interno al generar PDF' });
  }
});

export default router;
