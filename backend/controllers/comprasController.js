import db from '../database/index.js';

export const getCompras = (req, res) => {
  const sql = 'SELECT * FROM entradas ORDER BY id DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener compras:', err.message);
      return res.status(500).json({ error: 'Error al obtener las compras' });
    }

    res.json({
      total: rows.length,
      data: rows
    });
  });
};
