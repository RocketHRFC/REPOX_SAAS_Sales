// config/constants.js - Constantes y variables globales del sistema

// Estado global del carrito
export const estadoGlobal = {
  carrito: [],
  totalVenta: 0,
  proveedores: [],
  productosDisponibles: [],
  categorias: [],
  botonProductoActivo: null,
  sugerenciasActivas: null,
  ventaActual: null,
  entradaActual: null,
  cotizacionActual: [],
  clienteSeleccionado: null,
  productosCompletos: [],
  entradas: [],
  entradasData: []
};

// Estados de órdenes
export const ESTADOS_ORDEN = {
  PEDIDO: 'PEDIDO',
  FACTURADO: 'FACTURADO',
  ENVIADO: 'ENVIADO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO'
};

// Estados de entrada
export const ESTADOS_ENTRADA = {
  RECIBIDO: 'RECIBIDO',
  ANULADO: 'ANULADO',
  PENDIENTE: 'PENDIENTE'
};

// Tipos de devolución
export const TIPOS_DEVOLUCION = {
  VENTA: 'VENTA',
  COMPRA: 'COMPRA'
};

// Roles de usuario
export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor'
};

// Configuración de debounce
export const DEBOUNCE_DELAY = 300;

// Configuración de toast
export const TOAST_DURATION = 5000;

