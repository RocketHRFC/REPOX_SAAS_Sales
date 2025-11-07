import express from 'express';
import { getReporteVentas } from '../controllers/reportesController.js';
import { getReporteVentasPorProducto } from '../controllers/reportesController.js';
import { getReporteInventario } from '../controllers/reportesController.js';
import { getReporteKardex } from '../controllers/reportesController.js';

const router = express.Router();

// Reporte de ventas general
router.get('/ventas', getReporteVentas);

// Reporte de ventas por producto
router.get('/ventas-productos', getReporteVentasPorProducto);

// Reporte de inventario
router.get('/inventario', getReporteInventario);

// Reporte de movimientos (Kardex)
router.get('/kardex', getReporteKardex);

export default router;
