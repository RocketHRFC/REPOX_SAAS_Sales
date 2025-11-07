// Variables del carrito
let carrito = [];
let totalVenta = 0;

// Variables para entradas
let proveedores = [];
let productosDisponibles = [];

// Variables globales para autocompletado y modal
let botonProductoActivo = null;
let sugerenciasActivas = null;

// Variables para filtros de inventario
let categorias = [];

// Cargar al iniciar - SOLO UNA VEZ
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    actualizarCarrito();
    
    // Ejecutar dashboard después de un pequeño delay
    setTimeout(() => {
        cargarDashboard();
    }, 500);
    
    // Event listeners para búsqueda en ventas
    const buscarVentaInput = document.getElementById('buscarProductoVenta');
    if (buscarVentaInput) {
        buscarVentaInput.addEventListener('input', async (e) => {
            const termino = e.target.value.trim();
            if (termino.length >= 1) {
                buscarProductosVenta(termino);
            } else if (termino.length === 0) {
                cargarProductosVenta();
            }
        });
    }
    
    // Event listener para monto envío
    const montoEnvioInput = document.getElementById('montoEnvio');
    if (montoEnvioInput) {
        montoEnvioInput.addEventListener('input', () => {
            const montoEnvio = parseFloat(montoEnvioInput.value) || 0;
            const totalFinal = totalVenta + montoEnvio;
            document.getElementById('totalPagar').value = `$${totalFinal.toFixed(2)}`;
        });
    }
    
    // Event listener para modal entrada
    const modalEntrada = document.getElementById('modalNuevaEntrada');
    if (modalEntrada) {
        modalEntrada.addEventListener('hidden.bs.modal', function () {
            // Limpiar líneas adicionales (mantener solo la primera)
            const container = document.getElementById('productosEntradaModal');
            const lineas = container.querySelectorAll('.row');

            // Eliminar solo líneas adicionales (mantener primera)
            for (let i = 1; i < lineas.length; i++) {
                lineas[i].remove();
            }
            
            // Limpiar primera línea
            const primeraLinea = container.querySelector('.row');
            if (primeraLinea) {
                primeraLinea.querySelector('.producto-search-input').value = '';
                primeraLinea.querySelector('.producto-id-hidden').value = '';
                primeraLinea.querySelector('.cantidad-entrada-input').value = '';
                primeraLinea.querySelector('.precio-entrada-input').value = '';
                primeraLinea.querySelector('.total-linea-entrada').textContent = '$0.00';
            }
            
            // Limpiar total
            document.getElementById('totalEntradaModal').textContent = '0.00';
            
            // Ocultar sugerencias si están abiertas
            const suggestions = document.querySelectorAll('.suggestions-dropdown');
            suggestions.forEach(s => s.style.display = 'none');
        });
    }
});

// Búsqueda en tiempo real
let debounceTimer;
const buscarInput = document.getElementById('buscarProducto');

if (buscarInput) {
  buscarInput.addEventListener('input', (e) => {
    const termino = e.target.value.trim();

    clearTimeout(debounceTimer); // limpia temporizador previo

    debounceTimer = setTimeout(() => {
      if (termino.length >= 1) {
        buscarProductos(termino);
      } else {
        cargarProductos();
      }
    }, 300); // ⏱️ 300ms de espera tras dejar de escribir
  });
}

// 📦 Cargar todos los productos
async function cargarProductos() {
  const lista = document.getElementById('listaProductos');

  try {
    // 🌀 Mostrar carga
    lista.innerHTML = `
      <div class="text-center mt-2">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    `;

    // 🔹 Solicitud al backend
    const response = await fetch('/api/productos');
    const data = await response.json();
    const productos = data.data || data;

    // 📭 Si no hay productos
    if (!productos || productos.length === 0) {
      lista.innerHTML = '<div class="alert alert-warning">No hay productos registrados</div>';
      return;
    }

    // 🧾 Renderizar lista
    lista.innerHTML = productos.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: $${Number(p.precio).toFixed(2)} | Stock: ${p.stock}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar productos:', error);
    lista.innerHTML = '<div class="alert alert-danger">Error al cargar productos. Intenta nuevamente.</div>';
  }
}


// 🔍 Buscar productos en tiempo real
async function buscarProductos(termino) {
  const lista = document.getElementById('listaProductos');

  try {
    // 🌀 Mostrar indicador de carga
    lista.innerHTML = `
      <div class="text-center mt-2">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    `;

    // 🔹 Llamada al backend
    const response = await fetch(`/api/productos/buscar/${encodeURIComponent(termino)}`);
    const data = await response.json();
    const productos = data.data || data; // Compatibilidad

    // 📭 Si no hay resultados
    if (!productos || productos.length === 0) {
      lista.innerHTML = '<div class="alert alert-info">No se encontraron productos</div>';
      return;
    }

    // 🧾 Mostrar resultados
    lista.innerHTML = productos.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body">
          <h6 class="fw-bold">${p.nombre}</h6>
          <small class="text-muted">Código: ${p.codigo}</small><br>
          <small>Precio: $${Number(p.precio).toFixed(2)} | Stock: ${p.stock}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al buscar productos:', error);
    lista.innerHTML = '<div class="alert alert-danger">Error al buscar productos. Intenta nuevamente.</div>';
  }
}


// 🛒 Agregar producto al carrito
function agregarAlCarrito(id, nombre, precio, codigo, stockDisponible) {
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

  actualizarCarrito();
  mostrarToast(`${nombre} agregado al carrito`, 'success');
}


// 🛒 Actualizar carrito visual y total
function actualizarCarrito() {
  const carritoDiv = document.getElementById('carritoVentas');
  const totalSpan = document.getElementById('totalVenta');

  if (carrito.length === 0) {
    carritoDiv.innerHTML = '<p class="text-muted text-center">Carrito vacío</p>';
    totalVenta = 0;
  } else {
    carritoDiv.innerHTML = carrito.map(item => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.nombre}</strong><br>
            <small>$${item.precio.toFixed(2)} × ${item.cantidad} = 
              <strong>$${(item.precio * item.cantidad).toFixed(2)}</strong></small>
          </div>
          <button class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${item.id})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  // 💾 Persistencia local (opcional)
  localStorage.setItem('carrito', JSON.stringify(carrito));

  totalSpan.textContent = `$${totalVenta.toFixed(2)}`;
}

// 🗑️ Eliminar producto del carrito
function eliminarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  actualizarCarrito();
}


// 🧾 Procesar orden (abrir modal)
document.getElementById('btnProcesarOrden').addEventListener('click', async () => {
  console.log('🟢 Botón Procesar Orden presionado');

  if (carrito.length === 0) {
    mostrarToast('El carrito está vacío', 'warning');
    console.warn('⚠️ Intento de procesar orden con carrito vacío');
    return;
  }

  console.log('🛒 Carrito:', carrito);
  console.log('💰 Total venta:', totalVenta);

  // Guardar carrito en sessionStorage por seguridad
  sessionStorage.setItem('carritoPendiente', JSON.stringify(carrito));

  // Mostrar total en el modal
  const totalInput = document.getElementById('totalPagar');
  if (totalInput) totalInput.value = `$${totalVenta.toFixed(2)}`;

  // Limpiar formulario del modal
  const formOrden = document.getElementById('formDatosOrden');
  if (formOrden) formOrden.reset();

  // Mostrar modal de datos de cliente / venta
  const modalElement = document.getElementById('modalDatosOrden');
  if (!modalElement) {
    console.error('❌ No se encontró el modal modalDatosOrden');
    return;
  }

  const modal = new bootstrap.Modal(modalElement);
  modal.show();

  console.log('✅ Modal mostrado');
});

// 🧾 Confirmar orden
async function confirmarOrden() {
  const datosOrden = {
    productos: carrito,
    total: totalVenta,
    bodega: document.getElementById('bodegaOrden').value.trim(),
    nit_cliente: document.getElementById('nitCliente').value.trim(),
    nombre_cliente: document.getElementById('nombreClienteOrden').value.trim(),
    direccion_cliente: document.getElementById('direccionCliente').value.trim(),
    transporte: document.getElementById('transporteOrden').value,
    nombre_entrega: document.getElementById('nombreEntrega').value.trim(),
    forma_pago: document.getElementById('formaPagoOrden').value,
    tipo_venta: document.getElementById('formaPagoOrden').value === 'CRÉDITO' ? 'CRÉDITO' : 'CONTADO',
    monto_envio: parseFloat(document.getElementById('montoEnvio').value) || 0,
    observaciones: document.getElementById('observacionesOrden')?.value || null
  };

  // 🧩 Validar campos requeridos
  const campos = ['nombre_cliente', 'bodega', 'forma_pago'];
  for (const campo of campos) {
    if (!datosOrden[campo] || datosOrden[campo] === '') {
      mostrarToast(`El campo ${campo.replace('_', ' ')} es obligatorio`, 'warning');
      return;
    }
  }

  // 🚫 Validar carrito vacío
  if (!carrito || carrito.length === 0) {
    mostrarToast('El carrito está vacío', 'warning');
    return;
  }

  try {
    const btnConfirmar = document.getElementById('btnConfirmarOrden');
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Procesando...';

    const response = await fetch('/api/ordenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosOrden)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo procesar la orden');
    }

    // ✅ Éxito
    mostrarToast(`Orden #${result.numero} procesada correctamente`, 'success');

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalDatosOrden'));
    modal.hide();

    document.getElementById('formDatosOrden').reset();
    carrito = [];
    actualizarCarrito();
    cargarProductosVenta();

  } catch (error) {
    console.error('Error procesando orden:', error);
    mostrarToast('❌ ' + error.message, 'danger');
  } finally {
    const btnConfirmar = document.getElementById('btnConfirmarOrden');
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Confirmar Orden';
    }
  }
}

