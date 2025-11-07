// services/state.js - Gestión de estado global

import { estadoGlobal } from '../config/constants.js';

/**
 * Obtiene el estado global
 * @returns {object} Estado global
 */
export function getState() {
  return estadoGlobal;
}

/**
 * Actualiza una propiedad del estado
 * @param {string} key - Clave a actualizar
 * @param {any} value - Nuevo valor
 */
export function setState(key, value) {
  estadoGlobal[key] = value;
  
  // Persistir carrito en localStorage
  if (key === 'carrito') {
    localStorage.setItem('carrito', JSON.stringify(value));
  }
}

/**
 * Obtiene una propiedad del estado
 * @param {string} key - Clave a obtener
 * @returns {any} Valor de la propiedad
 */
export function getStateValue(key) {
  return estadoGlobal[key];
}

/**
 * Restaura el carrito desde localStorage
 */
export function restaurarCarrito() {
  try {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      estadoGlobal.carrito = JSON.parse(carritoGuardado);
      estadoGlobal.totalVenta = estadoGlobal.carrito.reduce(
        (sum, item) => sum + (item.precio * item.cantidad), 
        0
      );
    }
  } catch (error) {
    console.error('Error al restaurar carrito:', error);
  }
}

/**
 * Limpia el estado
 */
export function limpiarEstado() {
  estadoGlobal.carrito = [];
  estadoGlobal.totalVenta = 0;
  localStorage.removeItem('carrito');
}

