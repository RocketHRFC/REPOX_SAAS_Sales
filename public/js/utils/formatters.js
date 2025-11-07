// utils/formatters.js - Funciones de formateo de datos

/**
 * Formatea un número como moneda
 * @param {number} cantidad - Cantidad a formatear
 * @param {string} simbolo - Símbolo de moneda (default: '$')
 * @returns {string} Cantidad formateada
 */
export function formatearMoneda(cantidad, simbolo = '$') {
  const num = parseFloat(cantidad) || 0;
  return `${simbolo}${num.toFixed(2)}`;
}

/**
 * Formatea una fecha
 * @param {string|Date} fecha - Fecha a formatear
 * @param {string} formato - Formato deseado ('short', 'long', 'datetime')
 * @returns {string} Fecha formateada
 */
export function formatearFecha(fecha, formato = 'short') {
  if (!fecha) return 'N/A';
  
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return 'Fecha inválida';

  switch (formato) {
    case 'long':
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'datetime':
      return date.toLocaleString('es-ES');
    case 'short':
    default:
      return date.toLocaleDateString('es-ES');
  }
}

/**
 * Formatea un número con separadores de miles
 * @param {number} numero - Número a formatear
 * @returns {string} Número formateado
 */
export function formatearNumero(numero) {
  return new Intl.NumberFormat('es-ES').format(numero);
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} texto - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncarTexto(texto, maxLength = 50) {
  if (!texto) return '';
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength) + '...';
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

