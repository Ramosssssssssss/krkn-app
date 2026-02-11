import ModuleScreen, {
    ModuleGroup,
    ModuleScreenConfig,
} from "@/components/module-screen";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const getInventariosConfig = (
  companyCode: string,
  t: (key: string) => string,
  onRecepcionPress: () => void,
  onEntradasPress: () => void,
  onSalidasPress: () => void,
  onCiclicoPress: () => void,
  onTraspasoPress: () => void,
  onAplicarPress: () => void,
  onSolicitudesPress: () => void,
  onAsignadosPress: () => void,
): ModuleScreenConfig => {
  const groups: ModuleGroup[] = [
    // ============================================
    // ENTRADAS (Modal)
    // ============================================
    {
      id: "entradas",
      title: t("inventory.entries"),
      subtitle: t("inventory.entriesSubtitle"),
      icon: "arrow-down-outline",
      color: "#22C55E",
      onPress: onEntradasPress,
    },
    // ============================================
    // SALIDAS (Modal)
    // ============================================
    {
      id: "salidas",
      title: t("inventory.exits"),
      subtitle: t("inventory.exitsSubtitle"),
      icon: "arrow-up-outline",
      color: "#EF4444",
      onPress: onSalidasPress,
    },
    {
      id: "conteos",
      title: "Conteo",
      subtitle: "Gestión de inventario",
      icon: "clipboard-outline",
      color: "#F59E0B",
      onPress: onCiclicoPress,
    },
    {
      id: "solicitudes",
      title: "Solicitudes",
      subtitle: "Gestión de peticiones",
      icon: "document-text-outline",
      color: "#F97316",
      onPress: onSolicitudesPress,
    },
    // ============================================
    // TRASPASO (Modal)
    // ============================================
    {
      id: "traspaso",
      title: "Traspasos",
      subtitle: "Transferencia de inventario",
      icon: "swap-horizontal-outline",
      color: "#8B5CF6",
      onPress: onTraspasoPress,
    },
    // ============================================
    // SOLICITUDES (Modal)
    // ============================================

    // ============================================
    // APLICAR (Modal)
    // ============================================
    {
      id: "aplicar",
      title: "Aplicar",
      subtitle: "Validar y aplicar cambios",
      icon: "checkmark-done-circle-outline",
      color: "#10B981",
      onPress: onAplicarPress,
    },
    {
      id: "asignados",
      title: "Asignados",
      subtitle: "Inventarios asignados",
      icon: "people-outline",
      color: "#3B82F6",
      onPress: onAsignadosPress,
    },
    // ============================================
    // EMPRESA (Solo Recepción)
    // ============================================

    //METER SOLO EN APP DE GOUMAM (leer despues)

    // {
    //   id: companyCode.toLowerCase(),
    //   title: companyCode.toUpperCase(),
    //   icon: 'business-outline',
    //   color: '#9D4EDD',
    //   modules: [
    //     {
    //       id: 'recepcion',
    //       title: t('inventory.reception'),
    //       subtitle: t('inventory.receptionSubtitle'),
    //       icon: 'cube-outline',
    //       color: '#3B82F6',
    //       onPress: onRecepcionPress,
    //     },
    //   ]
    // },
    // ============================================
    // CÍCLICO (Modal)
    // ============================================
  ];

  return {
    headerIcon: "layers-outline",
    headerTitle: t("inventory.title"),
    headerSubtitle: t("inventory.subtitle"),
    stats: [
      {
        value: "0",
        label: t("inventory.entries"),
        sublabel: t("inventory.today"),
      },
      {
        value: "0",
        label: t("inventory.exits"),
        sublabel: t("inventory.today"),
      },
      { value: "0", label: t("inventory.pending") },
    ],
    sectionLabel: "OPERACIONES",
    groups,
  };
};