// 🧾 Imprimir cotización
function imprimirCotizacion(datosOrden = {}) {
  if (!carrito || carrito.length === 0) {
    mostrarToast('No hay productos para cotizar', 'warning');
    return;
  }

  const sanitize = str =>
    str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const fechaHoy = new Date().toLocaleDateString();
  const horaActual = new Date().toLocaleTimeString();

  const contenidoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cotización - REPOX</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .company { font-size: 24px; font-weight: bold; color: #2c5aa0; }
        .subtitle { color: #666; margin-top: 5px; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .products-table th, .products-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .products-table th { background-color: #f2f2f2; }
        .total-section { text-align: right; margin-top: 20px; font-size: 18px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">REPOX</div>
        <div class="subtitle">Sistema de Autorepuestos</div>
      </div>

      <h2>COTIZACIÓN</h2>

      <div class="info-row">
        <div><strong>Fecha:</strong> ${fechaHoy}</div>
        <div><strong>Hora:</strong> ${horaActual}</div>
      </div>

      <div class="info-row">
        <div><strong>Cliente:</strong> ${sanitize(datosOrden.nombre_cliente || 'Consumidor Final')}</div>
        <div><strong>NIT:</strong> ${sanitize(datosOrden.nit_cliente || 'CF')}</div>
      </div>

      <table class="products-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${carrito.map(item => `
            <tr>
              <td>${sanitize(item.nombre)}</td>
              <td>${item.cantidad}</td>
              <td>$${item.precio.toFixed(2)}</td>
              <td>$${(item.precio * item.cantidad).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-section">
        <p>Subtotal: $${totalVenta.toFixed(2)}</p>
        <p>IVA (12%): $${(totalVenta * 0.12).toFixed(2)}</p>
        <h3>Total: $${(totalVenta * 1.12).toFixed(2)}</h3>
      </div>

      <div class="footer">
        <p>Válida por 15 días. Precios sujetos a cambios sin previo aviso.</p>
        <p>REPOX - Generado el ${fechaHoy} ${horaActual}</p>
      </div>

      <div class="no-print" style="text-align:center;margin-top:30px;">
        <button onclick="window.print()" style="padding:10px 20px;background:#2c5aa0;color:white;border:none;">Imprimir</button>
        <button onclick="window.close()" style="padding:10px 20px;background:#666;color:white;border:none;margin-left:10px;">Cerrar</button>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=800,height=600');
  ventana.document.write(contenidoHTML);
  ventana.document.close();
  ventana.onload = () => setTimeout(() => ventana.print(), 500);
}

// 🧭 Mostrar sección activa del sistema
function mostrarSeccion(id) {
  console.log("Mostrando sección:", id);
  
  // Ocultar todas las secciones
  document.querySelectorAll('.seccion').forEach(seccion => {
    seccion.style.display = 'none';
  });
  
  // Mostrar la sección seleccionada
  const seccionActiva = document.getElementById(id);
  if (seccionActiva) {
    seccionActiva.style.display = 'block';
  } else {
    console.warn(`No se encontró la sección con id: ${id}`);
  }
}


// 🧹 Vaciar carrito visual y lógico
function limpiarCarrito() {
  carrito = [];
  actualizarCarrito();
  mostrarToast?.('Carrito limpiado', 'info');
}

// 🛍️ Cargar productos disponibles en la vista de ventas
async function cargarProductosVenta() {
  const lista = document.getElementById('listaProductosVenta');
  if (!lista) return;

  // Mostrar indicador de carga
  lista.innerHTML = `
    <div class="text-center mt-3">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">Cargando productos...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/productos');
    const data = await response.json();
    const productos = data.data || data;

    if (!productos || productos.length === 0) {
      lista.innerHTML = `<div class="alert alert-warning text-center">No hay productos disponibles</div>`;
      return;
    }

    // Sanitizar texto simple
    const sanitize = str => String(str || '').replace(/["']/g, '');

    // Renderizar productos
    lista.innerHTML = productos.map(p => `
      <div class="card mb-2 shadow-sm">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 class="fw-bold">${sanitize(p.nombre)}</h6>
            <small class="text-muted">
              Código: ${sanitize(p.codigo)} |
              Precio: $${Number(p.precio).toFixed(2)} |
              Stock: ${p.stock}
            </small>
          </div>
          <button class="btn btn-sm btn-success"
            onclick="agregarAlCarrito(${p.id}, '${sanitize(p.nombre)}', ${p.precio}, '${sanitize(p.codigo)}', ${p.stock})"
            ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock <= 0 ? 'Sin Stock' : 'Agregar'}
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar productos para venta:', error);
    lista.innerHTML = `
      <div class="alert alert-danger text-center">
        Error al cargar productos. <br>
        <small>${error.message}</small>
      </div>
    `;
  }
}


// 📊 Cargar el dashboard completo
async function cargarDashboard() {
  const horaElemento = document.getElementById('ultimaActualizacion');
  if (horaElemento) horaElemento.textContent = 'Actualizando...';

  try {
    // Carga paralela (más rápida)
    await Promise.all([
      cargarMetricasPrincipales(),
      cargarStockCritico?.(),
      cargarTopProductos?.(),
      cargarOrdenesPendientes?.(),
      cargarEntradasRecientes?.(),
      cargarPredicciones?.()
    ]);

    crearGraficoEstadoGeneral?.();

    if (horaElemento)
      horaElemento.textContent = new Date().toLocaleTimeString();

  } catch (error) {
    console.error('❌ Error al cargar dashboard:', error);
    mostrarToast?.('Error al cargar datos del dashboard', 'danger');
  }

  // 📅 Cargar solo las ventas del día actual
  async function cargarVentasHoy() {
    try {
      const response = await fetch('/api/ventas/hoy'); // 👈 tu endpoint debe devolver las ventas del día
      if (!response.ok) throw new Error('No se pudieron obtener las ventas');

      const data = await response.json();
      console.log('📈 Ventas del día:', data);

      // Actualizar UI
      const totalVentas = data.total_ventas || 0;
      const cantidadOrdenes = data.cantidad_ordenes || 0;

      document.getElementById('totalVentasHoy').textContent = `$${totalVentas.toFixed(2)}`;
      document.getElementById('ordenesHoy').textContent = cantidadOrdenes;

    } catch (error) {
      console.error('❌ Error al cargar ventas del día:', error);
      document.getElementById('totalVentasHoy').textContent = '$0.00';
      document.getElementById('ordenesHoy').textContent = '0';
    }
  }


}

let graficoVentas = null;

// 📊 Función principal
async function cargarVentas(periodo = 'dia') {
  try {
    const response = await fetch(`/api/ventas/${periodo}`);
    if (!response.ok) throw new Error('Error al obtener las ventas');
    const data = await response.json();

    // Actualizar totales
    document.getElementById('tipoPeriodo').textContent = periodo;
    document.getElementById('totalVentas').textContent = `$${data.total.toFixed(2)}`;
    document.getElementById('ordenesPeriodo').textContent = data.ordenes || 0;

    // Crear / actualizar gráfico
    const ctx = document.getElementById('graficoVentas').getContext('2d');
    if (graficoVentas) graficoVentas.destroy();

    graficoVentas = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Ventas',
          data: data.valores,
          borderColor: 'rgba(0, 255, 128, 0.9)',
          backgroundColor: 'rgba(0, 255, 128, 0.15)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#00ff88'
        }]
      },
      options: {
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.7)' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.7)',
            titleColor: '#00ff88',
            bodyColor: '#fff'
          }
        }
      }
    });
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// 🎛️ Evento para cambiar periodo
document.getElementById('filtroPeriodo').addEventListener('change', (e) => {
  cargarVentas(e.target.value);
});

// Cargar al iniciar
cargarVentas('dia');


// 📈 Cargar métricas principales del dashboard
async function cargarMetricasPrincipales() {
  const endpoint = '/api/dashboard/metricas';
  const contenedor = document.getElementById('metricasContainer');

  try {
    // Spinner de carga (si existe contenedor visual)
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted">Cargando métricas...</p>
        </div>
      `;
    }

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Error al obtener métricas del servidor');

    const metricas = await response.json();
    const {
      valor_inventario = 0,
      total_productos = 0,
      ventas_hoy = 0,
      ordenes_hoy = 0,
      stock_critico = 0,
      sin_stock = 0,
      ordenes_pendientes = 0,
      tasa_rotacion = 0
    } = metricas;

    // Actualizar cards (solo si existen)
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('valorInventario', `$${Number(valor_inventario).toLocaleString()}`);
    set('totalProductos', total_productos);
    set('ventasHoy', `$${Number(ventas_hoy).toLocaleString()}`);
    set('ordenesHoy', ordenes_hoy);
    set('stockCritico', stock_critico);
    set('sinStock', sin_stock);
    set('ordenesPendientes', ordenes_pendientes);
    set('tasaRotacion', `${tasa_rotacion}x`);

    // Barra de progreso
    const barra = document.getElementById('barraRotacion');
    if (barra) {
      const porcentaje = Math.min((tasa_rotacion / 12) * 100, 100);
      barra.style.width = `${porcentaje}%`;
      barra.className =
        'progress-bar ' +
        (tasa_rotacion >= 6
          ? 'bg-success'
          : tasa_rotacion >= 3
          ? 'bg-warning'
          : 'bg-danger');
    }

  } catch (error) {
    console.error('❌ Error al cargar métricas principales:', error);
    mostrarToast?.('No se pudieron cargar las métricas', 'danger');
  } finally {
    // Eliminar spinner si existía
    if (contenedor) contenedor.innerHTML = '';
  }
}


// 🧩 Utilidad para mostrar mensajes temporales en contenedores
function mostrarMensaje(containerId, mensaje, tipo = 'info') {
  const container = document.getElementById(containerId);
  if (container)
    container.innerHTML = `<div class="text-center text-${tipo} py-3">${mensaje}</div>`;
}

// 🧮 Cargar lista de stock crítico
async function cargarStockCritico() {
  const containerId = 'listaStockCritico';
  const container = document.getElementById(containerId);
  if (!container) return;

  mostrarMensaje(containerId, 'Cargando productos con stock crítico...', 'muted');

  try {
    const response = await fetch('/api/dashboard/stock-critico');
    if (!response.ok) throw new Error('Error al obtener stock crítico');

    const productos = await response.json();
    if (!productos || productos.length === 0) {
      mostrarMensaje(containerId, '✅ No hay productos con stock crítico', 'success');
      return;
    }

    container.innerHTML = productos.map(p => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <strong>${p.codigo}</strong> - ${p.nombre}<br>
          <small class="text-muted">$${Number(p.precio).toFixed(2)}</small>
        </div>
        <div class="text-end">
          <span class="badge ${getBadgeStockClass?.(p.estado_stock) || 'bg-secondary'}">
            ${p.stock} unidades
          </span>
          <br><small class="text-muted">${p.estado_stock?.replace('_', ' ') || ''}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('❌ Error al cargar stock crítico:', error);
    mostrarMensaje(containerId, 'Error al cargar stock crítico', 'danger');
  }
}

// 📊 Cargar top productos con gráfico
async function cargarTopProductos() {
  const canvas = document.getElementById('chartTopProductos');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    console.warn('⚠️ Chart.js no disponible, saltando gráfico');
    return;
  }

  const ctx = canvas.getContext('2d');
  const loaderId = 'chartLoader';

  // Mostrar spinner
  canvas.insertAdjacentHTML('beforebegin', `
    <div id="${loaderId}" class="text-center py-3">
      <div class="spinner-border text-success" role="status"></div>
      <p class="text-muted mt-2">Cargando top productos...</p>
    </div>
  `);
  canvas.style.display = 'none';

  try {
    const response = await fetch('/api/dashboard/top-productos');
    if (!response.ok) throw new Error('Error al obtener top productos');

    const productos = await response.json();
    if (!productos || productos.length === 0) {
      mostrarMensaje('chartTopProductos', 'No hay datos disponibles', 'muted');
      return;
    }

    // Destruir gráfico previo
    if (window.chartTopProductos?.destroy) window.chartTopProductos.destroy();

    const labels = productos.slice(0, 6).map(p => p.codigo);
    const data = productos.slice(0, 6).map(p => p.total_vendido);

    window.chartTopProductos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Unidades Vendidas',
          data,
          backgroundColor: 'rgba(25, 135, 84, 0.8)',
          borderColor: 'rgba(25, 135, 84, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  } catch (error) {
    console.error('❌ Error al cargar gráfico top productos:', error);
    mostrarMensaje('chartTopProductos', 'Error al generar gráfico', 'danger');
  } finally {
    // Quitar spinner
    document.getElementById(loaderId)?.remove();
    canvas.style.display = 'block';
  }
}

// 🧾 Cargar órdenes pendientes
async function cargarOrdenesPendientes() {
  const containerId = 'listaOrdenesPendientes';
  const container = document.getElementById(containerId);
  if (!container) return;

  mostrarMensaje(containerId, 'Cargando órdenes pendientes...', 'muted');

  try {
    const response = await fetch('/api/dashboard/ordenes-pendientes');
    if (!response.ok) throw new Error('Error al obtener órdenes pendientes');

    const ordenes = await response.json();
    if (!ordenes || ordenes.length === 0) {
      mostrarMensaje(containerId, 'No hay órdenes pendientes', 'secondary');
      return;
    }

    container.innerHTML = ordenes.map(o => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <strong>Orden #${o.id}</strong><br>
          <small class="text-muted">${o.nombre_cliente} • ${o.total_items} items</small>
        </div>
        <div class="text-end">
          <span class="badge ${o.estado === 'PEDIDO' ? 'bg-warning text-dark' : 'bg-info'}">
            ${o.estado}
          </span>
          <br><small class="text-muted">$${Number(o.total).toLocaleString()}</small>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('❌ Error al cargar órdenes pendientes:', error);
    mostrarMensaje(containerId, 'Error al cargar órdenes pendientes', 'danger');
  }
}


// 🧩 Utilidad para mostrar mensajes temporales en contenedores
function mostrarMensaje(containerId, mensaje, tipo = 'info') {
  const container = document.getElementById(containerId);
  if (container)
    container.innerHTML = `<div class="text-center text-${tipo} py-3">${mensaje}</div>`;
}

// 📦 Entradas recientes
async function cargarEntradasRecientes() {
  const containerId = 'listaEntradasRecientes';
  const container = document.getElementById(containerId);
  if (!container) return;

  mostrarMensaje(containerId, 'Cargando entradas recientes...', 'muted');

  try {
    const response = await fetch('/api/dashboard/entradas-recientes');
    if (!response.ok) throw new Error('Error al obtener entradas');

    const entradas = await response.json();
    if (!entradas || entradas.length === 0) {
      mostrarMensaje(containerId, 'No hay entradas recientes', 'secondary');
      return;
    }

    container.innerHTML = entradas.map(e => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <strong>Entrada #${e.id}</strong><br>
          <small class="text-muted">${e.nombre_proveedor} • ${e.total_items} items</small>
        </div>
        <div class="text-end">
          <span class="badge ${e.estado === 'PENDIENTE' ? 'bg-warning text-dark' : 'bg-success'}">
            ${e.estado}
          </span>
          <br><small class="text-muted">$${Number(e.total).toLocaleString()}</small>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('❌ Error al cargar entradas recientes:', error);
    mostrarMensaje(containerId, 'Error al cargar entradas recientes', 'danger');
  }
}

// 🔮 Predicciones de stock
async function cargarPredicciones() {
  const containerId = 'prediccionStock';
  const container = document.getElementById(containerId);
  if (!container) return;

  mostrarMensaje(containerId, 'Cargando predicciones de stock...', 'muted');

  try {
    const response = await fetch('/api/dashboard/prediccion-stock');
    if (!response.ok) throw new Error('Error al obtener predicciones');

    const predicciones = await response.json();
    if (!predicciones || predicciones.length === 0) {
      mostrarMensaje(containerId, '✅ No hay productos en riesgo inmediato', 'success');
      return;
    }

    container.innerHTML = predicciones.map(p => {
      const color = p.dias_restantes <= 7
        ? 'danger'
        : p.dias_restantes <= 15
        ? 'warning'
        : 'info';

      return `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <small><strong>${p.codigo}</strong></small>
          <small class="text-${color}">${p.dias_restantes} días</small>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('❌ Error al cargar predicciones de stock:', error);
    mostrarMensaje(containerId, 'Error al cargar predicciones de stock', 'danger');
  }
}

