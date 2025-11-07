// modules/dashboard.js - Dashboard y métricas

import { apiGet } from '../utils/api.js';
import { mostrarMensaje } from '../utils/dom.js';
import { formatearMoneda, formatearFecha } from '../utils/formatters.js';
import { mostrarToast } from '../utils/toast.js';

let graficoVentas = null;

/**
 * Carga el dashboard completo
 */
export async function cargarDashboard() {
  const horaElemento = document.getElementById('ultimaActualizacion');
  if (horaElemento) horaElemento.textContent = 'Actualizando...';

  try {
    // Carga paralela (más rápida)
    await Promise.all([
      cargarMetricasPrincipales(),
      cargarStockCritico(),
      cargarTopProductos(),
      cargarOrdenesPendientes(),
      cargarEntradasRecientes(),
      cargarPredicciones()
    ]);

    crearGraficoEstadoGeneral();

    if (horaElemento) {
      horaElemento.textContent = new Date().toLocaleTimeString();
    }

  } catch (error) {
    console.error('❌ Error al cargar dashboard:', error);
    mostrarToast('Error al cargar datos del dashboard', 'danger');
  }
}

/**
 * Carga las métricas principales
 */
async function cargarMetricasPrincipales() {
  try {
    const metricas = await apiGet('/dashboard/metricas');
    
    // Actualizar elementos del DOM
    const elementos = {
      'valorInventario': formatearMoneda(metricas.valor_inventario || 0),
      'totalProductos': metricas.total_productos || 0,
      'ventasHoy': formatearMoneda(metricas.ventas_hoy || 0),
      'ordenesHoy': metricas.ordenes_hoy || 0,
      'stockCritico': metricas.stock_critico || 0,
      'sinStock': metricas.sin_stock || 0,
      'ordenesPendientes': metricas.ordenes_pendientes || 0,
      'tasaRotacion': (metricas.tasa_rotacion || 0).toFixed(1)
    };

    Object.entries(elementos).forEach(([id, valor]) => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.textContent = valor;
    });

  } catch (error) {
    console.error('Error al cargar métricas:', error);
  }
}

/**
 * Carga productos con stock crítico
 */
