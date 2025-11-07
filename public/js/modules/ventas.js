// modules/ventas.js - Gestión de ventas y órdenes

import { apiPost, apiGet, apiPut } from '../utils/api.js';
import { mostrarToast } from '../utils/toast.js';
import { formatearMoneda } from '../utils/formatters.js';
import { agregarAlCarrito, getItemsCarrito, limpiarCarrito, getTotalCarrito } from './carrito.js';
import { setState, getStateValue } from '../services/state.js';

// Exportar funciones del carrito para compatibilidad global
export { agregarAlCarrito, limpiarCarrito, getTotalCarrito, getItemsCarrito };

/**
 * Procesa una orden de venta
 */
export async function procesarOrden() {
  const carrito = getItemsCarrito();
  
  if (carrito.length === 0) {
    mostrarToast('El carrito está vacío', 'warning');
    return;
  }

  // Abrir modal de confirmación
  const modal = new bootstrap.Modal(document.getElementById('modalConfirmarOrden'));
  modal.show();
}

/**
 * Confirma y envía la orden
 */
export async function confirmarOrden() {
  const carrito = getItemsCarrito();
  
  if (carrito.length === 0) {
    mostrarToast('El carrito está vacío', 'warning');
    return;
  }

  // Obtener datos del formulario
  const clienteId = document.getElementById('clienteOrden')?.value || null;
  const observaciones = document.getElementById('observacionesOrden')?.value || '';
  const bodega = document.getElementById('bodegaOrden')?.value || '';
  const nitCliente = document.getElementById('nitClienteOrden')?.value || '';
  const nombreCliente = document.getElementById('nombreClienteOrden')?.value || '';
  const direccionCliente = document.getElementById('direccionClienteOrden')?.value || '';
  const transporte = document.getElementById('transporteOrden')?.value || 'Entrega en tienda';
  const nombreEntrega = document.getElementById('nombreEntregaOrden')?.value || '';
  const formaPago = document.getElementById('formaPagoOrden')?.value || 'CONTADO';
  const tipoVenta = document.getElementById('tipoVentaOrden')?.value || 'CONTADO';
  const montoEnvio = parseFloat(document.getElementById('montoEnvioOrden')?.value) || 0;
  const total = getTotalCarrito();
  const totalPagar = total + montoEnvio;

  // Validar campos obligatorios
  const camposObligatorios = {
    'nombreClienteOrden': 'Nombre del cliente',
    'nitClienteOrden': 'NIT del cliente'
  };

  for (const [campo, nombre] of Object.entries(camposObligatorios)) {
    const valor = document.getElementById(campo)?.value.trim();
    if (!valor) {
      mostrarToast(`El campo ${nombre} es obligatorio`, 'warning');
      return;
    }
  }

  try {
    const response = await apiPost('/ordenes', {
      cliente_id: clienteId,
      productos: carrito.map(item => ({
        id: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio: item.precio
      })),
      total,
      observaciones,
      bodega,
      nit_cliente: nitCliente,
      nombre_cliente: nombreCliente,
      direccion_cliente: direccionCliente,
      transporte,
      nombre_entrega: nombreEntrega,
      forma_pago: formaPago,
      tipo_venta: tipoVenta,
      monto_envio: montoEnvio,
      total_pagar: totalPagar
    });

    mostrarToast(`Orden #${response.id || response.numero} procesada correctamente`, 'success');
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarOrden'));
    if (modal) modal.hide();

    // Limpiar carrito y formulario
    limpiarCarrito();
    document.getElementById('formConfirmarOrden')?.reset();

    // Recargar dashboard si está visible
    if (window.dashboardModule) {
      window.dashboardModule.cargarDashboard();
    }

  } catch (error) {
    console.error('Error al procesar orden:', error);
    mostrarToast(error.message || 'Error al procesar la orden', 'danger');
  }
}

/**
 * Imprime una cotización
 * @param {object} datosOrden - Datos de la orden (opcional)
 */
export function imprimirCotizacion(datosOrden = {}) {
  const carrito = getItemsCarrito();
  const total = getTotalCarrito();

  if (carrito.length === 0 && !datosOrden.productos) {
    mostrarToast('No hay productos para imprimir', 'warning');
    return;
  }

  const productos = datosOrden.productos || carrito;
  const ordenTotal = datosOrden.total || total;
  const clienteNombre = datosOrden.nombre_cliente || datosOrden.cliente_nombre || 'Cliente General';
  const fecha = datosOrden.fecha ? new Date(datosOrden.fecha).toLocaleDateString() : new Date().toLocaleDateString();

  const productosHTML = productos.map(p => `
    <tr>
      <td>${p.codigo || ''}</td>
      <td>${p.nombre || p.producto_nombre || ''}</td>
      <td>${p.cantidad || 0}</td>
      <td>${formatearMoneda(p.precio || p.precio_unitario || 0)}</td>
      <td>${formatearMoneda((p.precio || p.precio_unitario || 0) * (p.cantidad || 0))}</td>
    </tr>
  `).join('');

  const ventana = window.open('', '_blank', 'width=800,height=600');
  ventana.document.write(`
    <html>
      <head>
        <title>Cotización</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; font-size: 1.2em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Cotización</h2>
        <p><strong>Cliente:</strong> ${clienteNombre}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
        <div class="total">Total: ${formatearMoneda(ordenTotal)}</div>
      </body>
    </html>
  `);
  ventana.document.close();
  ventana.onload = () => setTimeout(() => ventana.print(), 500);
}