// 🥧 Gráfico de estado general del inventario
function crearGraficoEstadoGeneral() {
  console.log("📊 Iniciando crearGraficoEstadoGeneral()");

  const ctx = document.getElementById('graficoEstadoGeneral').getContext('2d');

  if (window.estadoChart) window.estadoChart.destroy();

  const datos = {
    labels: ['Normal', 'Bajo', 'Agotado'],
    datasets: [{
      data: [3, 0, 1], // Ejemplo
      backgroundColor: [
        'rgba(0, 255, 170, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(255, 99, 132, 0.8)'
      ],
      borderColor: 'rgba(255, 255, 255, 0.1)',
      hoverOffset: 20,
    }]
  };

  const opciones = {
    plugins: {
      legend: { display: false }
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true
    },
    layout: {
      padding: 10
    }
  };

  window.estadoChart = new Chart(ctx, {
    type: 'doughnut',
    data: datos,
    options: opciones,
    plugins: [{
      id: '3dGlow',
      beforeDraw: (chart) => {
        const {ctx, chartArea: {left, top, width, height}} = chart;
        const gradient = ctx.createRadialGradient(
          width / 2, height / 2, 20,
          width / 2, height / 2, 150
        );
        gradient.addColorStop(0, 'rgba(0, 183, 255, 0.3)');
        gradient.addColorStop(1, 'transparent');
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      }
    }]
  });
}



// 🏷️ Helper para clases visuales según estado de stock
function getBadgeStockClass(estado = '') {
  const clases = {
    SIN_STOCK: 'bg-danger',
    CRITICO: 'bg-danger',
    BAJO: 'bg-warning'
  };
  return clases[estado.toUpperCase()] || 'bg-success';
}

// 🔍 Buscar productos en tiempo real para ventas
async function buscarProductosVenta(termino) {
  const lista = document.getElementById('listaProductosVenta');
  if (!lista) return;

  try {
    lista.innerHTML = '<div class="text-center text-muted py-2">Buscando productos...</div>';
    const response = await fetch(`/api/productos/buscar/${encodeURIComponent(termino)}`);
    if (!response.ok) throw new Error('Error al buscar productos');

    const productos = await response.json();

    if (!productos?.length) {
      lista.innerHTML = '<div class="alert alert-info text-center">No se encontraron productos</div>';
      return;
    }

    lista.innerHTML = productos.map(p => `
      <div class="card mb-2 border-light shadow-sm">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">${p.nombre}</h6>
              <small class="text-muted">
                Código: ${p.codigo} | Precio: $${Number(p.precio).toFixed(2)} | Stock: ${p.stock}
              </small>
            </div>
            <button 
              class="btn btn-sm ${p.stock > 0 ? 'btn-success' : 'btn-secondary'}"
              ${p.stock <= 0 ? 'disabled' : ''}
              onclick="agregarAlCarrito(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio})"
            >
              ${p.stock <= 0 ? 'Sin Stock' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('❌ Error al buscar productos para venta:', error);
    lista.innerHTML = '<div class="alert alert-danger text-center">Error al buscar productos</div>';
  }
}

// 🔁 Actualizar lista de proveedores en el <select>
function actualizarSelectProveedores() {
  const select = document.getElementById('proveedor');
  if (!select || !window.proveedores) return;

  select.innerHTML = '<option value="">Seleccionar Proveedor</option>';

  window.proveedores.forEach(p => {
    select.insertAdjacentHTML('beforeend', `
      <option value="${p.id}">${p.nombre}</option>
    `);
  });
}

// 🔁 Actualizar todos los selects de productos disponibles
function actualizarSelectsProductos() {
  if (!window.productosDisponibles) return;

  document.querySelectorAll('.producto-select').forEach(select => {
    select.innerHTML = '<option value="">Seleccionar Producto</option>';
    window.productosDisponibles.forEach(p => {
      select.insertAdjacentHTML('beforeend', `
        <option value="${p.id}">${p.nombre} (${p.codigo})</option>
      `);
    });
  });
}

// 🔄 Mostrar / ocultar formulario de nuevo proveedor
function toggleFormProveedor() {
  const form = document.getElementById('formNuevoProveedor');
  if (!form) return;

  const visible = form.style.display !== 'none';
  form.style.display = visible ? 'none' : 'block';
}

// 💾 Guardar nuevo proveedor
async function guardarProveedor() {
  const nombre = document.getElementById('nombreProveedor')?.value.trim();
  const telefono = document.getElementById('telefonoProveedor')?.value.trim();

  if (!nombre) {
    mostrarToast?.('El nombre del proveedor es obligatorio', 'warning');
    return;
  }

  try {
    const response = await fetch('/api/proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono })
    });

    if (!response.ok) throw new Error('Error al guardar proveedor');

    const nuevoProveedor = await response.json();

    // Actualizar lista global
    if (!window.proveedores) window.proveedores = [];
    window.proveedores.push(nuevoProveedor);
    actualizarSelectProveedores();

    // Seleccionar automáticamente el nuevo
    const select = document.getElementById('proveedor');
    if (select) select.value = nuevoProveedor.id;

    // Limpiar formulario
    document.getElementById('nombreProveedor').value = '';
    document.getElementById('telefonoProveedor').value = '';
    toggleFormProveedor();

    mostrarToast?.(`Proveedor "${nuevoProveedor.nombre}" agregado correctamente`, 'success');
  } catch (error) {
    console.error('❌ Error al guardar proveedor:', error);
    mostrarToast?.('Error al guardar proveedor', 'danger');
  }
}


// 🧱 Agregar línea de producto
function agregarLineaProducto() {
  const container = document.getElementById('productosEntrada');
  if (!container) return;

  const nuevaLinea = document.createElement('div');
  nuevaLinea.className = 'row mb-2 align-items-center';

  nuevaLinea.innerHTML = `
    <div class="col-md-6">
      <select class="form-control producto-select" required>
        <option value="">Seleccionar Producto</option>
      </select>
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control cantidad-input" min="1" placeholder="Cant." required>
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control precio-input" placeholder="Precio" step="0.01" min="0" required>
    </div>
    <div class="col-md-1 text-center">
      <button type="button" class="btn btn-sm btn-danger" title="Eliminar línea" onclick="eliminarLineaProducto(this)">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `;

  container.appendChild(nuevaLinea);
  actualizarSelectsProductos(); // refrescar productos
  agregarEventListenersLinea(nuevaLinea);
}

// 🧹 Eliminar línea de producto
function eliminarLineaProducto(btn) {
  const row = btn.closest('.row');
  if (!row) return;

  row.remove();
  calcularTotalEntrada?.(); // recalcula total si existe la función
}

// 🧮 Asignar eventos para cálculo automático de totales
function agregarEventListenersLinea(linea) {
  const cantidadInput = linea.querySelector('.cantidad-input');
  const precioInput = linea.querySelector('.precio-input');
  if (!cantidadInput || !precioInput) return;

  const recalcular = () => calcularTotalEntrada?.();
  cantidadInput.addEventListener('input', recalcular);
  precioInput.addEventListener('input', recalcular);
}

// ===================== 🧾 DEVOLUCIONES ======================

// Variables globales
let ventaActual = null;
let entradaActual = null;
let productosDevolucion = [];

// 🔁 Cambiar tipo de devolución (venta o compra)
function cambiarTipoDevolucion() {
  const tipo = document.getElementById('tipoDevolucion')?.value;
  const formVenta = document.getElementById('formDevolucionVenta');
  const formCompra = document.getElementById('formDevolucionCompra');

  if (!formVenta || !formCompra) return;

  const mostrarVenta = tipo === 'venta';
  formVenta.style.display = mostrarVenta ? 'block' : 'none';
  formCompra.style.display = mostrarVenta ? 'none' : 'block';

  limpiarFormulariosDevoluciones();
}

// 🧽 Limpiar formularios de devoluciones
function limpiarFormulariosDevoluciones() {
  const detalleVenta = document.getElementById('detalleVenta');
  const detalleEntrada = document.getElementById('detalleEntrada');
  const inputVenta = document.getElementById('buscarVentaId');
  const inputEntrada = document.getElementById('buscarEntradaId');

  if (detalleVenta) detalleVenta.style.display = 'none';
  if (detalleEntrada) detalleEntrada.style.display = 'none';
  if (inputVenta) inputVenta.value = '';
  if (inputEntrada) inputEntrada.value = '';

  productosDevolucion = [];
  ventaActual = null;
  entradaActual = null;
}

// 🔍 Buscar venta por ID
async function buscarVenta() {
  const ventaId = document.getElementById('buscarVentaId')?.value.trim();
  if (!ventaId) {
    mostrarToast?.('Ingresa un ID de venta', 'warning');
    return;
  }

  try {
    const response = await fetch(`/api/ordenes/${ventaId}`);
    if (!response.ok) {
      mostrarToast?.('Venta no encontrada', 'danger');
      return;
    }

    ventaActual = await response.json();
    mostrarDetalleVenta?.(); // solo si existe la función
    mostrarToast?.(`Venta #${ventaId} cargada correctamente`, 'success');
  } catch (error) {
    console.error('❌ Error al buscar venta:', error);
    mostrarToast?.('Error al buscar venta', 'danger');
  }
}


// =============================
// 🧾 DEVOLUCIONES - VENTAS Y COMPRAS
// =============================

// 🧩 Mostrar detalle de venta
function mostrarDetalleVenta() {
  const detalleVenta = document.getElementById('detalleVenta');
  const contenedor = document.getElementById('productosVenta');
  const totalEl = document.getElementById('totalDevolucionVenta');
  if (!ventaActual || !detalleVenta || !contenedor || !totalEl) return;

  detalleVenta.style.display = 'block';

  const productosHTML = ventaActual.productos.map((p, index) => `
    <div class="card mb-2 shadow-sm border-light">
      <div class="card-body py-2">
        <div class="row align-items-center">
          <div class="col-md-4">
            <strong>${p.producto_nombre}</strong><br>
            <small class="text-muted">Código: ${p.codigo || 'N/A'}</small>
          </div>
          <div class="col-md-2">
            <small>Vendido: ${p.cantidad}</small><br>
            <small>Precio: $${p.precio_unitario}</small>
          </div>
          <div class="col-md-3">
            <label class="form-label">Cantidad a devolver:</label>
            <input type="number" 
                   class="form-control form-control-sm cantidad-devolver" 
                   min="0" 
                   max="${p.cantidad}" 
                   value="0"
                   data-producto-id="${p.producto_id}"
                   data-precio="${p.precio_unitario}"
                   data-index="${index}"
                   onchange="calcularTotalDevolucionVenta()">
          </div>
          <div class="col-md-2 text-end">
            <small>Total línea:</small><br>
            <strong class="total-linea-devolucion">$0.00</strong>
          </div>
          <div class="col-md-1 text-center">
            <button type="button" 
                    class="btn btn-sm btn-outline-primary"
                    title="Devolver todo este producto"
                    onclick="devolverTodoProducto(${index})">
              Todo
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  contenedor.innerHTML = `
    <div class="mb-3 text-end">
      <button type="button" 
              class="btn btn-sm btn-outline-success me-2"
              onclick="devolverTodaLaOrden()">
        Devolver Todo
      </button>
    </div>
    ${productosHTML}
  `;

  totalEl.textContent = '0.00';
  productosDevolucion = [];
}

// 💰 Calcular total de devolución (ventas)
function calcularTotalDevolucionVenta() {
  let totalDevolucion = 0;
  productosDevolucion = [];

  document.querySelectorAll('.cantidad-devolver').forEach(input => {
    const cantidad = parseInt(input.value) || 0;
    const precio = parseFloat(input.dataset.precio);
    const productoId = parseInt(input.dataset.productoId);
    const totalLinea = cantidad * precio;

    const totalLineaEl = input.closest('.row')?.querySelector('.total-linea-devolucion');
    if (totalLineaEl) totalLineaEl.textContent = `$${totalLinea.toFixed(2)}`;

    if (cantidad > 0) {
      productosDevolucion.push({ producto_id: productoId, cantidad, precio, total_linea: totalLinea });
      totalDevolucion += totalLinea;
    }
  });

  const totalEl = document.getElementById('totalDevolucionVenta');
  if (totalEl) totalEl.textContent = totalDevolucion.toFixed(2);
}

// 🔁 Devolver todo un producto específico
function devolverTodoProducto(index) {
  const input = document.querySelectorAll('.cantidad-devolver')[index];
  if (!input) return;
  input.value = input.max;
  calcularTotalDevolucionVenta();
}

// 🔁 Devolver toda la orden
function devolverTodaLaOrden() {
  document.querySelectorAll('.cantidad-devolver').forEach(input => {
    input.value = input.max;
  });
  calcularTotalDevolucionVenta();
}

// =============================
// 🧾 DEVOLUCIONES DE ENTRADAS (COMPRAS)
// =============================

// 🔍 Buscar entrada
async function buscarEntrada() {
  const entradaId = document.getElementById('buscarEntradaId')?.value.trim();
  if (!entradaId) {
    mostrarToast?.('Ingresa un ID de entrada', 'warning');
    return;
  }

  try {
    const response = await fetch(`/api/entradas/${entradaId}`);
    if (!response.ok) {
      mostrarToast?.('Entrada no encontrada', 'danger');
      return;
    }

    entradaActual = await response.json();
    mostrarDetalleEntrada();
    mostrarToast?.(`Entrada #${entradaId} cargada correctamente`, 'success');
  } catch (error) {
    console.error('❌ Error al buscar entrada:', error);
    mostrarToast?.('Error al buscar entrada', 'danger');
  }
}

// 📦 Mostrar detalle de entrada
function mostrarDetalleEntrada() {
  const detalleEntrada = document.getElementById('detalleEntrada');
  const contenedor = document.getElementById('productosEntrada');
  const totalEl = document.getElementById('totalDevolucionCompra');
  if (!entradaActual || !detalleEntrada || !contenedor || !totalEl) return;

  detalleEntrada.style.display = 'block';

  const productosHTML = entradaActual.productos.map((p, index) => `
    <div class="card mb-2 shadow-sm border-light">
      <div class="card-body py-2">
        <div class="row align-items-center">
          <div class="col-md-4">
            <strong>${p.producto_nombre}</strong> (${p.codigo})<br>
            <small class="text-muted">Precio compra: $${p.precio_compra}</small>
          </div>
          <div class="col-md-2">
            <small>Comprado: ${p.cantidad}</small><br>
            <small>Total: $${(p.cantidad * p.precio_compra).toFixed(2)}</small>
          </div>
          <div class="col-md-3">
            <label class="form-label">Cantidad a devolver:</label>
            <input type="number"
                   class="form-control form-control-sm cantidad-devolver-compra"
                   min="0"
                   max="${p.cantidad}"
                   value="0"
                   data-producto-id="${p.producto_id}"
                   data-precio="${p.precio_compra}"
                   data-index="${index}"
                   onchange="calcularTotalDevolucionCompra()">
          </div>
          <div class="col-md-2 text-end">
            <small>Total línea:</small><br>
            <strong class="total-linea-devolucion-compra">$0.00</strong>
          </div>
          <div class="col-md-1 text-center">
            <button type="button" 
                    class="btn btn-sm btn-outline-primary"
                    title="Devolver todo este producto"
                    onclick="devolverTodoProductoCompra(${index})">
              Todo
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  contenedor.innerHTML = `
    <div class="mb-3 text-end">
      <button type="button" 
              class="btn btn-sm btn-outline-success me-2"
              onclick="devolverTodaLaEntrada()">
        Devolver Todo
      </button>
    </div>
    ${productosHTML}
  `;

  totalEl.textContent = '0.00';
  productosDevolucion = [];
}


// ==============================
// 🧾 DEVOLUCIONES A PROVEEDORES
// ==============================

function calcularTotalDevolucionCompra() {
  let total = 0;
  productosDevolucion = [];

  document.querySelectorAll('.cantidad-devolver-compra').forEach(input => {
    const cantidad = parseInt(input.value) || 0;
    const precio = parseFloat(input.dataset.precio) || 0;
    const productoId = parseInt(input.dataset.productoId);
    const totalLinea = cantidad * precio;

    const lineaTotal = input.closest('.row')?.querySelector('.total-linea-devolucion-compra');
    if (lineaTotal) lineaTotal.textContent = `$${totalLinea.toFixed(2)}`;

    if (cantidad > 0) {
      productosDevolucion.push({ producto_id: productoId, cantidad, precio, total_linea: totalLinea });
      total += totalLinea;
    }
  });

  const totalEl = document.getElementById('totalDevolucionCompra');
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

function devolverTodoProductoCompra(index) {
  const input = document.querySelectorAll('.cantidad-devolver-compra')[index];
  if (!input) return;
  input.value = input.max;
  calcularTotalDevolucionCompra();
}

function devolverTodaLaEntrada() {
  document.querySelectorAll('.cantidad-devolver-compra').forEach(i => (i.value = i.max));
  calcularTotalDevolucionCompra();
}

// ==============================
// 💸 PROCESAR DEVOLUCIONES
// ==============================

async function procesarDevolucionVenta() {
  if (!ventaActual || productosDevolucion.length === 0) {
    return mostrarToast?.('No hay productos seleccionados para devolver', 'warning');
  }

  const motivo = document.getElementById('motivoDevolucionVenta')?.value || 'Sin especificar';
  const total = parseFloat(document.getElementById('totalDevolucionVenta')?.textContent) || 0;

  const resumen = productosDevolucion
    .map(p => `• Producto ${p.producto_id}: ${p.cantidad} u. ($${p.total_linea.toFixed(2)})`)
    .join('\n');

  if (!confirm(`Confirmar devolución:\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\nMotivo: ${motivo}`)) return;

  try {
    const res = await fetch('/api/devoluciones/venta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venta_id: ventaActual.id, motivo, productos: productosDevolucion, total })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error al procesar devolución');

    const data = await res.json();
    mostrarToast?.(`Devolución procesada (ID: ${data.id})`, 'success');
    limpiarFormulariosDevoluciones();
  } catch (e) {
    console.error(e);
    mostrarToast?.('Error al procesar devolución', 'danger');
  }
}

async function procesarDevolucionCompra() {
  if (!entradaActual || productosDevolucion.length === 0) {
    return mostrarToast?.('No hay productos seleccionados para devolver', 'warning');
  }

  const motivo = document.getElementById('motivoDevolucionCompra')?.value || 'Sin especificar';
  const total = parseFloat(document.getElementById('totalDevolucionCompra')?.textContent) || 0;

  const resumen = productosDevolucion
    .map(p => `• Producto ${p.producto_id}: ${p.cantidad} u. ($${p.total_linea.toFixed(2)})`)
    .join('\n');

  if (!confirm(`Confirmar devolución a proveedor:\n\n${resumen}\n\nTotal: $${total.toFixed(2)}\nMotivo: ${motivo}`)) return;

  try {
    const res = await fetch('/api/devoluciones/compra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entrada_id: entradaActual.id,
        proveedor_id: entradaActual.proveedor_id,
        motivo,
        productos: productosDevolucion,
        total
      })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error al procesar devolución');

    const data = await res.json();
    mostrarToast?.(`Devolución a proveedor procesada (ID: ${data.id})`, 'success');
    limpiarFormulariosDevoluciones();
  } catch (e) {
    console.error(e);
    mostrarToast?.('Error al procesar devolución', 'danger');
  }
}

// ==============================
// 🧾 FACTURACIÓN Y COTIZACIONES
// ==============================

let clientesDisponibles = [];
let cotizacionActual = [];
let clienteSeleccionado = null;

async function cargarDatosFacturacion() {
  try {
    const [clientesResponse] = await Promise.all([fetch('/api/clientes')]);
    clientesDisponibles = await clientesResponse.json();
    actualizarSelectClientes();
    cargarOrdenes();
  } catch (e) {
    console.error('Error al cargar datos de facturación:', e);
  }
}

function actualizarSelectClientes() {
  const select = document.getElementById('clienteCotizacion');
  if (!select) return;

  select.innerHTML = '<option value="">Seleccionar Cliente</option>';
  clientesDisponibles.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nombre} - ${c.empresa || 'Particular'}</option>`;
  });
}

