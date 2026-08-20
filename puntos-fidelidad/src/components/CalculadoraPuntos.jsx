import React, { useState, useRef, useEffect } from "react";
import {
  buscarProductoPorCodigo,
  promoActiva,
  unidadesAPagar,
} from "../data/productos";
import {
  sumarPuntosCliente,
  listarClientes,
  PUNTOS_PARA_CANJE,
} from "../data/clientes";

/* ============================================================
 * LOGICA DE NEGOCIO - PUNTOS
 * ============================================================ */

function puntosPorMonto(monto) {
  if (monto < 10000) return 0;
  if (monto <= 50000) return Math.floor(monto / 1000);
  return Math.floor(monto / 1000) * 2;
}

export const CATEGORIAS_EXCLUIDAS = ["cigarrillos"];

function evaluarItem(item) {
  const cantidad = Number(item.cantidad) || 0;
  const promoEstaActiva = promoActiva(item.promocion, cantidad);

  const unidadesPagas = promoEstaActiva
    ? unidadesAPagar(item.promocion, cantidad)
    : cantidad;

  const subtotal = (Number(item.precio) || 0) * unidadesPagas;

  const esCategoriaExcluida = CATEGORIAS_EXCLUIDAS.includes(
    (item.categoria || "").toLowerCase()
  );

  const excluidoDePuntos = esCategoriaExcluida || promoEstaActiva;

  return { subtotal, excluidoDePuntos, promoEstaActiva };
}

/**
 * Calcula el resultado de la venta a partir del carrito.
 * NO decide todavia si suma puntos o no: eso depende del medio de pago,
 * que se resuelve en finalizarVenta().
 */
export function calcularPuntosCarrito(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("monto invalido");
  }

  let montoTotal = 0;
  let montoElegible = 0;

  for (const item of items) {
    const { subtotal, excluidoDePuntos } = evaluarItem(item);
    montoTotal += subtotal;
    if (!excluidoDePuntos) {
      montoElegible += subtotal;
    }
  }

  if (montoTotal <= 0) {
    throw new Error("monto invalido");
  }

  return {
    puntos: puntosPorMonto(montoElegible),
    montoTotal,
    montoElegible,
    montoExcluido: montoTotal - montoElegible,
  };
}

/* ============================================================
 * COMPONENTE UI - MODO CAJA
 * ============================================================ */

function formatearARS(valor) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

let nextId = 1;

