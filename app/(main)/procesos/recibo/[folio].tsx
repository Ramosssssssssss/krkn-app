import { API_URL } from "@/config/api";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DetalleArticulo {
  ARTICULO_ID: number;
  CLAVE: string;
  CODIGO_BARRAS: string;
  DESCRIPCION: string;
  UNIDAD: string;
  CANTIDAD: number;
  IMAGEN_BASE64: string | null;
}

interface CodigoInner {
  CODIGO_INNER: string;
  CONTENIDO_EMPAQUE: number;
  ARTICULO_ID: number;
}

interface Caratula {
  FECHA: string;
  FOLIO: string;
  CLAVE_PROV: string;
  DOCTO_CM_ID: number;
  ALMACEN: string;
  PROVEEDOR: string;
}

export default function DetalleOrdenScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ folio: string; proveedor: string }>();

  const [loading, setLoading] = useState(true);
  const [caratula, setCaratula] = useState<Caratula | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [codigosInner, setCodigosInner] = useState<CodigoInner[]>([]);

  useEffect(() => {
    if (params.folio) {
      cargarDetalles(params.folio);
    }
  }, [params.folio]);

  const cargarDetalles = async (folio: string) => {
    const databaseId = getCurrentDatabaseId();
    if (!databaseId) return;

    setLoading(true);
    try {
      const url = `${API_URL}/api/detalle-orden-compra.php?databaseId=${databaseId}&folioOC=${encodeURIComponent(folio)}&folioOriginal=${encodeURIComponent(folio)}`;
      console.log("Cargando detalles:", url);

      const response = await fetch(url);
      const data = await response.json();
      console.log("Respuesta detalles:", data);

      if (data.success) {
        setCaratula(data.caratula);
        setDetalles(data.detalles || []);
        setCodigosInner(data.codigosInner || []);
      }
    } catch (error) {
      console.error("Error cargando detalles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInnerCodes = (articuloId: number) => {
    return codigosInner.filter((c) => c.ARTICULO_ID === articuloId);
  };

  const renderArticulo = ({ item }: { item: DetalleArticulo }) => {
    const innerCodes = getInnerCodes(item.ARTICULO_ID);

    return (
      <View style={[styles.articleCard, { backgroundColor: colors.surface }]}>
        <View style={styles.articleRow}>
          {/* Imagen */}
          <View
            style={[
              styles.imageContainer,
              { backgroundColor: colors.inputBackground },
            ]}
          >
            {item.IMAGEN_BASE64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${item.IMAGEN_BASE64}` }}
                style={styles.articleImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="cube-outline"
                size={32}
                color={colors.textTertiary}
              />
            )}
          </View>

          {/* Info */}
          <View style={styles.articleInfo}>
            <Text style={[styles.articleClave, { color: colors.accent }]}>
              {item.CLAVE}
            </Text>
            <Text
              style={[styles.articleDesc, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.DESCRIPCION}
            </Text>
            {item.CODIGO_BARRAS && (
              <Text
                style={[styles.articleBarcode, { color: colors.textTertiary }]}
              >
                CB: {item.CODIGO_BARRAS}
              </Text>
            )}
          </View>

          {/* Cantidad */}
          <View style={styles.cantidadContainer}>
            <Text
              style={[styles.cantidadLabel, { color: colors.textTertiary }]}
            >
              Cant.
            </Text>
            <Text style={[styles.cantidadValue, { color: colors.text }]}>
              {item.CANTIDAD}
            </Text>
            <Text style={[styles.unidadLabel, { color: colors.textTertiary }]}>
              {item.UNIDAD}
            </Text>
          </View>
        </View>

        {/* Inner codes */}
        {innerCodes.length > 0 && (
          <View
            style={[styles.innerContainer, { borderTopColor: colors.border }]}
          >
            <Text style={[styles.innerLabel, { color: colors.textTertiary }]}>
              Empaques:
            </Text>
            {innerCodes.map((inner, idx) => (
              <View
                key={idx}
                style={[
                  styles.innerBadge,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Text style={[styles.innerText, { color: colors.accent }]}>
                  {inner.CODIGO_INNER} (x{inner.CONTENIDO_EMPAQUE})
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.text }]}>
            {params.folio || "Detalle"}
          </Text>
          {params.proveedor && (
            <Text
              style={[styles.subtitle, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {params.proveedor}
            </Text>
          )}
        </View>
      </View>

      {/* Carátula */}
      {caratula && (
        <View
          style={[styles.caratulaCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.caratulaRow}>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Proveedor
              </Text>
              <Text
                style={[styles.caratulaValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {caratula.PROVEEDOR || caratula.CLAVE_PROV}
              </Text>
            </View>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Almacén
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.text }]}>
                {caratula.ALMACEN}
              </Text>
            </View>
          </View>
          <View style={styles.caratulaRow}>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Fecha
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.text }]}>
                {formatDate(caratula.FECHA)}
              </Text>
            </View>
            <View style={styles.caratulaItem}>
              <Text
                style={[styles.caratulaLabel, { color: colors.textTertiary }]}
              >
                Artículos
              </Text>
              <Text style={[styles.caratulaValue, { color: colors.accent }]}>
                {detalles.length}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            Cargando artículos...
          </Text>
        </View>
      )}

      {/* Lista de artículos */}
      {!loading && (
        <FlatList
          data={detalles}
          keyExtractor={(item, index) => `${item.ARTICULO_ID}-${index}`}
          renderItem={renderArticulo}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No hay artículos en esta orden
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  caratulaCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
  },
  caratulaRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  caratulaItem: {
    flex: 1,
  },
  caratulaLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  caratulaValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  articleCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  articleRow: {
    flexDirection: "row",
    gap: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  articleImage: {
    width: "100%",
    height: "100%",
  },
  articleInfo: {
    flex: 1,
    justifyContent: "center",
  },
  articleClave: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  articleDesc: {
    fontSize: 14,
    lineHeight: 18,
  },
  articleBarcode: {
    fontSize: 11,
    marginTop: 4,
  },
  cantidadContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  cantidadLabel: {
    fontSize: 11,
  },
  cantidadValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  unidadLabel: {
    fontSize: 11,
  },
  innerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  innerLabel: {
    fontSize: 12,
  },
  innerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  innerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
  },
});