function mostrarSubSeccion(subSeccion) {
  document.querySelectorAll('.sub-seccion').forEach(s => (s.style.display = 'none'));
  document.querySelectorAll('#menuFacturacion .nav-link').forEach(l => l.classList.remove('active'));

  const id = `sub${subSeccion.charAt(0).toUpperCase() + subSeccion.slice(1)}`;
  document.getElementById(id).style.display = 'block';
  event.target.classList.add('active');

  if (subSeccion === 'cotizaciones') cargarCotizaciones?.();
  else if (subSeccion === 'pedidos') cargarOrdenes();
}

// ==============================
// 💼 COTIZACIONES
// ==============================

function nuevaCotizacion() {
  const form = document.getElementById('formCotizacion');
  const totalEl = document.getElementById('totalCotizacion');
  const fechaEl = document.getElementById('fechaVencimiento');
  if (!form || !totalEl || !fechaEl) return;

  form.reset();
  cotizacionActual = [];
  totalEl.textContent = '0.00';

  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 15);
  fechaEl.value = fecha.toISOString().split('T')[0];

  actualizarSelectsProductosCotizacion();

  const modal = new bootstrap.Modal(document.getElementById('modalCotizacion'));
  modal.show();
}

function actualizarSelectsProductosCotizacion() {
  document.querySelectorAll('.producto-cotizacion').forEach(select => {
    select.innerHTML = '<option value="">Seleccionar Producto</option>';
    productosDisponibles.forEach(p => {
      select.innerHTML += `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`;
    });

    select.onchange = function () {
      const precio = this.selectedOptions[0]?.dataset.precio || 0;
      const row = this.closest('.row');
      row.querySelector('.precio-cotizacion').value = precio;
      calcularTotalCotizacion();
    };
  });
}

function agregarLineaCotizacion() {
  const container = document.getElementById('productosCotizacion');
  if (!container) return;

  const nueva = document.createElement('div');
  nueva.className = 'row mb-2 align-items-center';
  nueva.innerHTML = `
    <div class="col-md-5">
      <select class="form-control producto-cotizacion" required></select>
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control cantidad-cotizacion" placeholder="Cant." min="1" required>
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control precio-cotizacion" placeholder="Precio" step="0.01" readonly>
    </div>
    <div class="col-md-2">
      <span class="form-control-plaintext total-linea">$0.00</span>
    </div>
  `;
  container.appendChild(nueva);
  actualizarSelectsProductosCotizacion();
  nueva.querySelector('.cantidad-cotizacion').addEventListener('input', calcularTotalCotizacion);
}

function calcularTotalCotizacion() {
  let total = 0;
  document.querySelectorAll('#productosCotizacion .row').forEach(row => {
    const cantidad = parseFloat(row.querySelector('.cantidad-cotizacion')?.value) || 0;
    const precio = parseFloat(row.querySelector('.precio-cotizacion')?.value) || 0;
    const subtotal = cantidad * precio;
    row.querySelector('.total-linea').textContent = `$${subtotal.toFixed(2)}`;
    total += subtotal;
  });
  document.getElementById('totalCotizacion').textContent = total.toFixed(2);
}

// ==============================
// 📦 ÓRDENES Y REPORTES
// ==============================