export default function CalculadoraPuntos() {
  const [items, setItems] = useState([]);
  const [codigo, setCodigo] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo"); // "efectivo" | "tarjeta"
  const [dni, setDni] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [canjesRealizados, setCanjesRealizados] = useState([]);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [items]);

  const escanearProducto = (e) => {
    e.preventDefault();
    setResultado(null);

    const producto = buscarProductoPorCodigo(codigo);

    if (!producto) {
      setError(`Codigo "${codigo}" no encontrado en el catalogo`);
      setCodigo("");
      return;
    }

    setError("");

    setItems((prev) => {
      const existente = prev.find((it) => it.codigo === producto.codigo);
      if (existente) {
        return prev.map((it) =>
          it.codigo === producto.codigo
            ? { ...it, cantidad: it.cantidad + 1 }
            : it
        );
      }
      return [...prev, { ...producto, id: nextId++, cantidad: 1 }];
    });

    setCodigo("");
  };

  const quitarItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setResultado(null);
  };

  const cambiarCantidad = (id, delta) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.id === id ? { ...it, cantidad: it.cantidad + delta } : it
        )
        .filter((it) => it.cantidad > 0)
    );
    setResultado(null);
  };

  const finalizarVenta = () => {
    setError("");
    setResultado(null);
    setCanjesRealizados([]);

    let calculo;
    try {
      calculo = calcularPuntosCarrito(items);
    } catch (err) {
      setError(err.message);
      return;
    }

    // Pago con tarjeta: la venta es valida, pero NUNCA suma puntos
    if (metodoPago === "tarjeta") {
      setResultado({ ...calculo, puntos: 0, sinPuntosPor: "tarjeta" });
      return;
    }

    // Pago en efectivo: necesitamos identificar al cliente para acreditar puntos
    if (!dni.trim()) {
      setError("Ingresa el DNI del cliente para sumar puntos en efectivo");
      return;
    }

    const { cliente, canjesRealizados: canjes } = sumarPuntosCliente(
      dni,
      nombreCliente,
      calculo.puntos
    );

    setResultado({ ...calculo, sinPuntosPor: null, clienteActual: cliente });
    setCanjesRealizados(canjes);
  };

  const nuevaVenta = () => {
    setItems([]);
    setResultado(null);
    setCanjesRealizados([]);
    setError("");
    setDni("");
    setNombreCliente("");
  };

  const itemsEvaluados = items.map((it) => ({
    ...it,
    ...evaluarItem(it),
  }));

  const totalTicket = itemsEvaluados.reduce((acc, it) => acc + it.subtotal, 0);
  const clientes = mostrarClientes ? listarClientes() : [];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <span style={styles.eyebrow}>Punto de venta</span>
          <h1 style={styles.title}>Caja - Puntos de fidelidad</h1>
          <p style={styles.subtitle}>
            Solo los pagos en efectivo suman puntos. A los {PUNTOS_PARA_CANJE}{" "}
            puntos, el canje se aplica automaticamente.
          </p>
        </header>

        {/* Escaneo de productos */}
        <form onSubmit={escanearProducto} style={styles.scanForm}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Codigo de producto..."
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            style={styles.scanInput}
            autoFocus
          />
          <button type="submit" style={styles.buttonSecondary}>
            Escanear
          </button>
        </form>

        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.hintsBox}>
          <span style={styles.hintsTitle}>Codigos de prueba</span>
          <div style={styles.hintsGrid}>
            <button type="button" style={styles.hintChip} onClick={() => setCodigo("7790000000011")}>
              7790000000011 (Cigarrillos)
            </button>
            <button type="button" style={styles.hintChip} onClick={() => setCodigo("7790000000066")}>
              7790000000066 (Coca-Cola 2x1)
            </button>
            <button type="button" style={styles.hintChip} onClick={() => setCodigo("7790000000035")}>
              7790000000035 (Leche)
            </button>
          </div>
        </div>

        {/* Ticket */}
        {items.length > 0 && (
          <div style={styles.cartSection}>
            <span style={styles.examplesTitle}>
              Ticket ({items.length} {items.length === 1 ? "producto" : "productos"})
            </span>
            <ul style={styles.cartList}>
              {itemsEvaluados.map((it) => (
                <li key={it.id} style={styles.cartItem}>
                  <div style={styles.cartItemInfo}>
                    <span style={styles.cartItemName}>
                      {it.nombre}
                      {it.categoria === "cigarrillos" && (
                        <span style={styles.badgeRed}>sin puntos</span>
                      )}
                      {it.promocion && it.promoEstaActiva && (
                        <span style={styles.badgeAmberActiva}>
                          {it.promocion} · sin puntos
                        </span>
                      )}
                    </span>
                    <span style={styles.cartItemDetail}>
                      {formatearARS(it.precio)} c/u = {formatearARS(it.subtotal)}
                    </span>
                  </div>
                  <div style={styles.qtyControls}>
                    <button type="button" onClick={() => cambiarCantidad(it.id, -1)} style={styles.qtyBtn}>−</button>
                    <span style={styles.qtyValue}>{it.cantidad}</span>
                    <button type="button" onClick={() => cambiarCantidad(it.id, 1)} style={styles.qtyBtn}>+</button>
                    <button type="button" onClick={() => quitarItem(it.id)} style={styles.removeBtn}>×</button>
                  </div>
                </li>
              ))}
            </ul>

            <div style={styles.totalRow}>
              <span>Total del ticket</span>
              <strong>{formatearARS(totalTicket)}</strong>
            </div>

            {/* Medio de pago */}
            <div style={styles.paymentSection}>
              <span style={styles.label}>Medio de pago</span>
              <div style={styles.paymentOptions}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value="efectivo"
                    checked={metodoPago === "efectivo"}
                    onChange={() => setMetodoPago("efectivo")}
                  />
                  Efectivo
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value="tarjeta"
                    checked={metodoPago === "tarjeta"}
                    onChange={() => setMetodoPago("tarjeta")}
                  />
                  Tarjeta
                </label>
              </div>

              {metodoPago === "efectivo" ? (
                <div style={styles.customerRow}>
                  <input
                    type="text"
                    placeholder="DNI del cliente"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  />
                </div>
              ) : (
                <p style={styles.cardNotice}>
                  Pago con tarjeta: esta venta no suma puntos de fidelidad.
                </p>
              )}
            </div>

            <button type="button" onClick={finalizarVenta} style={styles.button}>
              Finalizar venta
            </button>
          </div>
        )}

        {/* Resultado de la venta */}
        {resultado && !error && (
          <div style={styles.resultBox}>
            {resultado.sinPuntosPor === "tarjeta" ? (
              <>
                <span style={styles.resultLabelMuted}>Venta finalizada</span>
                <span style={styles.resultValueMuted}>0 puntos</span>
                <p style={styles.mutedText}>
                  Pago con tarjeta: no se acreditan puntos.
                </p>
              </>
            ) : (
              <>
                <span style={styles.resultLabel}>Puntos ganados en esta venta</span>
                <span style={styles.resultValue}>{resultado.puntos}</span>

                {resultado.clienteActual && (
                  <div style={styles.customerSummary}>
                    <strong>{resultado.clienteActual.nombre}</strong> (DNI{" "}
                    {resultado.clienteActual.dni})
                    <div>
                      Puntos acumulados actuales:{" "}
                      <strong>{resultado.clienteActual.puntos}</strong> / {PUNTOS_PARA_CANJE}
                    </div>
                  </div>
                )}

                {canjesRealizados.length > 0 && (
                  <div style={styles.canjeBox}>
                    <strong>¡Canje automatico aplicado!</strong>
                    <ul style={styles.canjeList}>
                      {canjesRealizados.map((c, i) => (
                        <li key={i}>
                          {c.premio} (usó {c.puntosUsados} puntos)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <div style={styles.breakdown}>
              <div style={styles.breakdownRow}>
                <span>Total de la venta</span>
                <span>{formatearARS(resultado.montoTotal)}</span>
              </div>
              <div style={styles.breakdownRow}>
                <span>Monto elegible para puntos</span>
                <span>{formatearARS(resultado.montoElegible)}</span>
              </div>
            </div>

            <button type="button" onClick={nuevaVenta} style={styles.buttonOutline}>
              Nueva venta
            </button>
          </div>
        )}

        {/* Panel de clientes */}
        <div style={styles.clientesSection}>
          <button
            type="button"
            onClick={() => setMostrarClientes((v) => !v)}
            style={styles.linkBtn}
          >
            {mostrarClientes ? "Ocultar clientes" : "Ver clientes con puntos"}
          </button>

          {mostrarClientes && (
            <div style={styles.clientesTableWrap}>
              {clientes.length === 0 ? (
                <p style={styles.mutedText}>Todavia no hay clientes registrados.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>DNI</th>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>Puntos</th>
                      <th style={styles.th}>Ultimo canje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => {
                      const ultimoCanje = c.historialCanjes[c.historialCanjes.length - 1];
                      return (
                        <tr key={c.dni}>
                          <td style={styles.td}>{c.dni}</td>
                          <td style={styles.td}>{c.nombre}</td>
                          <td style={styles.td}>{c.puntos}</td>
                          <td style={styles.td}>
                            {ultimoCanje
                              ? `${ultimoCanje.premio} (${formatearFecha(ultimoCanje.fecha)})`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "48px 16px",
    background: "#F5F6F8",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 1px 3px rgba(16,24,40,0.08), 0 4px 16px rgba(16,24,40,0.04)",
    border: "1px solid #E5E7EB",
  },
  header: { marginBottom: 20 },
  eyebrow: { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5B6472" },
  title: { margin: "6px 0 8px", fontSize: 22, fontWeight: 700, color: "#111827" },
  subtitle: { margin: 0, fontSize: 13, color: "#5B6472", lineHeight: 1.5 },
  scanForm: { display: "flex", gap: 8, marginBottom: 10 },
  scanInput: {
    flex: 1,
    padding: "12px 14px",
    fontSize: 16,
    fontFamily: "monospace",
    border: "2px solid #2F6F4E",
    borderRadius: 8,
    outline: "none",
    color: "#111827",
  },
  buttonSecondary: {
    padding: "0 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    background: "#F3F4F6",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    cursor: "pointer",
  },
  hintsBox: { marginBottom: 20 },
  hintsTitle: { display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 6 },
  hintsGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  hintChip: {
    padding: "4px 8px",
    fontSize: 11,
    fontFamily: "monospace",
    borderRadius: 6,
    border: "1px dashed #D1D5DB",
    background: "#FAFAFA",
    color: "#6B7280",
    cursor: "pointer",
  },
  errorBox: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 8,
    background: "#FDECEC",
    border: "1px solid #F5B5B1",
    color: "#B3261E",
    fontSize: 14,
  },
  cartSection: { marginTop: 8 },
  examplesTitle: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
  },
  cartList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "#FAFAFA",
    border: "1px solid #EEEFF1",
    borderRadius: 8,
  },
  cartItemInfo: { display: "flex", flexDirection: "column", gap: 2 },
  cartItemName: { fontSize: 13, fontWeight: 600, color: "#111827", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  cartItemDetail: { fontSize: 12, color: "#6B7280" },
  badgeRed: {
    fontSize: 10, fontWeight: 700, color: "#B3261E", background: "#FDECEC",
    border: "1px solid #F5B5B1", borderRadius: 999, padding: "2px 7px",
    textTransform: "uppercase", letterSpacing: "0.03em",
  },
  badgeAmberActiva: {
    fontSize: 10, fontWeight: 700, color: "#8A5A05", background: "#FDF0DA",
    border: "1px solid #F3D48B", borderRadius: 999, padding: "2px 7px",
    textTransform: "uppercase", letterSpacing: "0.03em",
  },
  qtyControls: { display: "flex", alignItems: "center", gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 6, border: "1px solid #D1D5DB", background: "#FFFFFF", color: "#374151", fontSize: 14, cursor: "pointer", lineHeight: 1 },
  qtyValue: { fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: "center" },
  removeBtn: { background: "none", border: "none", color: "#9CA3AF", fontSize: 18, cursor: "pointer", padding: "0 2px" },
  totalRow: {
    display: "flex", justifyContent: "space-between", fontSize: 14, color: "#374151",
    padding: "10px 2px", borderTop: "1px solid #E5E7EB", marginTop: 8,
  },
  paymentSection: {
    marginTop: 14, paddingTop: 14, borderTop: "1px solid #E5E7EB",
    display: "flex", flexDirection: "column", gap: 8,
  },
  label: { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" },
  paymentOptions: { display: "flex", gap: 16 },
  radioLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" },
  customerRow: { display: "flex", gap: 8 },
  input: {
    padding: "9px 12px", fontSize: 13, border: "1px solid #D1D5DB",
    borderRadius: 8, outline: "none", color: "#111827", minWidth: 0,
  },
  cardNotice: { fontSize: 12, color: "#8A5A05", background: "#FDF0DA", border: "1px solid #F3D48B", borderRadius: 8, padding: "8px 10px", margin: 0 },
  button: {
    width: "100%", padding: "11px 18px", fontSize: 14, fontWeight: 600, color: "#FFFFFF",
    background: "#2F6F4E", border: "none", borderRadius: 8, cursor: "pointer", marginTop: 12,
  },
  buttonOutline: {
    width: "100%", padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "#2F6F4E",
    background: "#FFFFFF", border: "1px solid #2F6F4E", borderRadius: 8, cursor: "pointer", marginTop: 10,
  },
  resultBox: {
    marginTop: 16, padding: "18px 20px", borderRadius: 10, background: "#EEF6F1",
    border: "1px solid #BEE0CC", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  resultLabel: { fontSize: 12, fontWeight: 600, color: "#2F6F4E", textTransform: "uppercase", letterSpacing: "0.06em" },
  resultValue: { fontSize: 36, fontWeight: 800, color: "#1F5138" },
  resultLabelMuted: { fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" },
  resultValueMuted: { fontSize: 28, fontWeight: 700, color: "#6B7280" },
  mutedText: { fontSize: 12, color: "#6B7280", margin: "4px 0 0" },
  customerSummary: { fontSize: 13, color: "#1F5138", textAlign: "center", marginTop: 6 },
  canjeBox: {
    marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#FDF0DA",
    border: "1px solid #F3D48B", color: "#8A5A05", fontSize: 13, width: "100%",
  },
  canjeList: { margin: "6px 0 0", paddingLeft: 18 },
  breakdown: {
    width: "100%", marginTop: 10, paddingTop: 10, borderTop: "1px solid #BEE0CC",
    display: "flex", flexDirection: "column", gap: 4,
  },
  breakdownRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3B6B52" },
  clientesSection: { marginTop: 24, paddingTop: 16, borderTop: "1px solid #E5E7EB" },
  linkBtn: { background: "none", border: "none", color: "#2F6F4E", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 },
  clientesTableWrap: { marginTop: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #E5E7EB", color: "#6B7280", fontWeight: 600 },
  td: { padding: "6px 8px", borderBottom: "1px solid #F3F4F6", color: "#111827" },
};