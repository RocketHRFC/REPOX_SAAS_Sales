import express from 'express';
import { getCompras } from '../controllers/comprasController.js';

const router = express.Router();

// Listar todas las compras
router.get('/', getCompras);

export default router;
