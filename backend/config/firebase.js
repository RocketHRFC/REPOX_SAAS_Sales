// backend/config/firebase.js

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener ruta absoluta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Intentar cargar credenciales del servicio Firebase si existen
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log('✅ Firebase Admin inicializado con credenciales locales.');
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('⚠️ Firebase Admin inicializado con credenciales por defecto.');
}

export default admin;
