// backend/middleware/auth.js
import admin from '../config/firebase.js';

// Middleware para verificar el token de Firebase en cada petición protegida
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    // Verifica el token con Firebase Admin
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // Almacena los datos del usuario autenticado en la request
    next();
  } catch (err) {
    console.error('Error verificando token Firebase:', err.message);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}
