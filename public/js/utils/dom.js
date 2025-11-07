// utils/dom.js - Utilidades para manipulación del DOM

/**
 * Muestra un mensaje en un contenedor
 * @param {string} containerId - ID del contenedor
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de mensaje: 'info', 'warning', 'danger', 'success'
 */
export function mostrarMensaje(containerId, mensaje, tipo = 'info') {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="text-center text-${tipo} py-3">${mensaje}</div>`;
  }
}

/**
 * Limpia el contenido de un contenedor
 * @param {string} containerId - ID del contenedor
 */
export function limpiarContenedor(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/**
 * Muestra u oculta un elemento
 * @param {string} elementId - ID del elemento
 * @param {boolean} mostrar - Si mostrar o ocultar
 */
export function toggleElemento(elementId, mostrar) {
  const elemento = document.getElementById(elementId);
  if (elemento) {
    elemento.style.display = mostrar ? 'block' : 'none';
  }
}

/**
 * Obtiene un elemento de forma segura
 * @param {string} id - ID del elemento
 * @returns {HTMLElement|null} Elemento o null
 */
export function getElemento(id) {
  return document.getElementById(id);
}

/**
 * Crea un elemento HTML
 * @param {string} tag - Tag del elemento
 * @param {object} atributos - Atributos del elemento
 * @param {string} contenido - Contenido interno
 * @returns {HTMLElement} Elemento creado
 */
export function crearElemento(tag, atributos = {}, contenido = '') {
  const elemento = document.createElement(tag);
  
  Object.entries(atributos).forEach(([key, value]) => {
    if (key === 'className') {
      elemento.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(elemento.style, value);
    } else {
      elemento.setAttribute(key, value);
    }
  });
  
  if (contenido) {
    elemento.innerHTML = contenido;
  }
  
  return elemento;
}

/**
 * Debounce para eventos
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

