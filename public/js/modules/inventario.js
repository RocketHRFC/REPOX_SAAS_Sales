// modules/inventario.js - Gestión de inventario y productos

import { apiGet } from '../utils/api.js';
import { mostrarMensaje, limpiarContenedor } from '../utils/dom.js';
import { mostrarToast } from '../utils/toast.js';
import { formatearMoneda } from '../utils/formatters.js';
import { setState, getStateValue } from '../services/state.js';

/**
 * Carga todos los productos
 */
export async function cargarProductos() {
  const lista = document.getElementById('listaProductos');
  if (!lista) return;

  try {
    lista.innerHTML = `
      <div class="text-center mt-2">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    `;

    const productos = await apiGet('/productos');
    const productosArray = productos.data || productos;

    if (!productosArray || productosArray.length === 0) {
      lista.innerHTML = '<div class="alert alert-warning">No hay productos registrados</div>';
      return;
    }

    lista.innerHTML = productosArray.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: ${formatearMoneda(p.precio)} | Stock: ${p.stock}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar productos:', error);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar productos. Intenta nuevamente.</div>';
  }
}

/**
 * Busca productos por término
 * @param {string} termino - Término de búsqueda
 */
export async function buscarProductos(termino) {
  const lista = document.getElementById('listaProductos');
  if (!lista) return;

  try {
    lista.innerHTML = `
      <div class="text-center mt-2">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    `;

    const productos = await apiGet(`/productos/buscar/${encodeURIComponent(termino)}`);
    const productosArray = productos.data || productos;

    if (!productosArray || productosArray.length === 0) {
      lista.innerHTML = '<div class="alert alert-info">No se encontraron productos</div>';
      return;
    }

    lista.innerHTML = productosArray.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: ${formatearMoneda(p.precio)} | Stock: ${p.stock}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al buscar productos:', error);
    lista.innerHTML = '<div class="alert alert-danger">Error al buscar productos. Intenta nuevamente.</div>';
  }
}

/**
 * Carga productos para la sección de ventas
 */
export async function cargarProductosVenta() {
  const lista = document.getElementById('listaProductosVenta');
  if (!lista) return;

  try {
    mostrarMensaje('listaProductosVenta', 'Cargando productos...', 'muted');

    const productos = await apiGet('/productos');
    const productosArray = productos.data || productos;

    setState('productosDisponibles', productosArray);

    if (!productosArray || productosArray.length === 0) {
      mostrarMensaje('listaProductosVenta', 'No hay productos disponibles', 'warning');
      return;
    }

    lista.innerHTML = productosArray.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: ${formatearMoneda(p.precio)} | Stock: ${p.stock}</small>
          <button class="btn btn-sm btn-primary mt-2 w-100" 
                  onclick="window.inventarioModule.agregarProductoAVenta(${p.id}, '${p.nombre}', ${p.precio}, '${p.codigo}', ${p.stock})">
            Agregar
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar productos para venta:', error);
    mostrarMensaje('listaProductosVenta', `Error: ${error.message}`, 'danger');
  }
}

/**
 * Busca productos para venta
 * @param {string} termino - Término de búsqueda
 */
export async function buscarProductosVenta(termino) {
  const lista = document.getElementById('listaProductosVenta');
  if (!lista) return;

  try {
    mostrarMensaje('listaProductosVenta', 'Buscando...', 'muted');

    const productos = await apiGet(`/productos/buscar/${encodeURIComponent(termino)}`);
    const productosArray = productos.data || productos;

    if (!productosArray || productosArray.length === 0) {
      mostrarMensaje('listaProductosVenta', 'No se encontraron productos', 'info');
      return;
    }

    lista.innerHTML = productosArray.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: ${formatearMoneda(p.precio)} | Stock: ${p.stock}</small>
          <button class="btn btn-sm btn-primary mt-2 w-100" 
                  onclick="window.inventarioModule.agregarProductoAVenta(${p.id}, '${p.nombre}', ${p.precio}, '${p.codigo}', ${p.stock})">
            Agregar
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al buscar productos:', error);
    mostrarMensaje('listaProductosVenta', `Error: ${error.message}`, 'danger');
  }
}

/**
 * Agrega un producto a la venta (wrapper para compatibilidad)
 */
export function agregarProductoAVenta(id, nombre, precio, codigo, stock) {
  // Esta función será manejada por el módulo de ventas
  if (window.ventasModule && window.ventasModule.agregarAlCarrito) {
    window.ventasModule.agregarAlCarrito(id, nombre, precio, codigo, stock);
  }
}

