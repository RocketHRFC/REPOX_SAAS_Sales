// utils/api.js - Funciones para llamadas a la API

const API_BASE = '/api';

/**
 * Realiza una petición GET a la API
 * @param {string} endpoint - Endpoint de la API
 * @returns {Promise<any>} Datos de la respuesta
 */
export async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error en GET ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Realiza una petición POST a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {object} data - Datos a enviar
 * @param {object} headers - Headers adicionales
 * @returns {Promise<any>} Datos de la respuesta
 */
export async function apiPost(endpoint, data = {}, headers = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en POST ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Realiza una petición PUT a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {object} data - Datos a enviar
 * @param {object} headers - Headers adicionales
 * @returns {Promise<any>} Datos de la respuesta
 */
export async function apiPut(endpoint, data = {}, headers = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en PUT ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Realiza una petición DELETE a la API
 * @param {string} endpoint - Endpoint de la API
 * @returns {Promise<any>} Datos de la respuesta
 */
export async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en DELETE ${endpoint}:`, error);
    throw error;
  }
}

