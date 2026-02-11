import BluetoothModal from "@/components/BluetoothModal";
import ModuleScreen, { ModuleScreenConfig } from "@/components/module-screen";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ModalOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

const etiquetadoOptions: ModalOption[] = [
  {
    id: "generador",
    title: "Etiquetador",
    subtitle: "Crear etiquetas de código de barras",
    icon: "barcode-outline",
    color: "#22C55E",
    route: "/(main)/aplicaciones/etiquetado/generador",
  },
  {
    id: "precios",
    title: "Precios",
    subtitle: "Etiquetas con precio de piso",
    icon: "pricetags-outline",
    color: "#F59E0B",
    route: "/(main)/aplicaciones/etiquetado/precios",
  },
  {
    id: "ubicaciones",
    title: "Ubicaciones",
    subtitle: "Etiquetas de rack/almacén",
    icon: "location-outline",
    color: "#3B82F6",
    route: "/(main)/aplicaciones/etiquetado/ubicaciones",
  },
  {
    id: "paquetes",
    title: "Paquetes",
    subtitle: "Etiquetas para envíos",
    icon: "cube-outline",
    color: "#EC4899",
    route: "/(main)/aplicaciones/etiquetado/paquetes",
  },
];

const getAplicacionesConfig = (
  onEtiquetadoPress: () => void,
): ModuleScreenConfig => ({
  headerIcon: "apps-outline",
  headerTitle: "Aplicaciones",
  headerSubtitle: "Herramientas y utilidades",
  stats: [{ value: "4", label: "Herramientas", sublabel: "disponibles" }],
  sectionLabel: "MÓDULOS",
  groups: [
    {
      id: "centro-etiquetado",
      title: "Centro de Etiquetado",
      subtitle: "Genera e imprime etiquetas",
      icon: "pricetag-outline",
      color: "#9D4EDD",
      onPress: onEtiquetadoPress,
    },
  ],
});

export default function AplicacionesIndexScreen() {
  const colors = useThemeColors();
  const [isBluetoothModalVisible, setIsBluetoothModalVisible] = useState(false);
  const [showEtiquetadoModal, setShowEtiquetadoModal] = useState(false);

  const config = getAplicacionesConfig(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowEtiquetadoModal(true);
  });

  const openBluetoothModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBluetoothModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ModuleScreen config={config} />

      {/* FAB Bluetooth */}
      {/* <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={openBluetoothModal}
        activeOpacity={0.8}
      >
        <Ionicons name="bluetooth" size={26} color="#fff" />
      </TouchableOpacity> */}

      {/* Modal de Etiquetado */}
      <Modal
        visible={showEtiquetadoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEtiquetadoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEtiquetadoModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.modalIcon, { backgroundColor: "#9D4EDD20" }]}
              >
                <Ionicons name="pricetag-outline" size={24} color="#9D4EDD" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Centro de Etiquetado
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                Selecciona el tipo de etiqueta
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {etiquetadoOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setShowEtiquetadoModal(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(option.route as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: `${option.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={option.color}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      {option.title}
                    </Text>
                    <Text
                      style={[
                        styles.optionSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {option.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bluetooth Modal */}
      <BluetoothModal
        visible={isBluetoothModalVisible}
        onClose={() => setIsBluetoothModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  optionsContainer: {
    padding: 16,
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
  },
});