async function cargarOrdenes() {
  try {
    const res = await fetch('/api/ordenes');
    const ordenes = await res.json();
    const lista = document.getElementById('listaPedidos');
    if (!lista) return;

    if (ordenes.length === 0) {
      lista.innerHTML = '<p class="text-muted">No hay órdenes</p>';
      return;
    }

    lista.innerHTML = ordenes.map(o => `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between">
            <div>
              <h6>Orden #${o.id} - ${o.bodega || 'N/A'}</h6>
              <small><strong>Cliente:</strong> ${o.nombre_cliente || 'Cliente General'}</small><br>
              <small><strong>NIT:</strong> ${o.nit_cliente || 'N/A'} | <strong>Pago:</strong> ${o.forma_pago || 'CONTADO'}</small><br>
              <small><strong>Total:</strong> $${o.total_pagar || o.total} | <strong>Estado:</strong> 
                <span class="badge ${getBadgeClass(o.estado)}">${o.estado}</span>
              </small>
              ${o.motivo_cancelacion ? `<br><small>Motivo: ${o.motivo_cancelacion}</small>` : ''}
            </div>
            <div>${getAccionesPorEstado(o)}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Error al cargar órdenes:', e);
  }
}

function getBadgeClass(estado) {
  const map = { PEDIDO: 'bg-warning', FACTURADO: 'bg-info', PAGADO: 'bg-success', CANCELADO: 'bg-danger' };
  return map[estado] || 'bg-secondary';
}

function getAccionesPorEstado(o) {
  const id = o.id;
  if (o.estado === 'PEDIDO')
    return `<button class="btn btn-sm btn-info me-1" onclick="cambiarEstado(${id}, 'FACTURADO')">Facturar</button>
            <button class="btn btn-sm btn-danger" onclick="cancelarOrden(${id})">Cancelar</button>`;
  if (o.estado === 'FACTURADO')
    return `<button class="btn btn-sm btn-success me-1" onclick="cambiarEstado(${id}, 'PAGADO')">Pagado</button>
            <button class="btn btn-sm btn-danger" onclick="cancelarOrden(${id})">Cancelar</button>`;
  if (o.estado === 'PAGADO') return '<span class="text-success">Completado</span>';
  if (o.estado === 'CANCELADO') return '<span class="text-danger">Cancelado</span>';
  return '';
}

async function cambiarEstado(id, estado) {
  try {
    const res = await fetch(`/api/ordenes/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    if (!res.ok) throw new Error('Error al cambiar estado');
    mostrarToast?.(`Orden #${id} → ${estado}`, 'success');
    cargarOrdenes();
  } catch (e) {
    mostrarToast?.('Error al cambiar estado', 'danger');
  }
}

async function cancelarOrden(id) {
  const motivos = ['Cliente', 'Stock', 'Error Comercial'];
  const sel = prompt(`Motivo de cancelación:\n${motivos.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
  if (!sel || sel < 1 || sel > 3) return;

  const motivo = motivos[sel - 1];
  if (!confirm(`¿Cancelar Orden #${id} por "${motivo}"?`)) return;

  try {
    const res = await fetch(`/api/ordenes/${id}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'CANCELADO', motivo_cancelacion: motivo })
    });
    if (!res.ok) throw new Error();
    mostrarToast?.(`Orden #${id} cancelada por ${motivo}`, 'info');
    cargarOrdenes();
  } catch {
    mostrarToast?.('Error al cancelar orden', 'danger');
  }
}

// ==============================
// 📊 REPORTES DE INVENTARIO
// ==============================

async function generarReporteInventario() {
  try {
    const res = await fetch('/api/reportes/inventario');
    const data = await res.json();
    const resumen = data.resumen;
    const cont = document.getElementById('reporteResultado');
    if (!cont) return;

    cont.innerHTML = `
      <div class="card">
        <div class="card-header"><h4>Reporte de Inventario General</h4></div>
        <div class="card-body">
          <div class="row mb-3">
            ${crearCardResumen('Total Productos', resumen.total_productos, 'primary')}
            ${crearCardResumen('Valor Total', `$${resumen.valor_total_inventario.toFixed(2)}`, 'success')}
            ${crearCardResumen('Stock Bajo', resumen.productos_stock_bajo, 'warning')}
            ${crearCardResumen('Sin Stock', resumen.productos_sin_stock, 'danger')}
          </div>
          <table class="table table-striped">
            <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Precio</th><th>Valor Total</th></tr></thead>
            <tbody>
              ${data.productos.map(p => `
                <tr class="${p.stock <= 5 ? 'table-warning' : ''}">
                  <td>${p.codigo}</td>
                  <td>${p.nombre}</td>
                  <td>${p.categoria}</td>
                  <td>${p.stock}</td>
                  <td>$${p.precio}</td>
                  <td>$${p.valor_total.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    mostrarToast?.('Error al generar reporte', 'danger');
  }
}

function crearCardResumen(titulo, valor, color) {
  return `<div class="col-md-3"><div class="bg-${color} text-white p-3 rounded text-center"><h6>${titulo}</h6><h4>${valor}</h4></div></div>`;
}


/// ==============================
// 📊 REPORTES: MOVIMIENTOS Y KARDEX
// ==============================

async function generarReporteMovimientos() {
  try {
    const res = await fetch('/api/reportes/movimientos');
    if (!res.ok) throw new Error('Error al obtener movimientos');
    const movimientos = await res.json();

    const rows = movimientos.map(m => `
      <tr>
        <td>${new Date(m.fecha).toLocaleDateString()}</td>
        <td><span class="badge ${m.tipo === 'ENTRADA' ? 'bg-success' : 'bg-danger'}">${m.tipo}</span></td>
        <td>${m.producto}</td>
        <td>${m.codigo}</td>
        <td>${m.cantidad}</td>
        <td>$${m.precio}</td>
        <td>${m.origen || '-'}</td>
      </tr>
    `).join('');

    document.getElementById('reporteResultado').innerHTML = `
      <div class="card">
        <div class="card-header"><h4>Movimientos de Inventario (Últimos 100)</h4></div>
        <div class="card-body table-responsive">
          <table class="table table-striped align-middle">
            <thead><tr>
              <th>Fecha</th><th>Tipo</th><th>Producto</th><th>Código</th>
              <th>Cantidad</th><th>Precio</th><th>Origen/Destino</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    mostrarToast?.(`Error al generar reporte: ${e.message}`, 'danger');
  }
}

async function generarReporteKardex() {
  try {
    const productos = await fetch('/api/productos').then(r => r.json());
    const options = productos.map(p => `<option value="${p.id}">${p.codigo} - ${p.nombre}</option>`).join('');
    document.getElementById('reporteResultado').innerHTML = `
      <div class="card">
        <div class="card-header"><h4>Kardex por Producto</h4></div>
        <div class="card-body">
          <label class="form-label">Seleccionar Producto:</label>
          <select class="form-control" id="selectProductoKardex" onchange="cargarKardexProducto()">
            <option value="">-- Seleccionar --</option>${options}
          </select>
          <div id="kardexDetalle" class="mt-3"></div>
        </div>
      </div>`;
  } catch (e) {
    mostrarToast?.('Error al generar selector Kardex', 'danger');
  }
}

async function cargarKardexProducto() {
  const id = document.getElementById('selectProductoKardex').value;
  if (!id) return;

  try {
    const res = await fetch(`/api/reportes/kardex/${id}`);
    if (!res.ok) throw new Error('No se pudo cargar el kardex');
    const data = await res.json();

    const rows = data.map(m => `
      <tr>
        <td>${new Date(m.fecha).toLocaleDateString()}</td>
        <td>${m.documento}</td>
        <td>${m.referencia}</td>
        <td>${m.cantidad || ''}</td>
        <td>${m.salida || ''}</td>
        <td>$${m.precio}</td>
        <td><strong>${m.saldo}</strong></td>
      </tr>
    `).join('');

    document.getElementById('kardexDetalle').innerHTML = `
      <table class="table table-striped">
        <thead><tr>
          <th>Fecha</th><th>Documento</th><th>Referencia</th>
          <th>Entrada</th><th>Salida</th><th>Precio</th><th>Saldo</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    mostrarToast?.(`Error al cargar kardex: ${e.message}`, 'danger');
  }
}

// ==============================
// 👥 USUARIOS (solo admin)
// ==============================

async function cargarUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  if (window.userRole !== 'admin') {
    lista.innerHTML = `<p class="text-danger">Sin permisos para ver usuarios</p>`;
    return;
  }

  try {
    const res = await fetch('/api/usuarios');
    if (!res.ok) throw new Error('No se pudo cargar la lista');
    const usuarios = await res.json();

    const rows = usuarios.map(u => `
      <tr>
        <td>${u.email}</td>
        <td><span class="badge ${getRolBadgeClass(u.rol)}">${u.rol}</span></td>
        <td><span class="badge ${u.activo ? 'bg-success' : 'bg-danger'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>${new Date(u.fecha_creacion).toLocaleDateString()}</td>
        <td>
          <select class="form-select form-select-sm" onchange="cambiarRolUsuario(${u.id}, this.value)">
            ${['admin', 'vendedor', 'contador'].map(r => `<option value="${r}" ${u.rol === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
      </tr>
    `).join('');

    lista.innerHTML = `
      <table class="table table-striped align-middle">
        <thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    mostrarToast?.('Error al cargar usuarios', 'danger');
  }
}

function getRolBadgeClass(rol) {
  const map = { admin: 'bg-danger', vendedor: 'bg-success', contador: 'bg-info' };
  return map[rol] || 'bg-secondary';
}

async function cambiarRolUsuario(id, rol) {
  if (!confirm(`¿Cambiar rol del usuario a "${rol}"?`)) return;

  try {
    const res = await fetch(`/api/usuarios/${id}/rol`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol })
    });

    if (!res.ok) throw new Error('Error al actualizar rol');
    mostrarToast?.('Rol actualizado correctamente', 'success');
    cargarUsuarios();
  } catch (e) {
    mostrarToast?.(`Error al cambiar rol: ${e.message}`, 'danger');
  }
}

// ==============================
// 📦 ENTRADAS Y DETALLES
// ==============================

async function verDetalleEntrada(id) {
  try {
    const res = await fetch(`/api/entradas/${id}/detalle`);
    if (!res.ok) throw new Error('No se pudo obtener detalle');
    mostrarModalDetalleEntrada(await res.json());
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

function mostrarModalDetalleEntrada(entrada) {
  document.getElementById('modalDetalleEntrada')?.remove();

  const rows = entrada.productos.map(p => `
    <tr>
      <td>${p.codigo}</td>
      <td>${p.producto_nombre}</td>
      <td>${p.cantidad}</td>
      <td>$${p.precio_compra}</td>
      <td>$${(p.cantidad * p.precio_compra).toFixed(2)}</td>
    </tr>`).join('');

  const modal = `
    <div class="modal fade" id="modalDetalleEntrada" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Entrada #${entrada.id} - ${entrada.estado}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>Proveedor:</strong> ${entrada.nombre_proveedor}<br>
                <strong>NIT:</strong> ${entrada.nit_proveedor}<br>
                <strong>Dirección:</strong> ${entrada.direccion_proveedor}
              </div>
              <div class="col-md-6">
                <strong>Tipo:</strong> ${entrada.tipo_compra}<br>
                <strong>Fecha:</strong> ${new Date(entrada.fecha).toLocaleDateString()}<br>
                <strong>Bodega:</strong> ${entrada.bodega}
              </div>
            </div>
            <h6>Productos:</h6>
            <div class="table-responsive">
              <table class="table table-striped"><thead>
                <tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
              </thead><tbody>${rows}</tbody></table>
            </div>
            <div class="mt-3 text-end"><strong>Total: $${entrada.total}</strong></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modal);
  new bootstrap.Modal('#modalDetalleEntrada').show();
}

// ==============================
// 🧩 EDICIÓN DE ÓRDENES
// ==============================

async function guardarCambiosOrden(id) {
  const cambios = [], eliminados = [];

  document.querySelectorAll('.cantidad-edit').forEach((input, i) => {
    const nueva = parseInt(input.value);
    const orig = productosOriginales[i]?.cantidad;
    const pid = input.dataset.productoId;
    if (nueva !== orig) cambios.push({ producto_id: parseInt(pid), cantidad_original: orig, cantidad_nueva: nueva });
  });

  document.querySelectorAll('#productosOrdenDetalle .row').forEach((fila, i) => {
    if (fila.textContent.includes('ELIMINADO')) eliminados.push({
      producto_id: productosOriginales[i].producto_id,
      cantidad: productosOriginales[i].cantidad
    });
  });

  if (!cambios.length && !eliminados.length)
    return mostrarToast?.('No hay cambios para guardar', 'info');

  if (!confirm(`Confirmar cambios (${cambios.length} modificados, ${eliminados.length} eliminados)?`)) return;

  try {
    const res = await fetch(`/api/ordenes/${id}/editar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cambios, eliminados })
    });

    if (!res.ok) throw new Error((await res.json()).error);
    mostrarToast?.('Orden actualizada correctamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalDetalleOrden'))?.hide();
    cargarOrdenes();
  } catch (e) {
    mostrarToast?.(`Error al guardar: ${e.message}`, 'danger');
  }
}

// ==============================
// 📥 NUEVA ENTRADA
// ==============================

function abrirModalNuevaEntrada() {
  const hoy = new Date().toISOString().split('T')[0];
  ['fechaEntrada', 'fechaFacturaEntrada'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoy;
  });

  const form = document.getElementById('formNuevaEntrada');
  form?.reset();
  document.getElementById('totalEntradaModal').textContent = '0.00';
  actualizarSelectsProductosEntrada();

  new bootstrap.Modal('#modalNuevaEntrada').show();
}

