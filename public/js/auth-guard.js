// auth-guard.js - Protege las páginas que requieren autenticación

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// TODO: Reemplaza con tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCAXVYiq-OtSVrO9WEO4v3lZmWEzbuRtE4",
  authDomain: "repox-saas.firebaseapp.com",
  projectId: "repox-saas",
  storageBucket: "repox-saas.firebasestorage.app",
  messagingSenderId: "696415907685",
  appId: "1:696415907685:web:2d2e7292299d0e31eafb8c",
  measurementId: "G-FJHVME2EVY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.currentUser = null;
window.userRole = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        
        // Obtener rol del usuario
        try {
            const response = await fetch('/api/usuario/rol', {
                headers: {
                    'firebase-uid': user.uid,
                    'email': user.email
                }
            });
            
            const roleData = await response.json();
            window.userRole = 'admin';
            
            // Verificar si usuario está activo
            if (roleData.activo === 0) {
                alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
                await signOut(auth);
                return;
            }
            
            mostrarInfoUsuario(user, 'admin');
            aplicarPermisosSegunRol('admin');
            
            document.body.style.visibility = 'visible';
            
        } catch (error) {
            console.error('Error al obtener rol:', error);
            alert('Error al verificar permisos');
        }
        
    } else {
        window.location.href = '/login.html';
    }
});

function mostrarInfoUsuario(user, rol) {
    const navbar = document.querySelector('.navbar .container');
    if (navbar) {
        const rolBadge = {
            'admin': '<span class="badge bg-danger">Admin</span>',
            'vendedor': '<span class="badge bg-success">Vendedor</span>',
            'contador': '<span class="badge bg-info">Contador</span>'
        };
        
        navbar.innerHTML += `
            <div class="d-flex align-items-center ms-auto">
                <span class="text-white me-3">
                    ${user.email} ${rolBadge[rol]}
                </span>
                <button class="btn btn-outline-light btn-sm" onclick="cerrarSesion()">Salir</button>
            </div>
        `;
    }
}

function aplicarPermisosSegunRol(rol) {
    // Ocultar/mostrar secciones según el rol
    const secciones = {
        'admin': ['dashboard', 'inventario', 'ventas', 'entradas', 'devoluciones', 'facturacion', 'reportes', 'usuarios'],
        'vendedor': ['dashboard', 'inventario', 'ventas', 'facturacion'],
        'contador': ['dashboard', 'facturacion', 'reportes']
    };
    
    const seccionesPermitidas = secciones[rol] || [];
    
    // Ocultar pestañas no permitidas
    document.querySelectorAll('#menuPrincipal .nav-item').forEach(item => {
        const link = item.querySelector('a');
        const seccion = link.getAttribute('onclick')?.match(/mostrarSeccion\('(\w+)'\)/)?.[1];
        
        if (seccion && !seccionesPermitidas.includes(seccion)) {
            item.style.display = 'none';
        }
    });
    
    // Deshabilitar funciones según rol
    if (rol === 'vendedor') {
        // Los vendedores no pueden eliminar productos ni ver ciertos reportes
        deshabilitarFuncionesVendedor();
    } else if (rol === 'contador') {
        // Los contadores solo lectura en inventario
        deshabilitarFuncionesContador();
    }
}

function deshabilitarFuncionesVendedor() {
    // Se implementará según necesidades específicas
    console.log('Permisos de vendedor aplicados');
}

function deshabilitarFuncionesContador() {
    // Se implementará según necesidades específicas
    console.log('Permisos de contador aplicados');
}

window.cerrarSesion = async function() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        try {
            await signOut(auth);
            window.location.href = '/login.html';
        } catch (error) {
            alert('Error al cerrar sesión');
        }
    }
}

document.body.style.visibility = 'hidden';