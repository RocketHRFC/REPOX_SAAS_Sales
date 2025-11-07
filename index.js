// index.js — punto de entrada principal del servidor

import app from './backend/app.js';
import { config } from './backend/config/index.js';

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor REPOX corriendo en el puerto ${PORT}`);
});
