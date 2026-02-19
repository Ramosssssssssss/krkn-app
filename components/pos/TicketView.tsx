import { COMPANY_INFO } from "@/constants/company";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TicketItem {
  clave: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  umed?: string | null;
}

export interface TicketViewProps {
  folio?: string;
  fecha?: string;
  hora?: string;
  cliente: string;
  clienteRFC?: string;
  cajero?: string;
  caja?: string;
  items: TicketItem[];
  total: number;
  metodoPago: string;
  recibido?: number;
  cambio?: number;
  notas?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Ancho estándar de impresora térmica de 58mm ≈ 32 chars monoespaciado
const W = 32;

const fmt = (n: number) =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const pad = (left: string, right: string, width = W) => {
  const spaces = width - left.length - right.length;
  return left + " ".repeat(Math.max(spaces, 1)) + right;
};

const center = (text: string, width = W) => {
  const spaces = width - text.length;
  const leftPad = Math.floor(spaces / 2);
  return " ".repeat(Math.max(leftPad, 0)) + text;
};

const line = (char = "-", width = W) => char.repeat(width);

const truncate = (str: string, max: number) =>
  str.length > max ? str.substring(0, max - 1) + "." : str;

// ═════════════════════════════════════════════════════════════════════════════
export default function TicketView({
  folio = "V-0001",
  fecha,
  hora,
  cliente,
  clienteRFC,
  cajero,
  caja,
  items,
  total,
  metodoPago,
  recibido,
  cambio,
  notas,
}: TicketViewProps) {
  const now = new Date();
  const displayFecha = fecha || now.toLocaleDateString("es-MX");
  const displayHora = hora || now.toLocaleTimeString("es-MX");

  const subtotal = total / 1.16;
  const iva = total - subtotal;

  return (
    <View style={s.ticket}>
      {/* ─── HEADER ─── */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Text style={[s.base, { fontSize: 18, fontWeight: '600', color: '#000' }]}>
          {COMPANY_INFO.nombre}
        </Text>
        <Text style={[s.base, s.light, { fontSize: 10, marginTop: 4, textAlign: 'center' }]}>
          {COMPANY_INFO.direccion}
        </Text>
        <Text style={[s.base, s.light, { fontSize: 9, opacity: 0.7 }]}>
          {COMPANY_INFO.rfc} • {COMPANY_INFO.telefono}
        </Text>
      </View>

      {/* ─── INFO VENTA ─── */}
      <View style={{ gap: 4, marginBottom: 20 }}>
        <View style={s.row}>
          <Text style={s.light}>Folio</Text>
          <Text style={s.base}>{folio}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.light}>Fecha</Text>
          <Text style={s.base}>{displayFecha} {displayHora}</Text>
        </View>
        {cajero && (
          <View style={s.row}>
            <Text style={s.light}>Atendido por</Text>
            <Text style={s.base}>{cajero}</Text>
          </View>
        )}
        {caja && (
          <View style={s.row}>
            <Text style={s.light}>Caja</Text>
            <Text style={s.base}>{caja}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 1, backgroundColor: '#F5F5F5', marginBottom: 20 }} />

      {/* ─── INFO CLIENTE ─── */}
      <View style={{ gap: 4, marginBottom: 24 }}>
        <View style={s.row}>
          <Text style={s.light}>Cliente</Text>
          <Text style={[s.base, { fontWeight: '500' }]}>{cliente}</Text>
        </View>
        {clienteRFC && (
          <View style={s.row}>
            <Text style={s.light}>RFC Cliente</Text>
            <Text style={s.base}>{clienteRFC}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 24 }} />

      {/* ─── ARTÍCULOS ─── */}
      <View style={{ gap: 18 }}>
        {items.map((item, idx) => (
          <View key={idx}>
            <View style={s.row}>
              <Text style={[s.base, { flex: 1, color: '#000' }]}>{item.descripcion}</Text>
              <Text style={[s.base, { fontWeight: '500', marginLeft: 16 }]}>{fmt(item.precio * item.cantidad)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <Text style={[s.base, s.light, { fontSize: 10 }]}>{item.cantidad} × {fmt(item.precio)}</Text>
              <Text style={[s.base, s.light, { fontSize: 10, opacity: 0.4 }]}>• {item.clave}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
      <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 }} />

      {/* ─── TOTALES ─── */}
      <View style={{ gap: 6 }}>
        <View style={s.row}>
          <Text style={s.light}>Subtotal</Text>
          <Text style={s.base}>{fmt(subtotal)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.light}>IVA (16%)</Text>
          <Text style={s.base}>{fmt(iva)}</Text>
        </View>
        <View style={[s.row, { marginTop: 8 }]}>
          <Text style={[s.base, { fontSize: 22, fontWeight: '200', color: '#000' }]}>Total</Text>
          <Text style={[s.base, { fontSize: 22, fontWeight: '600', color: '#000' }]}>{fmt(total)}</Text>
        </View>
      </View>

      <View style={{ height: 32 }} />

      {/* ─── PAGO ─── */}
      <View style={{ gap: 4, marginBottom: 24 }}>
        <View style={s.row}>
          <Text style={s.light}>Método de Pago</Text>
          <Text style={s.base}>{metodoPago.toUpperCase()}</Text>
        </View>
        {recibido !== undefined && recibido > 0 && (
          <View style={s.row}>
            <Text style={s.light}>Monto Recibido</Text>
            <Text style={s.base}>{fmt(recibido)}</Text>
          </View>
        )}
        {cambio !== undefined && cambio > 0 && (
          <View style={s.row}>
            <Text style={s.light}>Su Cambio</Text>
            <Text style={[s.base, { fontWeight: '600' }]}>{fmt(cambio)}</Text>
          </View>
        )}
      </View>

      {notas && (
        <View style={{ marginBottom: 30, padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8 }}>
          <Text style={[s.base, s.light, { fontSize: 10, marginBottom: 4 }]}>NOTAS</Text>
          <Text style={s.base}>{notas}</Text>
        </View>
      )}

      {/* ─── FOOTER ─── */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={[s.base, { fontWeight: '500', fontSize: 12 }]}>Gracias por su preferencia</Text>
        <Text style={[s.base, s.light, { fontSize: 10 }]}>{COMPANY_INFO.website}</Text>
        <Text style={[s.base, s.light, { fontSize: 9, fontStyle: 'italic', marginTop: 8 }]}>{COMPANY_INFO.lema}</Text>
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, width: '100%' }}>
          <Text style={[s.base, s.light, { fontSize: 8, textAlign: 'center' }]}>
            Este no es un comprobante fiscal. Conserve este ticket para cualquier aclaración o devolución dentro de los próximos 7 días con su empaque original.
          </Text>
        </View>
      </View>
    </View>
  );
}

const FONT = Platform.select({
  ios: "Helvetica Neue",
  android: "sans-serif-light",
  default: "sans-serif",
});

const s = StyleSheet.create({
  ticket: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 50,
    paddingHorizontal: 32,
    width: "100%",
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  base: {
    fontFamily: FONT,
    fontSize: 12,
    color: "#333",
    fontWeight: '400', // Un poco más legible pero manteniendo el estilo
    letterSpacing: -0.1,
  },
  light: {
    color: "#999",
    fontWeight: '300',
  },
});
