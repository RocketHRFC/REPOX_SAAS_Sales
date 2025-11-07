# 🏪 REPOX - Sistema de Gestión de Inventario y Ventas

[![Node.js](https://img.shields.io/badge/Node.js-v14%2B-green.svg)]()
[![Express](https://img.shields.io/badge/Express-5.1.0-blue.svg)]()
[![SQLite](https://img.shields.io/badge/SQLite-3.0-lightblue.svg)]()
[![Firebase](https://img.shields.io/badge/Firebase-Auth-orange.svg)]()
[![License: ISC](https://img.shields.io/badge/License-ISC-lightgrey.svg)]()
[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()

---

## 🚀 Descripción General

**REPOX** es una aplicación SaaS completa para la **gestión de inventario, ventas, compras y reportes**, diseñada para pequeñas y medianas empresas que buscan controlar sus operaciones de manera moderna, rápida y accesible.

Combina un **backend potente con Node.js y SQLite**, autenticación segura con **Firebase**, y una **interfaz moderna basada en Glass Morphism**.  
Ofrece trazabilidad total, reportes automáticos, generación de PDFs y control de usuarios por roles (Admin / Vendedor).

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Base de Datos](#-base-de-datos)
- [Autenticación](#-autenticación)
- [Funcionalidades Principales](#-funcionalidades-principales)
- [Desarrollo](#-desarrollo)
- [Capturas de Pantalla](#-capturas-de-pantalla)
- [Licencia](#-licencia)
- [Autor](#-autor)

---

## ✨ Características

### 📦 Gestión de Inventario
- Control completo de productos (código, nombre, precio, stock, categoría)
- Filtros por categoría y estado de stock
- Ajustes manuales de stock con auditoría
- Historial de movimientos y exportación a CSV
- Alertas automáticas de stock crítico

### 💰 Ventas y Órdenes
- Carrito de compras interactivo
- Procesamiento de ventas con validación de stock
- Gestión de órdenes (PEDIDO, FACTURADO, ENVIADO, ENTREGADO, CANCELADO)
- Impresión de cotizaciones y facturas PDF

### 📥 Entradas y Compras
- Registro de entradas con validación de stock
- Soporte para productos nuevos y existentes
- Anulación de entradas con control de inventario
- Reportes de compras y proveedores

### 🔄 Devoluciones
- Devoluciones de ventas y compras
- Motivos registrados y actualización automática de stock
- Actas en PDF y auditoría completa

### 📊 Dashboard y Reportes
- Métricas en tiempo real: ventas, stock crítico, rotación, etc.
- Gráficos dinámicos con Chart.js
- Predicciones de agotamiento y top productos
- Exportación de reportes a PDF

### 👥 Gestión de Usuarios
- Autenticación con Firebase
- Roles: Admin / Vendedor
- Control de acceso y permisos

---

## 🛠 Tecnologías

### Backend
- **Node.js** – Entorno de ejecución
- **Express 5.1.0** – Framework web
- **SQLite3** – Base de datos ligera y rápida
- **Firebase Admin** – Autenticación y roles
- **PDFKit** – Generación de PDFs
- **dotenv, CORS, Logger** – Configuración y seguridad

### Frontend
- **HTML5 / CSS3 / JS (ES6+)**
- **Bootstrap 5.3** – Diseño responsivo
- **Chart.js** – Gráficos interactivos
- **Glass Morphism UI** – Estilo visual moderno

---

## 📁 Estructura del Proyecto

repox/
├── backend/
│ ├── app.js
│ ├── config/
│ ├── controllers/
│ ├── database/
│ ├── middleware/
│ ├── routes/
│ └── utils/
│
├── public/
│ ├── index.html
│ ├── login.html
│ ├── css/
│ └── js/
│
├── package.json
└── README.md

---

## ⚙️ Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- npm o yarn
- Cuenta de Firebase configurada

### Pasos

```bash
git clone https://github.com/RocketHRFC/REPOX_SAAS_Sales.git
cd repox
npm install

Crear un archivo .env:

PORT=3000
NODE_ENV=development


Configurar Firebase en backend/config/firebase.js
y agregar serviceAccountKey.json con tus credenciales.

🎯 Uso
npm start


Luego abre: http://localhost:3000

Roles de Usuario

Admin: Acceso completo

Vendedor: Acceso limitado (ventas e inventario)

📡 API Endpoints (resumen)
Recurso	Método	Descripción
/api/productos	GET/POST/PUT	Gestión de productos
/api/ordenes	GET/POST/PUT	Gestión de órdenes de venta
/api/entradas	GET/POST/PUT	Registro de entradas
/api/devoluciones	GET/POST	Devoluciones de ventas y compras
/api/reportes	GET	Reportes e inventarios
/api/usuarios	GET/PUT	Gestión de usuarios
/api/pdf/...	GET	Generación de PDFs
🗄 Base de Datos

SQLite con creación automática.
Tablas principales:
productos, ventas, ordenes, entradas, clientes, proveedores, devoluciones, usuarios_roles, auditoria_precios, ajustes_inventario.

🔐 Autenticación y Roles

Autenticación por Firebase Email/Password

Control de acceso en backend con middleware

Roles administrados desde panel (Admin / Vendedor)

🎨 Funcionalidades Principales

Dashboard con métricas y gráficas dinámicas

Control completo de inventario y auditoría

Ventas en tiempo real con validación de stock

Entradas, devoluciones y reportes en PDF

💻 Desarrollo

Frontend en public/js/app.js (~3,000 líneas, modularizable)

Backend escalable con Express

Scripts:

npm start
npm test  # (pendiente de implementar)


Sugerencias:

Modularizar app.js

Implementar tests unitarios

Agregar caché para reportes

Mejorar validación de formularios

🖼️ Capturas de Pantalla
Dashboard	Inventario	Reporte PDF

	
	

(Las imágenes son referenciales, puedes añadir tus capturas reales en la carpeta /docs/)

📄 Licencia

ISC License — Libre para uso y modificación con atribución.

👤 Autor

Desarrollado por RocketHRFC
Para soporte o contribuciones: https://github.com/RocketHRFC

REPOX v1.0.0 – Sistema de Gestión de Inventario y Ventas
✨ “Controla, analiza y mejora cada venta.”