import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SearchResultsPickerProps {
  visible: boolean;
  results: any[];
  color: string;
  onSelect: (articulo: any) => void;
  onDismiss: () => void;
}

export default function SearchResultsPicker({
  visible,
  results,
  color,
  onSelect,
  onDismiss,
}: SearchResultsPickerProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Zona táctil para cerrar */}
        <TouchableOpacity
          style={styles.overlayDismiss}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: color }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.headerTitle}>
                {results.length} resultados encontrados
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Toca el artículo que deseas agregar
          </Text>

          {/* Lista de resultados */}
          <FlatList
            data={results}
            keyExtractor={(item, idx) =>
              `${item.ARTICULO_ID || item.CLAVE || idx}`
            }
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const clave = item.CLAVE || item.CLAVE_ARTICULO || "";
              const nombre = item.NOMBRE || "";
              const barcode = item.CODIGO_BARRAS || "";
              const umed = item.UNIDAD_VENTA || item.UMED || "";
              const categoria = item.CATEGORIA || item.LINEA_NOMBRE || "";

              return (
                <TouchableOpacity
                  style={[
                    styles.resultItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.6}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.resultLeft}>
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultClave, { color }]}>
                        {clave}
                      </Text>
                      {umed ? (
                        <View
                          style={[
                            styles.umedBadge,
                            { backgroundColor: `${color}20` },
                          ]}
                        >
                          <Text style={[styles.umedText, { color }]}>
                            {umed}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[styles.resultNombre, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {nombre}
                    </Text>
                    {(barcode || categoria) ? (
                      <View style={styles.resultMeta}>
                        {barcode ? (
                          <Text
                            style={[
                              styles.resultMetaText,
                              { color: colors.textTertiary },
                            ]}
                          >
                            CB: {barcode}
                          </Text>
                        ) : null}
                        {categoria ? (
                          <Text
                            style={[
                              styles.resultMetaText,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {categoria}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle" size={28} color={color} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  overlayDismiss: {
    flex: 1,
  },
  container: {
    maxHeight: "75%",
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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  resultLeft: {
    flex: 1,
    gap: 4,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultClave: {
    fontSize: 14,
    fontWeight: "700",
  },
  umedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  umedText: {
    fontSize: 10,
    fontWeight: "600",
  },
  resultNombre: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  resultMetaText: {
    fontSize: 11,
  },
});
