import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ArticuloCaja {
  CLAVE_ARTICULO: string;
  UNIDADES_APARTADAS: number;
}

interface CajaDetalle {
  CODIGO_CAJA: string;
  NOMBRE_CAJA: string;
  TOTAL_ARTICULOS: number;
  TOTAL_UNIDADES: number;
  articulos: ArticuloCaja[];
}

interface ArticuloPendiente {
  CLAVE_ARTICULO: string;
  NOMBRE_ARTICULO: string;
  UNIDADES_SOLICITADAS: number;
  UNIDADES_APARTADAS: number;
  UNIDADES_FALTANTES: number;
  ESTADO: string;
}

interface DetalleApartadoResponse {
  success: boolean;
  folio: string;
  resumen: {
    totalCajas: number;
    totalArticulosAsignados: number;
    totalArticulosPendientes: number;
  };
  cajas: CajaDetalle[];
  pendientes: ArticuloPendiente[];
}

interface DetalleCajaModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  apiBase: string;
  folio: string;
  codigoCaja: string;
  nombreCaja: string;
  onLiberarCaja?: (codigoCaja: string) => void; // Debug: para liberar la caja
}

type TabType = "asignados" | "pendientes";

export function DetalleCajaModal({
  visible,
  onClose,
  colors,
  apiBase,
  folio,
  codigoCaja,
  nombreCaja,
  onLiberarCaja,
}: DetalleCajaModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("asignados");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetalleApartadoResponse | null>(null);

  // Buscar la caja específica en los datos
  const cajaActual = data?.cajas.find((c) => c.CODIGO_CAJA === codigoCaja);

  useEffect(() => {
    if (visible && folio) {
      fetchDetalle();
    }
  }, [visible, folio]);

  const fetchDetalle = async () => {
    setLoading(true);
    setError(null);

    try {
      const databaseId = getCurrentDatabaseId();
      const response = await fetch(`${apiBase}/detalle-apartado.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, folio }),
      });

      const result = await response.json();
      console.log("[DETALLE-CAJA] Respuesta:", result);

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || "Error al obtener detalle");
      }
    } catch (err: any) {
      console.error("[DETALLE-CAJA] Error:", err);
      setError(err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.cajaIcon,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Ionicons name="cube" size={24} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {codigoCaja}
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {nombreCaja || "Sin nombre"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info del Pedido */}
          <View
            style={[styles.pedidoInfo, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.pedidoLabel, { color: colors.textSecondary }]}>
              Pedido:
            </Text>
            <Text style={[styles.pedidoValue, { color: colors.text }]}>
              {folio}
            </Text>

            {/* Debug: Botón para liberar caja */}
            {onLiberarCaja && (
              <TouchableOpacity
                style={[styles.trashBtn, { backgroundColor: "#EF4444" + "20" }]}
                onPress={() => {
                  onLiberarCaja(codigoCaja);
                  onClose();
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "asignados" && { backgroundColor: colors.accent },
              ]}
              onPress={() => setActiveTab("asignados")}
            >
              <Ionicons
                name="cube-outline"
                size={18}
                color={
                  activeTab === "asignados" ? "#fff" : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "asignados" ? "#fff" : colors.textSecondary,
                  },
                ]}
              >
                En esta caja
              </Text>
              {!loading && cajaActual && (
                <View style={[styles.tabBadge, { backgroundColor: "#10B981" }]}>
                  <Text style={styles.tabBadgeText}>
                    {cajaActual.TOTAL_ARTICULOS}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "pendientes" && {
                  backgroundColor: colors.accent,
                },
              ]}
              onPress={() => setActiveTab("pendientes")}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={
                  activeTab === "pendientes" ? "#fff" : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "pendientes"
                        ? "#fff"
                        : colors.textSecondary,
                  },
                ]}
              >
                Pendientes
              </Text>
              {!loading && data?.pendientes && (
                <View style={[styles.tabBadge, { backgroundColor: "#F59E0B" }]}>
                  <Text style={styles.tabBadgeText}>
                    {data.pendientes.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Cargando detalle...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                  onPress={fetchDetalle}
                >
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : activeTab === "asignados" ? (
              // Artículos en esta caja
              !cajaActual || cajaActual.articulos.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="cube-outline"
                    size={48}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No hay artículos en esta caja
                  </Text>
                </View>
              ) : (
                cajaActual.articulos.map((art, index) => (
                  <View
                    key={`art-${index}-${art.CLAVE_ARTICULO}`}
                    style={[
                      styles.articuloCard,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <View
                      style={[
                        styles.articuloIcon,
                        { backgroundColor: "#10B98120" },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    </View>
                    <View style={styles.articuloInfo}>
                      <Text
                        style={[styles.articuloClave, { color: colors.text }]}
                      >
                        {art.CLAVE_ARTICULO}
                      </Text>
                    </View>
                    <View style={styles.articuloUnidades}>
                      <Text
                        style={[styles.unidadesValue, { color: colors.accent }]}
                      >
                        {art.UNIDADES_APARTADAS}
                      </Text>
                      <Text
                        style={[
                          styles.unidadesLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        uds
                      </Text>
                    </View>
                  </View>
                ))
              )
            ) : // Artículos pendientes del pedido
            !data?.pendientes || data.pendientes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={48}
                  color="#10B981"
                />
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No hay artículos pendientes
                </Text>
              </View>
            ) : (
              data.pendientes.map((art, index) => (
                <View
                  key={`pend-${index}-${art.CLAVE_ARTICULO}`}
                  style={[
                    styles.articuloCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View
                    style={[
                      styles.articuloIcon,
                      { backgroundColor: "#F59E0B20" },
                    ]}
                  >
                    <Ionicons name="time-outline" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.articuloInfo}>
                    <Text
                      style={[styles.articuloClave, { color: colors.text }]}
                    >
                      {art.CLAVE_ARTICULO}
                    </Text>
                    {art.NOMBRE_ARTICULO &&
                      art.NOMBRE_ARTICULO !== art.CLAVE_ARTICULO && (
                        <Text
                          style={[
                            styles.articuloNombre,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {art.NOMBRE_ARTICULO}
                        </Text>
                      )}
                  </View>
                  <View style={styles.pendienteStats}>
                    <View style={styles.pendienteStat}>
                      <Text
                        style={[styles.pendienteValue, { color: "#F59E0B" }]}
                      >
                        {art.UNIDADES_FALTANTES}
                      </Text>
                      <Text
                        style={[
                          styles.pendienteLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        faltan
                      </Text>
                    </View>
                    <View style={styles.pendienteStat}>
                      <Text
                        style={[
                          styles.pendienteValue,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {art.UNIDADES_SOLICITADAS}
                      </Text>
                      <Text
                        style={[
                          styles.pendienteLabel,
                          { color: colors.textTertiary },
                        ]}
                      >
                        total
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer resumen */}
          {!loading && data && (
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <View style={styles.footerStat}>
                <Text style={[styles.footerValue, { color: "#10B981" }]}>
                  {data.resumen.totalArticulosAsignados}
                </Text>
                <Text
                  style={[styles.footerLabel, { color: colors.textSecondary }]}
                >
                  Asignados
                </Text>
              </View>
              <View
                style={[
                  styles.footerDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.footerStat}>
                <Text style={[styles.footerValue, { color: "#F59E0B" }]}>
                  {data.resumen.totalArticulosPendientes}
                </Text>
                <Text
                  style={[styles.footerLabel, { color: colors.textSecondary }]}
                >
                  Pendientes
                </Text>
              </View>
              <View
                style={[
                  styles.footerDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.footerStat}>
                <Text style={[styles.footerValue, { color: colors.accent }]}>
                  {data.resumen.totalCajas}
                </Text>
                <Text
                  style={[styles.footerLabel, { color: colors.textSecondary }]}
                >
                  Cajas
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cajaIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  pedidoInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  pedidoLabel: {
    fontSize: 13,
  },
  pedidoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  articuloCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  articuloIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  articuloInfo: {
    flex: 1,
  },
  articuloClave: {
    fontSize: 14,
    fontWeight: "600",
  },
  articuloNombre: {
    fontSize: 12,
    marginTop: 2,
  },
  articuloUnidades: {
    alignItems: "center",
  },
  unidadesValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  unidadesLabel: {
    fontSize: 10,
  },
  pendienteStats: {
    flexDirection: "row",
    gap: 16,
  },
  pendienteStat: {
    alignItems: "center",
  },
  pendienteValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  pendienteLabel: {
    fontSize: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerStat: {
    flex: 1,
    alignItems: "center",
  },
  footerValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  footerLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  footerDivider: {
    width: 1,
    height: 36,
  },
  trashBtn: {
    marginLeft: "auto",
    padding: 8,
    borderRadius: 8,
  },
});