function actualizarSelectsProductosEntrada() {
  document.querySelectorAll('.producto-entrada-select').forEach(sel => {
    sel.innerHTML = '<option value="">Seleccionar Producto</option>' +
      productosDisponibles.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (${p.codigo}) - $${p.precio}</option>`).join('');
  });
}

function agregarLineaEntradaModal() {
  const cont = document.getElementById('productosEntradaModal');
  const div = document.createElement('div');
  div.className = 'row mb-2 align-items-center';
  div.innerHTML = `
    <div class="col-md-4">
      <div class="position-relative">
        <div class="input-group">
          <input type="text" class="form-control producto-search-input" placeholder="Buscar producto..." oninput="buscarProductoEntrada(this)">
          <button class="btn btn-outline-success" type="button" onclick="nuevoProductoEntrada(this)">+ Nuevo</button>
        </div>
        <div class="suggestions-dropdown" style="display:none;position:absolute;z-index:1000;background:#fff;border:1px solid #ddd;max-height:200px;overflow:auto"></div>
        <input type="hidden" class="producto-id-hidden">
      </div>
    </div>
    <div class="col-md-2"><input type="number" class="form-control cantidad-entrada-input" placeholder="Cant."></div>
    <div class="col-md-3"><input type="number" class="form-control precio-entrada-input" placeholder="Precio" step="0.01"></div>
    <div class="col-md-2"><span class="form-control-plaintext total-linea-entrada">$0.00</span></div>
    <div class="col-md-1"><button type="button" class="btn btn-sm btn-danger" onclick="eliminarLineaEntradaModal(this)">X</button></div>
  `;
  cont.appendChild(div);
  actualizarSelectsProductosEntrada();
  agregarEventListenersEntrada(div);
}

// ==============================
// 🧾 ENTRADAS - FUNCIONES BASE
// ==============================

// 🗑️ Eliminar línea
function eliminarLineaEntradaModal(btn) {
  btn.closest('.row')?.remove();
  calcularTotalEntradaModal();
}

// 🎧 Agregar listeners de cálculo
function agregarEventListenersEntrada(linea) {
  const select = linea.querySelector('.producto-entrada-select');
  const cantidad = linea.querySelector('.cantidad-entrada-input');
  const precio = linea.querySelector('.precio-entrada-input');

  select?.addEventListener('change', () => {
    const precioSel = select.selectedOptions[0]?.dataset.precio || 0;
    precio.value = precioSel;
    calcularTotalEntradaModal();
  });

  [cantidad, precio].forEach(input =>
    input?.addEventListener('input', calcularTotalEntradaModal)
  );
}

// ==============================
// ✅ CONFIRMAR NUEVA ENTRADA
// ==============================

async function confirmarNuevaEntrada() {
  const campos = [
    'bodegaEntrada', 'nitProveedorEntrada', 'nombreProveedorEntrada',
    'direccionProveedorEntrada', 'fechaEntrada', 'tipoCompra', 'generaFactura',
    'fechaFacturaEntrada', 'serieFactura', 'noFacturaModal', 'motivoEntrada'
  ];
  const datosEntrada = Object.fromEntries(
    campos.map(id => [id.replace(/(Entrada|Modal)/, ''), document.getElementById(id)?.value.trim() || ''])
  );

  const productos = [], productosNuevos = [];

  document.querySelectorAll('#productosEntradaModal .row').forEach(row => {
    const pid = row.querySelector('.producto-id-hidden')?.value;
    const cantidad = parseFloat(row.querySelector('.cantidad-entrada-input')?.value) || 0;
    const precio = parseFloat(row.querySelector('.precio-entrada-input')?.value) || 0;
    if (!pid || !cantidad || !precio) return;

    if (pid.startsWith('NUEVO:')) {
      const [, codigo, nombre, categoria, precioBase] = pid.split(':');
      productosNuevos.push({
        codigo, nombre, categoria,
        precio: parseFloat(precioBase),
        cantidad, precio_compra: precio, stock: 0
      });
    } else {
      productos.push({ producto_id: parseInt(pid), cantidad, precio });
    }
  });

  if (!datosEntrada.nombreProveedor || !datosEntrada.noFactura)
    return mostrarToast?.('Nombre y No. de Factura son requeridos', 'warning');

  if (productos.length === 0 && productosNuevos.length === 0)
    return mostrarToast?.('Agrega al menos un producto', 'warning');

  const total = [
    ...productos.map(p => p.cantidad * p.precio),
    ...productosNuevos.map(p => p.cantidad * p.precio_compra)
  ].reduce((a, b) => a + b, 0);

  try {
    const res = await fetch('/api/entradas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...datosEntrada, productos, productos_nuevos: productosNuevos, total })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error al registrar entrada');
    const entrada = await res.json();

    mostrarToast?.(`Entrada registrada (ID: ${entrada.id})`, 'success');
    bootstrap.Modal.getInstance('#modalNuevaEntrada')?.hide();
    await cargarTablaEntradas();

    if (document.getElementById('seccionInventario')?.style.display !== 'none')
      cargarProductos();
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

// ==============================
// 🧩 NUEVO PRODUCTO RÁPIDO
// ==============================

function nuevoProductoEntrada(btn) {
  botonProductoActivo = btn;
  document.getElementById('formNuevoProducto')?.reset();
  new bootstrap.Modal('#modalNuevoProducto').show();
}

function crearProductoRapido() {
  const codigo = document.getElementById('codigoNuevo').value.trim();
  const nombre = document.getElementById('nombreNuevo').value.trim();
  const categoria = document.getElementById('categoriaNuevo').value.trim();
  const precio = parseFloat(document.getElementById('precioNuevo').value) || 0;

  if (!codigo || !nombre || !categoria || !precio)
    return mostrarToast?.('Todos los campos son requeridos', 'warning');

  if (botonProductoActivo) {
    const fila = botonProductoActivo.closest('.row');
    const input = fila.querySelector('.producto-search-input');
    const hidden = fila.querySelector('.producto-id-hidden');
    const precioInput = fila.querySelector('.precio-entrada-input');

    input.value = `${codigo} - ${nombre}`;
    hidden.value = `NUEVO:${codigo}:${nombre}:${categoria}:${precio}`;
    precioInput.value = precio;
    calcularTotalEntradaModal();
  }

  bootstrap.Modal.getInstance('#modalNuevoProducto')?.hide();
  mostrarToast?.(`Producto "${nombre}" preparado. Se creará al confirmar la entrada.`, 'info');
}

// ==============================
// 🔎 AUTOCOMPLETADO DE PRODUCTOS
// ==============================

function buscarProductoEntrada(input) {
  const termino = input.value.toLowerCase();
  const sugDiv = input.parentElement.nextElementSibling;

  if (termino.length < 1) return (sugDiv.style.display = 'none');

  const coincidencias = productosDisponibles
    .filter(p => p.nombre.toLowerCase().includes(termino) || p.codigo.toLowerCase().includes(termino))
    .slice(0, 10);

  sugDiv.innerHTML = coincidencias.length
    ? coincidencias.map(p => `
      <div class="suggestion-item p-2 border-bottom" onclick="seleccionarProducto(this, ${p.id}, '${p.nombre}', '${p.codigo}', ${p.precio})">
        <strong>${p.codigo}</strong> - ${p.nombre} <span class="text-muted">($${p.precio})</span>
      </div>`).join('')
    : '<div class="p-2 text-muted">No encontrado — usa "+ Nuevo"</div>';

  sugDiv.style.display = 'block';
  sugerenciasActivas = sugDiv;
}

function mostrarSugerencias(input) {
  if (input.value !== '') return;
  const sugDiv = input.parentElement.nextElementSibling;
  sugDiv.innerHTML = productosDisponibles.slice(0, 10).map(p => `
    <div class="suggestion-item p-2 border-bottom" onclick="seleccionarProducto(this, ${p.id}, '${p.nombre}', '${p.codigo}', ${p.precio})">
      <strong>${p.codigo}</strong> - ${p.nombre} <span class="text-muted">($${p.precio})</span>
    </div>`).join('');
  sugDiv.style.display = 'block';
}

function seleccionarProducto(item, id, nombre, codigo, precio) {
  const fila = item.closest('.row');
  fila.querySelector('.producto-search-input').value = `${codigo} - ${nombre}`;
  fila.querySelector('.producto-id-hidden').value = id;
  fila.querySelector('.precio-entrada-input').value = precio;
  fila.querySelector('.suggestions-dropdown').style.display = 'none';
  calcularTotalEntradaModal();
}

document.addEventListener('click', e => {
  if (sugerenciasActivas && !sugerenciasActivas.contains(e.target) && !e.target.classList.contains('producto-search-input')) {
    sugerenciasActivas.style.display = 'none';
    sugerenciasActivas = null;
  }
});

// ==============================
// 📋 TABLA DE ENTRADAS
// ==============================

async function cargarTablaEntradas() {
  try {
    const res = await fetch('/api/entradas');
    entradasData = await res.json();
    entradas = [...entradasData];
    mostrarEntradas(entradas);
  } catch (e) {
    console.error('Error al cargar entradas:', e);
    document.getElementById('bodyTablaEntradas').innerHTML =
      '<tr><td colspan="12" class="text-center text-danger">Error al cargar datos</td></tr>';
  }
}

function mostrarEntradas(lista) {
  const tbody = document.getElementById('bodyTablaEntradas');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">No hay entradas registradas</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(e => `
    <tr>
      <td>${e.id}</td>
      <td>${e.tipo_compra || 'N/A'}</td>
      <td>${new Date(e.fecha).toLocaleDateString()}</td>
      <td>${e.nombre_proveedor || 'N/A'}</td>
      <td>${e.serie_factura || 'N/A'}</td>
      <td>${e.no_factura || 'N/A'}</td>
      <td>$${parseFloat(e.total || 0).toFixed(2)}</td>
      <td><span class="badge ${getBadgeEstadoEntrada(e.estado)}">${e.estado}</span></td>
      <td><button class="btn btn-sm btn-info" onclick="verDetalleEntrada(${e.id})">Ver</button></td>
      <td><button class="btn btn-sm btn-danger" onclick="anularEntrada(${e.id})" ${e.estado === 'ANULADO' ? 'disabled' : ''}>Anular</button></td>
      <td><button class="btn btn-sm btn-secondary" onclick="imprimirEntrada(${e.id})">Imprimir</button></td>
    </tr>`).join('');
}

function getBadgeEstadoEntrada(estado) {
  const map = { RECIBIDO: 'bg-success', PENDIENTE: 'bg-warning', CERRADO: 'bg-primary', ANULADO: 'bg-danger' };
  return map[estado] || 'bg-secondary';
}

// ==============================
// 📊 CÁLCULOS Y FILTROS
// ==============================

function calcularTotalEntradaModal() {
  let total = 0;
  document.querySelectorAll('#productosEntradaModal .row').forEach(r => {
    const cantidad = parseFloat(r.querySelector('.cantidad-entrada-input')?.value) || 0;
    const precio = parseFloat(r.querySelector('.precio-entrada-input')?.value) || 0;
    const subtotal = cantidad * precio;
    r.querySelector('.total-linea-entrada').textContent = `$${subtotal.toFixed(2)}`;
    total += subtotal;
  });
  document.getElementById('totalEntradaModal').textContent = total.toFixed(2);
}

function filtrarEntradas() {
  const estado = document.getElementById('filtroEstadoEntradas').value;
  const proveedor = document.getElementById('filtroProveedorEntradas').value.toLowerCase();
  const desde = document.getElementById('filtroFechaDesde').value;
  const hasta = document.getElementById('filtroFechaHasta').value;

  const filtradas = entradasData.filter(e => {
    const fecha = new Date(e.fecha).toISOString().split('T')[0];
    return (!estado || e.estado === estado)
      && (!proveedor || e.nombre_proveedor?.toLowerCase().includes(proveedor))
      && (!desde || fecha >= desde)
      && (!hasta || fecha <= hasta);
  });

  mostrarEntradas(filtradas);
}

// ==============================
// 🔍 DETALLE Y ANULACIÓN
// ==============================

async function verDetalleEntrada(id) {
  try {
    const res = await fetch(`/api/entradas/${id}/detalle`);
    if (!res.ok) throw new Error('No se pudo obtener la entrada');
    mostrarModalDetalleEntrada(await res.json());
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

function mostrarModalDetalleEntrada(entrada) {
  document.getElementById('modalDetalleEntrada')?.remove();

  const rows = entrada.productos.map(p => `
    <tr><td>${p.codigo}</td><td>${p.producto_nombre}</td><td>${p.cantidad}</td>
    <td>$${p.precio_compra}</td><td>$${(p.cantidad * p.precio_compra).toFixed(2)}</td></tr>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="modalDetalleEntrada" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Entrada #${entrada.id} - ${entrada.estado}</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6"><strong>Proveedor:</strong> ${entrada.nombre_proveedor}<br>
                <strong>NIT:</strong> ${entrada.nit_proveedor}<br>
                <strong>Dirección:</strong> ${entrada.direccion_proveedor}</div>
              <div class="col-md-6"><strong>Tipo:</strong> ${entrada.tipo_compra}<br>
                <strong>Fecha:</strong> ${new Date(entrada.fecha).toLocaleDateString()}<br>
                <strong>Bodega:</strong> ${entrada.bodega}</div>
            </div>
            <div class="table-responsive"><table class="table table-striped">
              <thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>
            <div class="text-end mt-3"><strong>Total: $${entrada.total}</strong></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
        </div>
      </div>
    </div>`);
  new bootstrap.Modal('#modalDetalleEntrada').show();
}

async function anularEntrada(id) {
  if (!confirm('¿Anular esta entrada? Esto devolverá el stock.')) return;
  const motivo = prompt('Motivo de anulación (requerido):');
  if (!motivo) return mostrarToast?.('Motivo requerido', 'warning');

  try {
    const res = await fetch(`/api/entradas/${id}/anular`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'user-email': window.currentUser?.email || 'unknown' },
      body: JSON.stringify({ motivo })
    });

    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    mostrarToast?.(`Entrada anulada (${data.productos_devueltos} productos devueltos)`, 'info');
    cargarTablaEntradas();
    if (document.getElementById('seccionDashboard')?.style.display !== 'none') cargarDashboard();
  } catch (e) {
    mostrarToast?.(`Error al anular: ${e.message}`, 'danger');
  }
}

// =====================================
// 📦 MOSTRAR Y GESTIONAR ENTRADAS
// =====================================

function mostrarEntradas(lista) {
  const tbody = document.getElementById('bodyTablaEntradas');

  if (!lista?.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">No hay entradas registradas</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(e => `
    <tr>
      <td>${e.id}</td>
      <td>${e.tipo_compra || 'N/A'}</td>
      <td>${new Date(e.fecha).toLocaleDateString()}</td>
      <td>${e.nombre_proveedor || 'N/A'}</td>
      <td>${e.serie_factura || 'N/A'}</td>
      <td>${e.no_factura || 'N/A'}</td>
      <td>$${parseFloat(e.total || 0).toFixed(2)}</td>
      <td><span class="badge ${getBadgeEstadoEntrada(e.estado)}">${e.estado}</span></td>
      <td>
        <button class="btn btn-sm btn-info" onclick="verDetalleEntrada(${e.id})">Ver</button>
        <button class="btn btn-sm btn-danger" onclick="anularEntrada(${e.id})" ${e.estado === 'ANULADO' ? 'disabled' : ''}>Anular</button>
        <button class="btn btn-sm btn-secondary" onclick="imprimirEntrada(${e.id})">Imprimir</button>
      </td>
    </tr>
  `).join('');
}

function getBadgeEstadoEntrada(estado) {
  const colores = {
    RECIBIDO: 'bg-success',
    PENDIENTE: 'bg-warning',
    CERRADO: 'bg-primary',
    ANULADO: 'bg-danger'
  };
  return colores[estado] || 'bg-secondary';
}

// =====================================
// 🔍 FILTRADO Y ORDEN DE ENTRADAS
// =====================================

function filtrarEntradas() {
  const estado = document.getElementById('filtroEstadoEntradas').value;
  const proveedor = document.getElementById('filtroProveedorEntradas').value.toLowerCase();
  const fechaDesde = document.getElementById('filtroFechaDesde').value;
  const fechaHasta = document.getElementById('filtroFechaHasta').value;

  const filtradas = entradasData.filter(e => {
    const fechaEntrada = new Date(e.fecha).toISOString().split('T')[0];
    return (!estado || e.estado === estado)
      && (!proveedor || e.nombre_proveedor?.toLowerCase().includes(proveedor))
      && (!fechaDesde || fechaEntrada >= fechaDesde)
      && (!fechaHasta || fechaEntrada <= fechaHasta);
  });

  mostrarEntradas(filtradas);
}

const ordenActual = { campo: null, direccion: 'asc' };

function ordenarTabla(campo, event) {
  if (ordenActual.campo === campo) {
    ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
  } else {
    ordenActual.campo = campo;
    ordenActual.direccion = 'asc';
  }

  entradas.sort((a, b) => {
    let [A, B] = [a[campo], b[campo]];
    if (['total', 'id'].includes(campo)) [A, B] = [parseFloat(A) || 0, parseFloat(B) || 0];
    else if (campo.includes('fecha')) [A, B] = [new Date(A), new Date(B)];
    else [A, B] = [String(A || '').toLowerCase(), String(B || '').toLowerCase()];
    return ordenActual.direccion === 'asc' ? (A > B ? 1 : -1) : (A < B ? 1 : -1);
  });

  mostrarEntradas(entradas);
  actualizarIndicadorOrden(event.target);
}

function actualizarIndicadorOrden(th) {
  document.querySelectorAll('#tablaEntradas th').forEach(thEl => {
    thEl.querySelector('.sort-arrow')?.remove();
    thEl.style.background = '';
  });

  const flecha = document.createElement('span');
  flecha.className = 'sort-arrow';
  flecha.textContent = ordenActual.direccion === 'asc' ? ' ↑' : ' ↓';
  th.style.background = '#e9ecef';
  th.appendChild(flecha);
}

// =====================================
// 🧾 DETALLE Y ACCIONES DE ENTRADAS
// =====================================

async function verDetalleEntrada(id) {
  try {
    const res = await fetch(`/api/entradas/${id}/detalle`);
    if (!res.ok) throw new Error('Error al obtener detalles');
    mostrarModalDetalleEntrada(await res.json());
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

function mostrarModalDetalleEntrada(e) {
  document.getElementById('modalDetalleEntrada')?.remove();

  const productos = e.productos.map(p => `
    <tr>
      <td>${p.codigo}</td>
      <td>${p.producto_nombre}</td>
      <td>${p.cantidad}</td>
      <td>$${p.precio_compra}</td>
      <td>$${(p.cantidad * p.precio_compra).toFixed(2)}</td>
    </tr>
  `).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="modalDetalleEntrada" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Entrada #${e.id} - ${e.estado}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>Proveedor:</strong> ${e.nombre_proveedor}<br>
                <strong>NIT:</strong> ${e.nit_proveedor}<br>
                <strong>Dirección:</strong> ${e.direccion_proveedor}
              </div>
              <div class="col-md-6">
                <strong>Tipo:</strong> ${e.tipo_compra}<br>
                <strong>Fecha:</strong> ${new Date(e.fecha).toLocaleDateString()}<br>
                <strong>Bodega:</strong> ${e.bodega}
              </div>
            </div>
            <h6>Productos:</h6>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead><tr><th>Código</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr></thead>
                <tbody>${productos}</tbody>
              </table>
            </div>
            <div class="text-end"><strong>TOTAL: $${parseFloat(e.total).toFixed(2)}</strong></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
        </div>
      </div>
    </div>
  `);
  new bootstrap.Modal('#modalDetalleEntrada').show();
}

async function anularEntrada(id) {
  if (!confirm('¿Anular esta entrada? Esta acción devolverá el stock automáticamente.')) return;
  const motivo = prompt('Motivo de anulación (requerido):');
  if (!motivo) return mostrarToast?.('Motivo requerido', 'warning');

  try {
    const res = await fetch(`/api/entradas/${id}/anular`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'user-email': window.currentUser?.email || 'sistema' },
      body: JSON.stringify({ motivo })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Error al anular');
    mostrarToast?.('Entrada anulada correctamente', 'info');
    cargarTablaEntradas();
    if (document.getElementById('seccionDashboard')?.style.display !== 'none') cargarDashboard();
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

// =====================================
// 🧮 EXPORTAR E IMPRIMIR ENTRADAS
// =====================================

async function exportarEntradasCSV() {
  const data = entradas.length ? entradas : entradasData;
  if (!data.length) return mostrarToast?.('No hay entradas para exportar', 'info');

  const header = ['No. Recepción','Tipo Compra','Fecha','Proveedor','NIT','Serie','No. Factura','Fecha Factura','Total','Estado','Bodega','Motivo'];
  const rows = data.map(e => [
    e.id, e.tipo_compra, new Date(e.fecha).toLocaleDateString(),
    e.nombre_proveedor, e.nit_proveedor, e.serie_factura, e.no_factura,
    e.fecha_factura ? new Date(e.fecha_factura).toLocaleDateString() : 'N/A',
    parseFloat(e.total || 0).toFixed(2), e.estado, e.bodega, e.motivo || ''
  ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `entradas_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  mostrarToast?.(`${data.length} entradas exportadas`, 'success');
}

async function imprimirEntrada(id) {
  try {
    const res = await fetch(`/api/entradas/${id}/detalle`);
    if (!res.ok) throw new Error('Error al obtener entrada');
    const e = await res.json();
    const ventana = window.open('', '_blank', 'width=800,height=600');
    ventana.document.write(generarHTMLImpresion(e));
    ventana.document.close();
    ventana.onload = () => setTimeout(() => ventana.print(), 400);
  } catch (error) {
    mostrarToast?.(`Error al imprimir: ${error.message}`, 'danger');
  }
}

function generarHTMLImpresion(e) {
  const productos = e.productos.map(p => `
    <tr><td>${p.codigo}</td><td>${p.producto_nombre}</td><td>${p.cantidad}</td>
    <td>$${p.precio_compra}</td><td>$${(p.cantidad * p.precio_compra).toFixed(2)}</td></tr>`).join('');

  return `
  <html><head><title>Entrada #${e.id}</title>
  <style>
    body{font-family:Arial;margin:20px;font-size:12px;}
    .header{text-align:center;border-bottom:2px solid #333;margin-bottom:20px;}
    .status{padding:4px 8px;border-radius:4px;font-weight:bold;
      ${e.estado==='ANULADO'?'background:#f8d7da;color:#721c24;':e.estado==='PENDIENTE'?'background:#fff3cd;color:#856404;':'background:#d4edda;color:#155724;'}}
  </style></head>
  <body>
    <div class="header"><h2>Entrada de Compra #${e.id}</h2><span class="status">${e.estado}</span></div>
    <p><strong>Proveedor:</strong> ${e.nombre_proveedor} (${e.nit_proveedor})<br>
    <strong>Bodega:</strong> ${e.bodega}<br><strong>Fecha:</strong> ${new Date(e.fecha).toLocaleDateString()}</p>
    <table border="1" cellspacing="0" cellpadding="6" width="100%">
      <thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
      <tbody>${productos}</tbody>
    </table>
    <h3 style="text-align:right">TOTAL: $${parseFloat(e.total).toFixed(2)}</h3>
  </body></html>`;
}

// =====================================
// 📦 PRODUCTOS + FILTROS + HISTORIAL
// =====================================

async function cargarProductosConFiltros() {
  try {
    const res = await fetch('/api/productos');
    productosCompletos = await res.json();
    categorias = [...new Set(productosCompletos.map(p => p.categoria))].filter(Boolean);
    actualizarSelectCategorias();
    mostrarProductosFiltrados(productosCompletos);
  } catch (e) {
    console.error('Error al cargar productos:', e);
  }
}

function actualizarSelectCategorias() {
  const select = document.getElementById('filtroCategoria');
  select.innerHTML = '<option value="">Todas</option>' +
    categorias.map(c => `<option>${c}</option>`).join('');
}

function aplicarFiltros() {
  const term = document.getElementById('buscarProducto').value.toLowerCase();
  const categoria = document.getElementById('filtroCategoria').value;
  const stockEstado = document.getElementById('filtroStock').value;
  const min = parseFloat(document.getElementById('precioDesde').value) || 0;
  const max = parseFloat(document.getElementById('precioHasta').value) || Infinity;

  const filtrados = productosCompletos.filter(p => {
    const coincideTexto = !term || p.nombre.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term);
    const coincideCategoria = !categoria || p.categoria === categoria;
    const coincideStock =
      stockEstado === 'disponible' ? p.stock > 5 :
      stockEstado === 'critico' ? p.stock <= 5 && p.stock > 0 :
      stockEstado === 'agotado' ? p.stock === 0 : true;
    const coincidePrecio = p.precio >= min && p.precio <= max;
    return coincideTexto && coincideCategoria && coincideStock && coincidePrecio;
  });

  mostrarProductosFiltrados(filtrados);
}

function mostrarProductosFiltrados(lista) {
  const cont = document.getElementById('listaProductos');
  if (!lista.length) {
    cont.innerHTML = '<div class="alert alert-info">No se encontraron productos</div>';
    return;
  }

  cont.innerHTML = lista.map(p => `
    <div class="card mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div><strong>${p.nombre}</strong><br><small>${p.codigo}</small></div>
        <span class="badge bg-secondary">${p.categoria}</span>
        <span class="badge ${getStockBadgeClass(p.stock)}">${p.stock} u</span>
        <strong>$${p.precio}</strong>
        <div>
          <button class="btn btn-sm btn-outline-info" onclick="verHistorialProducto(${p.id})">📊</button>
          ${window.userRole === 'admin' ? `
            <button class="btn btn-sm btn-outline-warning" onclick="editarPrecio(${p.id},'${p.nombre}',${p.precio})">💰</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="ajusteManualStock(${p.id},'${p.nombre}',${p.stock})">🔧</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function getStockBadgeClass(stock) {
  return stock === 0 ? 'bg-danger' : stock <= 5 ? 'bg-warning' : 'bg-success';
}

async function verHistorialProducto(id) {
  try {
    const res = await fetch(`/api/productos/${id}/historial`);
    const historial = await res.json();
    const prod = productosCompletos.find(p => p.id === id);
    mostrarModalHistorial(prod?.nombre || `Producto ${id}`, historial);
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

function mostrarModalHistorial(nombre, hist) {
  document.getElementById('modalHistorialProducto')?.remove();

  const rows = hist.map(m => `
    <tr>
      <td>${new Date(m.fecha).toLocaleDateString()}</td>
      <td><span class="badge ${m.tipo === 'ENTRADA' ? 'bg-success' : 'bg-danger'}">${m.tipo}</span></td>
      <td>${m.documento}</td><td>${m.referencia}</td>
      <td class="text-success">${m.cantidad || '-'}</td>
      <td class="text-danger">${m.salida || '-'}</td>
      <td>$${m.precio}</td><td><strong>${m.saldo}</strong></td>
    </tr>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="modalHistorialProducto" tabindex="-1">
      <div class="modal-dialog modal-xl"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">📊 Historial: ${nombre}</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">${hist.length ? `
          <div class="table-responsive"><table class="table table-striped">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Doc</th><th>Ref</th><th>Entrada</th><th>Salida</th><th>Precio</th><th>Saldo</th></tr></thead>
            <tbody>${rows}</tbody></table></div>` :
          '<div class="alert alert-info">No hay movimientos registrados</div>'}
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button></div>
      </div></div>
    </div>`);
  new bootstrap.Modal('#modalHistorialProducto').show();
}


// =======================================================
// 💰 EDITAR PRECIO DE PRODUCTO
// =======================================================
async function editarPrecio(id, nombre, precioActual) {
  const nuevoPrecio = prompt(`Editar precio de "${nombre}"\nPrecio actual: $${precioActual}\n\nNuevo precio:`, precioActual);
  const precio = parseFloat(nuevoPrecio);

  if (!nuevoPrecio) return;
  if (isNaN(precio) || precio <= 0) return mostrarToast?.('Ingresa un precio válido mayor a 0', 'warning');

  try {
    const res = await fetch(`/api/productos/${id}/precio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'user-email': window.currentUser?.email || 'unknown',
        'user-role': window.userRole || 'unknown'
      },
      body: JSON.stringify({ precio })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar precio');
    const data = await res.json();

    mostrarToast?.(
      `Precio actualizado: $${data.precio_anterior || precioActual} → $${data.precio}\nCambio registrado en auditoría.`,
      'success'
    );

    cargarProductosConFiltros();
    if (document.getElementById('seccionDashboard')?.style.display !== 'none') cargarDashboard();
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

// =======================================================
// 🧮 AJUSTE MANUAL DE STOCK
// =======================================================
async function ajusteManualStock(id, nombre, stockActual) {
  const nuevoStock = prompt(`Ajuste manual de stock para "${nombre}"\nStock actual: ${stockActual}\n\nNuevo stock correcto:`, stockActual);
  if (nuevoStock === null) return;

  const stockNum = parseInt(nuevoStock);
  if (isNaN(stockNum) || stockNum < 0) return mostrarToast?.('Stock inválido (debe ser ≥ 0)', 'warning');

  const diferencia = stockNum - stockActual;
  const motivo = prompt(`Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}\n\nMotivo del ajuste:`);
  if (!motivo) return mostrarToast?.('Motivo requerido para registrar ajuste', 'warning');

  if (!confirm(`Confirmar ajuste:\n• Stock actual: ${stockActual}\n• Nuevo: ${stockNum}\n• Diferencia: ${diferencia > 0 ? '+' : ''}${diferencia}\n• Motivo: ${motivo}`))
    return;

  try {
    const res = await fetch(`/api/productos/${id}/ajuste-stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'user-email': window.currentUser?.email || 'unknown'
      },
      body: JSON.stringify({ stock_nuevo: stockNum, motivo })
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error en el ajuste');
    const result = await res.json();

    mostrarToast?.(
      `Stock ajustado: ${result.stock_anterior} → ${result.stock_nuevo}\nMotivo: ${motivo}\nAjuste registrado.`,
      'info'
    );

    cargarProductosConFiltros();
    if (document.getElementById('seccionDashboard')?.style.display !== 'none') cargarDashboard();
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

// =======================================================
// 📤 EXPORTAR INVENTARIO A CSV
// =======================================================
function exportarInventario() {
  const data = productosCompletos?.length ? productosCompletos : [];
  if (!data.length) return mostrarToast?.('No hay productos para exportar', 'info');

  const headers = ['Código', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Valor Total'];
  const rows = data.map(p => [
    p.codigo,
    `"${p.nombre}"`,
    p.categoria || 'N/A',
    p.precio,
    p.stock,
    (p.precio * p.stock).toFixed(2)
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  link.href = URL.createObjectURL(blob);
  link.download = `inventario_${fecha}.csv`;
  link.click();

  mostrarToast?.(`${data.length} productos exportados a CSV`, 'success');
}

// =======================================================
// 🔁 DEVOLUCIONES RECIENTES
// =======================================================
async function cargarDevoluciones() {
  try {
    const res = await fetch('/api/devoluciones/recientes');
    if (!res.ok) throw new Error('Error al cargar devoluciones');
    const devoluciones = await res.json();

    const cont = document.getElementById('listaDevoluciones');
    if (!devoluciones.length)
      return (cont.innerHTML = '<div class="alert alert-info">No hay devoluciones registradas</div>');

    cont.innerHTML = devoluciones
      .map(
        d => `
      <div class="card mb-2">
        <div class="card-body d-flex justify-content-between">
          <div>
            <h6>Devolución #${d.id} - ${d.tipo}</h6>
            <small><strong>Referencia:</strong> ${d.referencia}</small><br>
            <small><strong>Motivo:</strong> ${d.motivo}</small><br>
            <small><strong>Fecha:</strong> ${new Date(d.fecha).toLocaleDateString()}</small>
          </div>
          <div class="text-end">
            <span class="badge ${d.tipo === 'VENTA' ? 'bg-warning' : 'bg-info'}">${d.tipo}</span><br>
            <strong>$${parseFloat(d.total_devolucion).toFixed(2)}</strong><br>
            <button class="btn btn-sm btn-outline-info mt-1" onclick="verDetalleDevolucion('${d.tipo}', ${d.id})">Ver Detalle</button>
            <button class="btn btn-sm btn-outline-secondary mt-1" onclick="imprimirActaDevolucion('${d.tipo}', ${d.id})">Imprimir</button>
          </div>
        </div>
      </div>`
      )
      .join('');
  } catch (e) {
    console.error('Error al cargar devoluciones:', e);
    document.getElementById('listaDevoluciones').innerHTML =
      '<div class="alert alert-danger">Error al cargar devoluciones</div>';
  }
}

// =======================================================
// 🔍 DETALLE DE DEVOLUCIÓN + MODAL
// =======================================================
async function verDetalleDevolucion(tipo, id) {
  try {
    const endpoint =
      tipo === 'VENTA'
        ? `/api/devoluciones/venta/${id}/detalle`
        : `/api/devoluciones/compra/${id}/detalle`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Error al obtener detalle');
    mostrarModalDetalleDevolucion(await res.json(), tipo);
  } catch (e) {
    mostrarToast?.(`Error: ${e.message}`, 'danger');
  }
}

function mostrarModalDetalleDevolucion(dev, tipo) {
  document.getElementById('modalDetalleDevolucion')?.remove();

  const esVenta = tipo === 'VENTA';
  const referencia = esVenta ? dev.nombre_cliente : dev.nombre_proveedor;
  const fechaOriginal = esVenta ? dev.fecha_venta : dev.fecha_entrada;

  const productosHTML = dev.productos
    .map(
      p => `
      <tr>
        <td>${p.codigo}</td>
        <td>${p.producto_nombre}</td>
        <td>${p.cantidad}</td>
        <td>$${parseFloat(p.precio).toFixed(2)}</td>
        <td>$${(p.cantidad * p.precio).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div class="modal fade" id="modalDetalleDevolucion" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Devolución ${tipo} #${dev.id}</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <strong>${esVenta ? 'Cliente' : 'Proveedor'}:</strong> ${referencia}<br>
                <strong>Fecha Original:</strong> ${new Date(fechaOriginal).toLocaleDateString()}<br>
                <strong>Fecha Devolución:</strong> ${new Date(dev.fecha).toLocaleDateString()}
              </div>
              <div class="col-md-6">
                <strong>Estado:</strong> <span class="badge bg-success">${dev.estado}</span><br>
                <strong>Total Devuelto:</strong> $${parseFloat(dev.total_devolucion).toFixed(2)}
              </div>
            </div>
            <div><strong>Motivo:</strong> ${dev.motivo}</div>
            <hr>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead><tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
                <tbody>${productosHTML}</tbody>
              </table>
            </div>
            <div class="text-end"><strong>TOTAL DEVOLUCIÓN: $${parseFloat(dev.total_devolucion).toFixed(2)}</strong></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="imprimirActaDevolucion('${tipo}', ${dev.id})">Imprimir Acta</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`
  );

  new bootstrap.Modal('#modalDetalleDevolucion').show();
}

// =======================================================
// 🖨️ IMPRIMIR ACTA DE DEVOLUCIÓN
// =======================================================
async function imprimirActaDevolucion(tipo, id) {
  try {
    const endpoint =
      tipo === 'VENTA'
        ? `/api/devoluciones/venta/${id}/detalle`
        : `/api/devoluciones/compra/${id}/detalle`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Error al cargar acta');
    const dev = await res.json();

    const esVenta = tipo === 'VENTA';
    const productos = dev.productos
      .map(
        p => `
        <tr>
          <td>${p.codigo}</td><td>${p.producto_nombre}</td>
          <td>${p.cantidad}</td>
          <td>$${parseFloat(p.precio).toFixed(2)}</td>
          <td>$${(p.cantidad * p.precio).toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const ventana = window.open('', '_blank', 'width=800,height=600');
    ventana.document.write(`
      <html><head><title>Acta Devolución ${tipo} #${dev.id}</title>
      <style>
        body{font-family:Arial;margin:20px;font-size:12px;}
        .header{text-align:center;border-bottom:2px solid #333;margin-bottom:20px;}
        .products-table{width:100%;border-collapse:collapse;}
        .products-table th,.products-table td{border:1px solid #ccc;padding:6px;}
        .signatures{margin-top:50px;display:flex;justify-content:space-between;}
        .signature-block{text-align:center;width:200px;}
        .signature-line{border-bottom:1px solid #333;height:40px;margin-bottom:5px;}
      </style></head>
      <body>
        <div class="header">
          <h2>Acta de Devolución ${tipo} #${dev.id}</h2>
          <p>Fecha: ${new Date().toLocaleDateString()}</p>
        </div>
        <p><strong>${esVenta ? 'Cliente' : 'Proveedor'}:</strong> ${esVenta ? dev.nombre_cliente : dev.nombre_proveedor}</p>
        <p><strong>Motivo:</strong> ${dev.motivo}</p>
        <table class="products-table"><thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${productos}</tbody></table>
        <h3 style="text-align:right">TOTAL: $${parseFloat(dev.total_devolucion).toFixed(2)}</h3>
        <div class="signatures">
          <div class="signature-block"><div class="signature-line"></div>${esVenta ? 'Cliente' : 'Proveedor'}</div>
          <div class="signature-block"><div class="signature-line"></div>Autorizado por</div>
          <div class="signature-block"><div class="signature-line"></div>Recibido por</div>
        </div>
      </body></html>
    `);
    ventana.document.close();
    ventana.onload = () => setTimeout(() => ventana.print(), 400);
  } catch (e) {
    mostrarToast?.(`Error al imprimir acta: ${e.message}`, 'danger');
  }
}
