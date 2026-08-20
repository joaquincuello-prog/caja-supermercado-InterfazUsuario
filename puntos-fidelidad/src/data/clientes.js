import { elegirPremioDisponible } from "./canjes";

const STORAGE_KEY = "fidelidad_clientes_v1";
export const PUNTOS_PARA_CANJE = 300;

/**
 * Lee todos los clientes guardados desde localStorage.
 * @returns {Object.<string, Cliente>}
 */
function cargarClientes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("No se pudo leer clientes de localStorage", err);
    return {};
  }
}

/**
 * Persiste el objeto completo de clientes en localStorage.
 */
function guardarClientesEnStorage(clientes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  } catch (err) {
    console.error("No se pudo guardar clientes en localStorage", err);
  }
}

/**
 * Busca un cliente por DNI. Devuelve null si no existe todavia.
 * @param {string} dni
 */
export function obtenerCliente(dni) {
  const clientes = cargarClientes();
  return clientes[(dni || "").trim()] || null;
}

/**
 * Devuelve todos los clientes registrados, ordenados de mayor a menor puntaje.
 * Util para que el dueño identifique quien tiene puntos para canjear.
 */
export function listarClientes() {
  const clientes = cargarClientes();
  return Object.values(clientes).sort((a, b) => b.puntos - a.puntos);
}

/**
 * Suma puntos a un cliente (lo crea si no existia) y aplica canje
 * automatico cada vez que junta 300 o mas puntos.
 *
 * @param {string} dni
 * @param {string} nombre
 * @param {number} puntosASumar
 * @returns {{
 *   cliente: {dni: string, nombre: string, puntos: number, historialCanjes: Array},
 *   canjesRealizados: Array<{fecha: string, premio: string, puntosUsados: number}>
 * }}
 */
export function sumarPuntosCliente(dni, nombre, puntosASumar) {
  const dniLimpio = (dni || "").trim();
  if (!dniLimpio) {
    throw new Error("DNI invalido");
  }

  const clientes = cargarClientes();
  const existente = clientes[dniLimpio];

  const cliente = existente || {
    dni: dniLimpio,
    nombre: (nombre || "").trim() || "Sin nombre",
    puntos: 0,
    historialCanjes: [],
  };

  // Si el cajero cargo un nombre nuevo (ej. la primera vez estaba vacio), lo actualizamos
  if (nombre && nombre.trim()) {
    cliente.nombre = nombre.trim();
  }

  cliente.puntos += Math.max(0, puntosASumar);

  const canjesRealizados = [];

  // Canje automatico: mientras junte 300 o mas, se le va descontando y entregando premios
  while (cliente.puntos >= PUNTOS_PARA_CANJE) {
    const premio = elegirPremioDisponible();
    cliente.puntos -= premio.costoPuntos;

    const canje = {
      fecha: new Date().toISOString(),
      premio: premio.nombre,
      puntosUsados: premio.costoPuntos,
    };

    cliente.historialCanjes.push(canje);
    canjesRealizados.push(canje);
  }

  clientes[dniLimpio] = cliente;
  guardarClientesEnStorage(clientes);

  return { cliente, canjesRealizados };
}

/**
 * Borra todos los clientes guardados. Pensado solo para pruebas/demo.
 */
export function borrarTodosLosClientes() {
  guardarClientesEnStorage({});
}