// modules/carrito.js - Gestión del carrito de compras

import { getState, setState, getStateValue } from '../services/state.js';
import { mostrarToast } from '../utils/toast.js';
import { formatearMoneda } from '../utils/formatters.js';

/**
 * Agrega un producto al carrito
 * @param {number} id - ID del producto
 * @param {string} nombre - Nombre del producto
 * @param {number} precio - Precio del producto
 * @param {string} codigo - Código del producto
 * @param {number} stockDisponible - Stock disponible
 */
export function agregarAlCarrito(id, nombre, precio, codigo, stockDisponible) {
  const carrito = getStateValue('carrito');
  const itemExistente = carrito.find(item => item.id === id);

  if (itemExistente) {
    if (itemExistente.cantidad < stockDisponible) {
      itemExistente.cantidad++;
      itemExistente.total_linea = itemExistente.precio * itemExistente.cantidad;
    } else {
      mostrarToast(`No hay más stock disponible de ${nombre}`, 'warning');
      return;
    }
  } else {
    carrito.push({
      id,
      codigo,
      nombre,
      precio,
      cantidad: 1,
      total_linea: precio
    });
  }

  setState('carrito', carrito);
  actualizarCarrito();
  mostrarToast(`${nombre} agregado al carrito`, 'success');
}

/**
 * Actualiza la visualización del carrito
 */
export function actualizarCarrito() {
  const carrito = getStateValue('carrito');
  const carritoDiv = document.getElementById('carritoVentas');
  const totalSpan = document.getElementById('totalVenta');

  if (!carritoDiv || !totalSpan) return;

  if (carrito.length === 0) {
    carritoDiv.innerHTML = '<p class="text-muted text-center">Carrito vacío</p>';
    setState('totalVenta', 0);
  } else {
    carritoDiv.innerHTML = carrito.map(item => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre}</strong><br>
            <small>${formatearMoneda(item.precio)} × ${item.cantidad} = 
              <strong>${formatearMoneda(item.precio * item.cantidad)}</strong></small>
          </div>
          <button class="btn btn-sm btn-danger" onclick="window.carritoModule.eliminarDelCarrito(${item.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    const totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    setState('totalVenta', totalVenta);
  }

  totalSpan.textContent = formatearMoneda(getStateValue('totalVenta'));
}

/**
 * Elimina un producto del carrito
 * @param {number} id - ID del producto a eliminar
 */
export function eliminarDelCarrito(id) {
  const carrito = getStateValue('carrito');
  const nuevoCarrito = carrito.filter(item => item.id !== id);
  setState('carrito', nuevoCarrito);
  actualizarCarrito();
}

/**
 * Limpia el carrito completamente
 */
export function limpiarCarrito() {
  setState('carrito', []);
  setState('totalVenta', 0);
  actualizarCarrito();
}

/**
 * Obtiene el total del carrito
 * @returns {number} Total del carrito
 */
export function getTotalCarrito() {
  return getStateValue('totalVenta');
}

/**
 * Obtiene los items del carrito
 * @returns {Array} Items del carrito
 */
export function getItemsCarrito() {
  return getStateValue('carrito');
}

