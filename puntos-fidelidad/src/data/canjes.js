/**
 * Catalogo de premios que un cliente puede canjear con sus puntos.
 *
 * Reglas de diseño (decision de negocio):
 * - Ningun premio es cigarrillos.
 * - Ningun premio es un producto que ya tiene descuento por promocion (2x1, 3x2),
 *   porque ese producto ya le genera perdida de margen al dueño por otro lado.
 * - Todos cuestan lo mismo en puntos (300) para que el canje automatico
 *   sea simple y predecible: "300 puntos = 1 premio", sin sorpresas de stock/precio.
 *
 * Si el dueño quiere agregar mas premios, alcanza con sumar un objeto aca.
 */
export const CATALOGO_CANJES = [
  { id: "agua", nombre: "Agua mineral 500ml", costoPuntos: 300 },
  { id: "factura", nombre: "Media docena de facturas", costoPuntos: 300 },
  { id: "gaseosa", nombre: "Gaseosa linea economica 500ml", costoPuntos: 300 },
  { id: "cafe", nombre: "Cafe de panaderia", costoPuntos: 300 },
];

// Indice para ir rotando el premio otorgado en canjes automaticos,
// asi no siempre se entrega el mismo producto.
let indiceRotativo = 0;

/**
 * Devuelve el proximo premio disponible para un canje automatico.
 * @returns {{id: string, nombre: string, costoPuntos: number}}
 */
export function elegirPremioDisponible() {
  const premio = CATALOGO_CANJES[indiceRotativo % CATALOGO_CANJES.length];
  indiceRotativo += 1;
  return premio;
}