import express from 'express';
import { getVentas, getVentaDetalle, getVentaById } from '../controllers/ventasController.js';

const router = express.Router();

// Listar todas las ventas
router.get('/', getVentas);

// Obtener detalle de una venta específica
router.get('/detalle/:id', getVentaDetalle);

// Obtener venta completa (encabezado + detalle)
router.get('/:id', getVentaById);

export default router;
