/**
 * Catalogo de productos de la tienda.
 * En un sistema real esto vendria de una base de datos o de una API.
 *
 * campo "promocion": null | "2x1" | "3x2"
 *   - "2x1": cada 2 unidades, se paga 1
 *   - "3x2": cada 3 unidades, se pagan 2
 *
 * Los productos con promocion activa (segun la cantidad comprada)
 * no suman puntos de fidelidad, igual que los cigarrillos.
 */
export const CATALOGO_PRODUCTOS = [
  { codigo: "7790000000011", nombre: "Cigarrillos Marlboro", precio: 8500, categoria: "cigarrillos", promocion: null },
  { codigo: "7790000000028", nombre: "Cigarrillos Philip Morris", precio: 8200, categoria: "cigarrillos", promocion: null },
  { codigo: "7790000000035", nombre: "Leche entera 1L", precio: 1450, categoria: "almacen", promocion: null },
  { codigo: "7790000000042", nombre: "Pan lactal", precio: 2200, categoria: "panaderia", promocion: null },
  { codigo: "7790000000059", nombre: "Detergente 750ml", precio: 3100, categoria: "limpieza", promocion: null },
  { codigo: "7790000000066", nombre: "Coca-Cola 1.5L", precio: 2800, categoria: "bebidas", promocion: "2x1" },
  { codigo: "7790000000073", nombre: "Fideos 500g", precio: 1600, categoria: "almacen", promocion: "3x2" },
  { codigo: "7790000000080", nombre: "Yerba mate 1kg", precio: 5200, categoria: "almacen", promocion: null },
  { codigo: "7790000000097", nombre: "Yogur bebible 1L", precio: 2100, categoria: "lacteos", promocion: "2x1" },
  { codigo: "7790000000103", nombre: "Galletitas dulces", precio: 1300, categoria: "almacen", promocion: "3x2" },
];

/**
 * Busca un producto por su codigo exacto.
 * @param {string} codigo
 * @returns {{codigo: string, nombre: string, precio: number, categoria: string, promocion: string|null} | undefined}
 */
export function buscarProductoPorCodigo(codigo) {
  const codigoLimpio = (codigo || "").trim();
  return CATALOGO_PRODUCTOS.find((p) => p.codigo === codigoLimpio);
}

/**
 * Cantidad minima de unidades para que la promo se active.
 */
export const MINIMO_PARA_PROMO = {
  "2x1": 2,
  "3x2": 3,
};

/**
 * Indica si, dada una cantidad, la promocion del producto esta activa.
 * @param {string|null} promocion
 * @param {number} cantidad
 * @returns {boolean}
 */
export function promoActiva(promocion, cantidad) {
  if (!promocion) return false;
  const minimo = MINIMO_PARA_PROMO[promocion];
  return minimo != null && cantidad >= minimo;
}

/**
 * Calcula cuantas unidades se pagan realmente dada una promocion y una cantidad.
 * "2x1": cada par de unidades, se paga 1. Ej: 5 unidades -> 3 se pagan (2 pares + 1 suelta)
 * "3x2": cada terna de unidades, se pagan 2. Ej: 7 unidades -> 5 se pagan (2 ternas=4 pagas + 1 resto)
 * @param {string|null} promocion
 * @param {number} cantidad
 * @returns {number} unidades a pagar
 */
export function unidadesAPagar(promocion, cantidad) {
  if (promocion === "2x1") {
    const pares = Math.floor(cantidad / 2);
    const resto = cantidad % 2;
    return pares * 1 + resto;
  }
  if (promocion === "3x2") {
    const ternas = Math.floor(cantidad / 3);
    const resto = cantidad % 3;
    return ternas * 2 + resto;
  }
  return cantidad;
}