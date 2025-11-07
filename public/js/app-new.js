// app.js - Punto de entrada principal de la aplicación REPOX
// Versión modularizada

import { restaurarCarrito } from './services/state.js';
import { mostrarToast } from './utils/toast.js';
import { debounce } from './utils/dom.js';

// Importar módulos
import * as carritoModule from './modules/carrito.js';
import * as ventasModule from './modules/ventas.js';
import * as inventarioModule from './modules/inventario.js';
import * as dashboardModule from './modules/dashboard.js';

// Exponer módulos globalmente para compatibilidad con onclick en HTML
window.carritoModule = carritoModule;
window.ventasModule = ventasModule;
window.inventarioModule = inventarioModule;
window.dashboardModule = dashboardModule;

// Funciones globales para compatibilidad
window.agregarAlCarrito = carritoModule.agregarAlCarrito;
window.eliminarDelCarrito = carritoModule.eliminarDelCarrito;
window.limpiarCarrito = carritoModule.limpiarCarrito;
window.actualizarCarrito = carritoModule.actualizarCarrito;
window.confirmarOrden = ventasModule.confirmarOrden;
window.imprimirCotizacion = ventasModule.imprimirCotizacion;
window.cargarProductos = inventarioModule.cargarProductos;
window.buscarProductos = inventarioModule.buscarProductos;
window.cargarProductosVenta = inventarioModule.cargarProductosVenta;
window.buscarProductosVenta = inventarioModule.buscarProductosVenta;
window.cargarDashboard = dashboardModule.cargarDashboard;
window.cargarVentas = dashboardModule.cargarVentas;

/**
 * Inicialización de la aplicación
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 REPOX iniciando...');
  
  // Restaurar carrito desde localStorage
  restaurarCarrito();
  
  // Cargar datos iniciales
  if (document.getElementById('listaProductos')) {
    inventarioModule.cargarProductos();
  }
  
  if (document.getElementById('carritoVentas')) {
    carritoModule.actualizarCarrito();
  }
  
  // Cargar dashboard después de un pequeño delay
  setTimeout(() => {
    if (document.getElementById('seccionDashboard')) {
      dashboardModule.cargarDashboard();
    }
  }, 500);
  
  // Event listeners para búsqueda en ventas
  const buscarVentaInput = document.getElementById('buscarProductoVenta');
  if (buscarVentaInput) {
    buscarVentaInput.addEventListener('input', debounce(async (e) => {
      const termino = e.target.value.trim();
      if (termino.length >= 1) {
        inventarioModule.buscarProductosVenta(termino);
      } else if (termino.length === 0) {
        inventarioModule.cargarProductosVenta();
      }
    }, 300));
  }
  
  // Event listener para monto envío
  const montoEnvioInput = document.getElementById('montoEnvio');
  if (montoEnvioInput) {
    montoEnvioInput.addEventListener('input', () => {
      const montoEnvio = parseFloat(montoEnvioInput.value) || 0;
      const totalVenta = carritoModule.getTotalCarrito();
      const totalFinal = totalVenta + montoEnvio;
      const totalPagar = document.getElementById('totalPagar');
      if (totalPagar) {
        totalPagar.value = `$${totalFinal.toFixed(2)}`;
      }
    });
  }
  
  // Event listener para modal entrada
  const modalEntrada = document.getElementById('modalNuevaEntrada');
  if (modalEntrada) {
    modalEntrada.addEventListener('hidden.bs.modal', function () {
      // Limpiar líneas adicionales (mantener solo la primera)
      const container = document.getElementById('productosEntradaModal');
      if (!container) return;
      
      const lineas = container.querySelectorAll('.row');
      
      // Eliminar solo líneas adicionales (mantener primera)
      for (let i = 1; i < lineas.length; i++) {
        lineas[i].remove();
      }
      
      // Limpiar primera línea
      const primeraLinea = container.querySelector('.row');
      if (primeraLinea) {
        const inputs = {
          '.producto-search-input': '',
          '.producto-id-hidden': '',
          '.cantidad-entrada-input': '',
          '.precio-entrada-input': ''
        };
        
        Object.entries(inputs).forEach(([selector, value]) => {
          const input = primeraLinea.querySelector(selector);
          if (input) input.value = value;
        });
        
        const totalLinea = primeraLinea.querySelector('.total-linea-entrada');
        if (totalLinea) totalLinea.textContent = '$0.00';
      }
      
      // Limpiar total
      const totalEntrada = document.getElementById('totalEntradaModal');
      if (totalEntrada) totalEntrada.textContent = '0.00';
      
      // Ocultar sugerencias si están abiertas
      const suggestions = document.querySelectorAll('.suggestions-dropdown');
      suggestions.forEach(s => s.style.display = 'none');
    });
  }
  
  // Event listener para búsqueda de productos (inventario)
  const buscarInput = document.getElementById('buscarProducto');
  if (buscarInput) {
    buscarInput.addEventListener('input', debounce((e) => {
      const termino = e.target.value.trim();
      if (termino.length >= 1) {
        inventarioModule.buscarProductos(termino);
      } else {
        inventarioModule.cargarProductos();
      }
    }, 300));
  }
  
  // Event listener para botón procesar orden
  const btnProcesarOrden = document.getElementById('btnProcesarOrden');
  if (btnProcesarOrden) {
    btnProcesarOrden.addEventListener('click', () => {
      ventasModule.procesarOrden();
    });
  }
  
  // Función para mostrar secciones
  window.mostrarSeccion = function(id) {
    console.log("Mostrando sección:", id);
    
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion').forEach(seccion => {
      seccion.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const seccionActiva = document.getElementById(id);
    if (seccionActiva) {
      seccionActiva.style.display = 'block';
      
      // Cargar datos específicos según la sección
      if (id === 'seccionDashboard') {
        dashboardModule.cargarDashboard();
      } else if (id === 'seccionInventario') {
        inventarioModule.cargarProductos();
      } else if (id === 'seccionVentas') {
        inventarioModule.cargarProductosVenta();
      }
    } else {
      console.warn(`No se encontró la sección con id: ${id}`);
    }
  };
  
  console.log('✅ REPOX inicializado correctamente');
});

