import db from '../database/index.js';

// Obtener todos los productos
export const getProductos = (req, res) => {
  const sql = 'SELECT * FROM productos ORDER BY id DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener productos:', err.message);
      return res.status(500).json({ error: 'Error al obtener los productos' });
    }

    res.json({
      total: rows.length,
      data: rows
    });
  });
};