async function cargarStockCritico() {
  const containerId = 'listaStockCritico';
  const container = document.getElementById(containerId);
  if (!container) return;

  mostrarMensaje(containerId, 'Cargando productos con stock crítico...', 'muted');

  try {
    const productos = await apiGet('/dashboard/stock-critico');

    if (!productos || productos.length === 0) {
      mostrarMensaje(containerId, 'No hay productos con stock crítico', 'info');
      return;
    }

    container.innerHTML = productos.map(p => {
      const estadoClass = p.estado_stock === 'SIN_STOCK' ? 'danger' : 
                         p.estado_stock === 'CRITICO' ? 'warning' : 'info';
      return `
        <div class="card mb-2">
          <div class="card-body">
            <h6>${p.nombre}</h6>
            <small>Código: ${p.codigo}</small><br>
            <span class="badge bg-${estadoClass}">Stock: ${p.stock}</span>
            <span class="badge bg-secondary ms-2">${formatearMoneda(p.precio)}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error al cargar stock crítico:', error);
    mostrarMensaje(containerId, 'Error al cargar stock crítico', 'danger');
  }
}

/**
 * Carga top productos más vendidos
 */
async function cargarTopProductos() {
  const containerId = 'listaTopProductos';
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const productos = await apiGet('/dashboard/top-productos');

    if (!productos || productos.length === 0) {
      mostrarMensaje(containerId, 'No hay datos de productos vendidos', 'info');
      return;
    }

    container.innerHTML = productos.map((p, index) => `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between">
            <div>
              <strong>#${index + 1} ${p.nombre}</strong><br>
              <small>Código: ${p.codigo}</small><br>
              <small>Vendidos: ${p.total_vendido || 0} unidades</small>
            </div>
            <div class="text-end">
              <span class="badge bg-success">${formatearMoneda(p.revenue_total || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar top productos:', error);
    mostrarMensaje(containerId, 'Error al cargar top productos', 'danger');
  }
}

/**
 * Carga órdenes pendientes
 */
async function cargarOrdenesPendientes() {
  const containerId = 'listaOrdenesPendientes';
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const ordenes = await apiGet('/dashboard/ordenes-pendientes');

    if (!ordenes || ordenes.length === 0) {
      mostrarMensaje(containerId, 'No hay órdenes pendientes', 'info');
      return;
    }

    container.innerHTML = ordenes.map(o => `
      <div class="card mb-2">
        <div class="card-body">
          <h6>Orden #${o.id}</h6>
          <small>Cliente: ${o.nombre_cliente || 'General'}</small><br>
          <small>Fecha: ${formatearFecha(o.fecha)}</small><br>
          <strong>Total: ${formatearMoneda(o.total)}</strong>
          <span class="badge bg-warning ms-2">${o.estado}</span>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar órdenes pendientes:', error);
    mostrarMensaje(containerId, 'Error al cargar órdenes pendientes', 'danger');
  }
}

/**
 * Carga entradas recientes
 */
async function cargarEntradasRecientes() {
  const containerId = 'listaEntradasRecientes';
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const entradas = await apiGet('/dashboard/entradas-recientes');

    if (!entradas || entradas.length === 0) {
      mostrarMensaje(containerId, 'No hay entradas recientes', 'info');
      return;
    }

    container.innerHTML = entradas.map(e => `
      <div class="card mb-2">
        <div class="card-body">
          <h6>Entrada #${e.id}</h6>
          <small>Proveedor: ${e.nombre_proveedor || 'N/A'}</small><br>
          <small>Fecha: ${formatearFecha(e.fecha)}</small><br>
          <strong>Total: ${formatearMoneda(e.total)}</strong>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar entradas recientes:', error);
    mostrarMensaje(containerId, 'Error al cargar entradas recientes', 'danger');
  }
}

/**
 * Carga predicciones de stock
 */
async function cargarPredicciones() {
  const containerId = 'listaPredicciones';
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const predicciones = await apiGet('/dashboard/prediccion-stock');

    if (!predicciones || predicciones.length === 0) {
      mostrarMensaje(containerId, 'No hay predicciones disponibles', 'info');
      return;
    }

    container.innerHTML = predicciones.map(p => `
      <div class="card mb-2">
        <div class="card-body">
          <h6>${p.nombre}</h6>
          <small>Código: ${p.codigo}</small><br>
          <small>Stock actual: ${p.stock}</small><br>
          <span class="badge bg-warning">Se agotará en ~${p.dias_restantes} días</span>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar predicciones:', error);
    mostrarMensaje(containerId, 'Error al cargar predicciones', 'danger');
  }
}

/**
 * Crea el gráfico de estado general
 */
function crearGraficoEstadoGeneral() {
  const canvas = document.getElementById('graficoEstadoGeneral');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Destruir gráfico anterior si existe
  if (graficoVentas) {
    graficoVentas.destroy();
  }

  // Crear nuevo gráfico (ejemplo básico)
  graficoVentas = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Con Stock', 'Stock Bajo', 'Sin Stock'],
      datasets: [{
        data: [70, 20, 10], // Valores de ejemplo
        backgroundColor: ['#28a745', '#ffc107', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/**
 * Carga ventas por período
 * @param {string} periodo - Período: 'dia', 'semana', 'mes'
 */
export async function cargarVentas(periodo = 'dia') {
  try {
    const data = await apiGet(`/ventas/${periodo}`);
    
    // Actualizar gráfico de ventas si existe
    const canvas = document.getElementById('graficoVentas');
    if (canvas && window.Chart) {
      const ctx = canvas.getContext('2d');
      
      if (graficoVentas) {
        graficoVentas.destroy();
      }

      graficoVentas = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels || [],
          datasets: [{
            label: 'Ventas',
            data: data.valores || [],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