export default function InventariosIndexScreen() {
  const { companyCode } = useAuth();
  const { t } = useLanguage();
  const colors = useThemeColors();
  const [showRecepcionModal, setShowRecepcionModal] = useState(false);
  const [showEntradasModal, setShowEntradasModal] = useState(false);
  const [showSalidasModal, setShowSalidasModal] = useState(false);
  const [showCiclicoModal, setShowCiclicoModal] = useState(false);
  const [showTraspasoModal, setShowTraspasoModal] = useState(false);
  const [showAplicarModal, setShowAplicarModal] = useState(false);
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const [traspasoMode, setTraspasoMode] = useState<
    "main" | "sucursales" | "databases"
  >("main");
  const [solicitudesMode, setSolicitudesMode] = useState<
    "main" | "sucursales" | "databases"
  >("main");
  const [ciclicoMode, setCiclicoMode] = useState<
    "main" | "total" | "ubicacion" | "comex"
  >("main");

  const config = getInventariosConfig(
    companyCode || "EMPRESA",
    t,
    () => setShowRecepcionModal(true),
    () => setShowEntradasModal(true),
    () => setShowSalidasModal(true),
    () => setShowCiclicoModal(true),
    () => setShowTraspasoModal(true),
    () => setShowAplicarModal(true),
    () => setShowSolicitudesModal(true),
    () => router.push("/(main)/inventarios/asignados" as any),
  );

  interface ModalOption {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    route?: string;
    onPress?: () => void;
  }

  const recepcionOptions: ModalOption[] = [
    {
      id: "manual",
      title: t("Recepción Manual"),
      subtitle: "Captura manual de productos",
      icon: "create-outline" as const,
      color: "#c73030",
      route: "/(main)/inventarios/recepcion/crear",
    },
    {
      id: "xml",
      title: t("Recepción XML"),
      subtitle: "Importar desde archivo XML",
      icon: "document-text-outline" as const,
      color: "#3B82F6",
      route: "/(main)/inventarios/recepcion?tipo=xml",
    },
    {
      id: "excel",
      title: t("Recepción Excel"),
      subtitle: "Importar desde archivo excel",
      icon: "document-text-outline" as const,
      color: "#079207",
      route: "/(main)/inventarios/recepcion?tipo=excel",
    },
  ];

  const entradasOptions: ModalOption[] = [
    {
      id: "nueva-entrada",
      title: t("inventory.newEntry"),
      subtitle: "Registrar nuevo ingreso",
      icon: "add-circle-outline" as const,
      color: "#22C55E",
      route: "/(main)/inventarios/entradas/crear",
    },
    {
      id: "historial-entradas",
      title: "Historial",
      subtitle: "Ver todas las entradas",
      icon: "time-outline" as const,
      color: "#15803d",
      route: "/(main)/inventarios/entradas",
    },
  ];

  const salidasOptions: ModalOption[] = [
    {
      id: "nueva-salida",
      title: "Crear Salida",
      subtitle: "Registrar nueva salida",
      icon: "add-circle-outline" as const,
      color: "#EF4444",
      route: "/(main)/inventarios/salidas/crear",
    },
    {
      id: "historial-salidas",
      title: "Historial",
      subtitle: "Ver todas las salidas",
      icon: "time-outline" as const,
      color: "#b91c1c",
      route: "/(main)/inventarios/salidas",
    },
  ];

  const ciclicoOptions: ModalOption[] = [
    {
      id: "conteo-total-main",
      title: "Cíclico",
      subtitle: t("inventory.totalCountSubtitle"),
      icon: "list-outline" as const,
      color: "#F59E0B",
      onPress: () => setCiclicoMode("total"),
    },
    {
      id: "conteo-ubicacion-main",
      title: "Por Ubicación",
      subtitle: t("inventory.locationCountSubtitle"),
      icon: "location-outline" as const,
      color: "#EC4899",
      onPress: () => setCiclicoMode("ubicacion"),
    },
    {
      id: "cider-comex-main",
      title: "Comex",
      subtitle: t("inventory.ciderComexSubtitle"),
      icon: "globe-outline" as const,
      color: "#06B6D4",
      onPress: () => setCiclicoMode("comex"),
    },
  ];

  const ciclicoTotalOptions: ModalOption[] = [
    {
      id: "nuevo-ciclico",
      title: "Crear Conteo",
      subtitle: "Registrar nuevo ciclo",
      icon: "add-circle-outline" as const,
      color: "#F59E0B",
      route: "/(main)/inventarios/conteo/crear-conteo",
    },
    {
      id: "historial-ciclico",
      title: "Historial",
      subtitle: "Ver conteos realizados",
      icon: "time-outline" as const,
      color: "#D97706",
      route: "/(main)/inventarios/conteo/total",
    },
  ];

  const ciclicoUbicacionOptions: ModalOption[] = [
    {
      id: "nuevo-ubicacion",
      title: "Crear por Ubicación",
      subtitle: "Conteo automático por zona",
      icon: "add-circle-outline" as const,
      color: "#6366F1",
      route: "/(main)/inventarios/conteo/conteo-ubicacion",
    },
    {
      id: "historial-ubicacion",
      title: "Historial",
      subtitle: "Ver conteos por ubicación",
      icon: "time-outline" as const,
      color: "#4F46E5",
      route: "/(main)/inventarios/conteo/total",
    },
  ];

  const ciclicoComexOptions: ModalOption[] = [
    {
      id: "nuevo-comex",
      title: "Crear Comex",
      subtitle: "Registrar nuevo comex",
      icon: "add-circle-outline" as const,
      color: "#06B6D4",
      route: "/(main)/inventarios/conteo/comex/crear",
    },
    {
      id: "historial-comex",
      title: "Historial",
      subtitle: "Ver historial comex",
      icon: "time-outline" as const,
      color: "#0891B2",
      route: "/(main)/inventarios/conteo/comex",
    },
  ];

  const traspasoOptions: ModalOption[] = [
    {
      id: "traspaso-bd",
      title: "Bases de datos",
      subtitle: "Traspaso entre bases de datos",
      icon: "server-outline" as const,
      color: "#8B5CF6",
      onPress: () => setTraspasoMode("databases"),
    },
    {
      id: "traspaso-sucursales",
      title: "Sucursales",
      subtitle: "Traspaso entre sucursales",
      icon: "storefront-outline" as const,
      color: "#6366F1",
      onPress: () => setTraspasoMode("sucursales"),
    },
  ];

  const traspasoBDOptions: ModalOption[] = [
    {
      id: "nuevo-traspaso-bd",
      title: "Crear Traspaso",
      subtitle: "Nueva transferencia DB",
      icon: "add-circle-outline" as const,
      color: "#8B5CF6",
      route: "/(main)/inventarios/traspaso/bases-datos/crear",
    },
    {
      id: "historial-traspaso-bd",
      title: "Historial",
      subtitle: "Ver historial DB",
      icon: "time-outline" as const,
      color: "#7C3AED",
      route: "/(main)/inventarios/traspaso/bases-datos",
    },
  ];

  const traspasoSucursalesOptions: ModalOption[] = [
    {
      id: "nuevo-traspaso-sucursal",
      title: "Crear Traspaso",
      subtitle: "Registrar nueva transferencia",
      icon: "add-circle-outline" as const,
      color: "#6366F1",
      route: "/(main)/inventarios/traspaso/sucursales/crear",
    },
    {
      id: "historial-traspaso-sucursal",
      title: "Historial",
      subtitle: "Ver traspasos realizados",
      icon: "time-outline" as const,
      color: "#4338CA",
      route: "/(main)/inventarios/traspaso/sucursales",
    },
  ];

  const solicitudesOptions: ModalOption[] = [
    {
      id: "solicitudes-bd",
      title: "Bases de datos",
      subtitle: "Peticiones entre bases de datos",
      icon: "server-outline" as const,
      color: "#F97316",
      onPress: () => setSolicitudesMode("databases"),
    },
    {
      id: "solicitudes-sucursales",
      title: "Sucursales",
      subtitle: "Peticiones entre sucursales",
      icon: "storefront-outline" as const,
      color: "#FB923C",
      onPress: () => setSolicitudesMode("sucursales"),
    },
  ];

  const solicitudesBDOptions: ModalOption[] = [
    {
      id: "nueva-solicitud-bd",
      title: "Crear Solicitud",
      subtitle: "Nueva petición DB",
      icon: "add-circle-outline" as const,
      color: "#F97316",
      route: "/(main)/inventarios/solicitudes/bases-datos/crear",
    },
    {
      id: "historial-solicitud-bd",
      title: "Historial",
      subtitle: "Ver historial peticiones DB",
      icon: "time-outline" as const,
      color: "#EA580C",
      route: "/(main)/inventarios/solicitudes/bases-datos",
    },
  ];

  const solicitudesSucursalesOptions: ModalOption[] = [
    {
      id: "nueva-solicitud-sucursal",
      title: "Crear Solicitud",
      subtitle: "Nueva petición sucursal",
      icon: "add-circle-outline" as const,
      color: "#FB923C",
      route: "/(main)/inventarios/solicitudes/sucursales/crear",
    },
    {
      id: "historial-solicitud-sucursal",
      title: "Historial",
      subtitle: "Ver peticiones realizadas",
      icon: "time-outline" as const,
      color: "#F97316",
      route: "/(main)/inventarios/solicitudes/sucursales",
    },
  ];

  const aplicarOptions: ModalOption[] = [
    {
      id: "aplicar-ciclico",
      title: "Cíclico",
      subtitle: "Aplicar conteo cíclico",
      icon: "repeat-outline" as const,
      color: "#F59E0B",
      route: "/(main)/inventarios/aplicar?tipo=ciclico",
    },
    {
      id: "aplicar-total",
      title: "Total",
      subtitle: "Aplicar inventario total",
      icon: "list-outline" as const,
      color: "#10B981",
      route: "/(main)/inventarios/aplicar?tipo=total",
    },
    {
      id: "aplicar-comex",
      title: "Comex",
      subtitle: "Aplicar inventario comex",
      icon: "globe-outline" as const,
      color: "#06B6D4",
      route: "/(main)/inventarios/aplicar/comex",
    },
  ];

  return (
    <>
      <ModuleScreen config={config} />

      {/* Modal de opciones de recepción */}
      <Modal
        visible={showRecepcionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecepcionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRecepcionModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.modalIcon, { backgroundColor: "#3B82F620" }]}
              >
                <Ionicons name="cube-outline" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Recepción
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                Selecciona el tipo de recepción
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {recepcionOptions.map((option) => (
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
                    setShowRecepcionModal(false);
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowRecepcionModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Entradas */}
      <Modal
        visible={showEntradasModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEntradasModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEntradasModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.modalIcon, { backgroundColor: "#22C55E20" }]}
              >
                <Ionicons name="arrow-down-outline" size={24} color="#22C55E" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Entradas
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                ¿Qué deseas hacer?
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {entradasOptions.map((option) => (
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
                    setShowEntradasModal(false);
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowEntradasModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Salidas */}
      <Modal
        visible={showSalidasModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSalidasModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSalidasModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.modalIcon, { backgroundColor: "#EF444420" }]}
              >
                <Ionicons name="arrow-up-outline" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Salidas
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                ¿Qué deseas hacer?
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {salidasOptions.map((option) => (
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
                    setShowSalidasModal(false);
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowSalidasModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Cíclico */}
      <Modal
        visible={showCiclicoModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCiclicoModal(false);
          setCiclicoMode("main");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCiclicoModal(false);
            setCiclicoMode("main");
          }}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              {ciclicoMode !== "main" && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setCiclicoMode("main")}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              <View
                style={[styles.modalIcon, { backgroundColor: "#F59E0B20" }]}
              >
                <Ionicons
                  name={
                    ciclicoMode === "main"
                      ? "clipboard-outline"
                      : ciclicoMode === "total"
                        ? "list-outline"
                        : ciclicoMode === "ubicacion"
                          ? "location-outline"
                          : "globe-outline"
                  }
                  size={24}
                  color={
                    ciclicoMode === "ubicacion"
                      ? "#EC4899"
                      : ciclicoMode === "comex"
                        ? "#06B6D4"
                        : "#F59E0B"
                  }
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {ciclicoMode === "main"
                  ? "Cíclico"
                  : ciclicoMode === "total"
                    ? "Cíclico"
                    : ciclicoMode === "ubicacion"
                      ? "Por Ubicación"
                      : "Comex"}
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                {ciclicoMode === "main"
                  ? "Selecciona la opción"
                  : "¿Qué deseas hacer?"}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {(ciclicoMode === "main"
                ? ciclicoOptions
                : ciclicoMode === "total"
                  ? ciclicoTotalOptions
                  : ciclicoMode === "ubicacion"
                    ? ciclicoUbicacionOptions
                    : ciclicoComexOptions
              ).map((option) => (
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
                    if (option.onPress) {
                      option.onPress();
                    } else if (option.route) {
                      setShowCiclicoModal(false);
                      setCiclicoMode("main");
                      router.push(option.route as any);
                    }
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowCiclicoModal(false);
                setCiclicoMode("main");
              }}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Traspaso */}
      <Modal
        visible={showTraspasoModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTraspasoModal(false);
          setTraspasoMode("main");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowTraspasoModal(false);
            setTraspasoMode("main");
          }}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              {traspasoMode !== "main" && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setTraspasoMode("main")}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              <View
                style={[
                  styles.modalIcon,
                  {
                    backgroundColor:
                      traspasoMode === "main"
                        ? "#8B5CF620"
                        : traspasoMode === "databases"
                          ? "#8B5CF620"
                          : "#6366F120",
                  },
                ]}
              >
                <Ionicons
                  name={
                    traspasoMode === "main"
                      ? "swap-horizontal-outline"
                      : traspasoMode === "databases"
                        ? "server-outline"
                        : "storefront-outline"
                  }
                  size={24}
                  color={
                    traspasoMode === "main"
                      ? "#8B5CF6"
                      : traspasoMode === "databases"
                        ? "#8B5CF6"
                        : "#6366F1"
                  }
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {traspasoMode === "main"
                  ? "Traspaso"
                  : traspasoMode === "databases"
                    ? "Bases de Datos"
                    : "Sucursales"}
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                {traspasoMode === "main"
                  ? "Selecciona el tipo de traspaso"
                  : "¿Qué deseas hacer?"}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {(traspasoMode === "main"
                ? traspasoOptions
                : traspasoMode === "databases"
                  ? traspasoBDOptions
                  : traspasoSucursalesOptions
              ).map((option) => (
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
                    if (option.onPress) {
                      option.onPress();
                    } else if (option.route) {
                      setShowTraspasoModal(false);
                      setTraspasoMode("main");
                      router.push(option.route as any);
                    }
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowTraspasoModal(false);
                setTraspasoMode("main");
              }}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Aplicar */}
      <Modal
        visible={showAplicarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAplicarModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAplicarModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View
                style={[styles.modalIcon, { backgroundColor: "#10B98120" }]}
              >
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={24}
                  color="#10B981"
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Aplicar
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                Selecciona qué aplicar
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {aplicarOptions.map((option) => (
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
                    setShowAplicarModal(false);
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowAplicarModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de opciones de Solicitudes */}
      <Modal
        visible={showSolicitudesModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSolicitudesModal(false);
          setSolicitudesMode("main");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowSolicitudesModal(false);
            setSolicitudesMode("main");
          }}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              {solicitudesMode !== "main" && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setSolicitudesMode("main")}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              <View
                style={[styles.modalIcon, { backgroundColor: "#F9731620" }]}
              >
                <Ionicons
                  name={
                    solicitudesMode === "main"
                      ? "document-text-outline"
                      : solicitudesMode === "databases"
                        ? "server-outline"
                        : "storefront-outline"
                  }
                  size={24}
                  color="#F97316"
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {solicitudesMode === "main"
                  ? "Solicitudes"
                  : solicitudesMode === "databases"
                    ? "Bases de Datos"
                    : "Sucursales"}
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                {solicitudesMode === "main"
                  ? "Selecciona el tipo de solicitud"
                  : "¿Qué deseas hacer?"}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              {(solicitudesMode === "main"
                ? solicitudesOptions
                : solicitudesMode === "databases"
                  ? solicitudesBDOptions
                  : solicitudesSucursalesOptions
              ).map((option) => (
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
                    if (option.onPress) {
                      option.onPress();
                    } else if (option.route) {
                      setShowSolicitudesModal(false);
                      setSolicitudesMode("main");
                      router.push(option.route as any);
                    }
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

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowSolicitudesModal(false);
                setSolicitudesMode("main");
              }}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: 20,
    padding: 8,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
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
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === "ios" ? 16 : 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
