import express from 'express';
import { getProductos } from '../controllers/productosController.js';

const router = express.Router();

// Listar todos los productos
router.get('/', getProductos);

export default router;
