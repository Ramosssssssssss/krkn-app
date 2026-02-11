import ModuleScreen, { ModuleScreenConfig } from "@/components/module-screen";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { useSucursalesAlmacenes } from "@/hooks/use-sucursales-almacenes";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// Contraseñas por sucursal
const SUCURSAL_PASSWORDS: Record<string, string> = {
  TOTOLCINGO: "Ventanilla&25",
  TEPEXPAN: "Tpx$68",
  TEXCOCO: "Txc%56",
  "VIA MORELOS": "VM#27",
  VALLEJO: "Vj*99",
};

// Sucursales permitidas
const ALLOWED_BRANCHES = [
  "TEPEXPAN",
  "VIA MORELOS",
  "VALLEJO",
  "TEXCOCO",
  "TOTOLCINGO",
];

// Colores para las sucursales
const SUCURSAL_COLORS: Record<string, string> = {
  TOTOLCINGO: "#9D4EDD",
  TEPEXPAN: "#00B4D8",
  TEXCOCO: "#F77F00",
  "VIA MORELOS": "#06D6A0",
  VALLEJO: "#EF476F",
};

interface Sucursal {
  id: number;
  nombre: string;
}

export default function AduanaIndexScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();

  // Hook para sucursales y almacenes
  const {
    sucursales: allSucursales,
    almacenes: allAlmacenes,
    isLoading,
    error,
    refresh,
  } = useSucursalesAlmacenes();

  // Filtrar sucursales permitidas
  const sucursales = allSucursales.filter((s) =>
    ALLOWED_BRANCHES.some((allowed) =>
      s.nombre.toUpperCase().includes(allowed),
    ),
  );

  // Función para obtener el almacén de una sucursal
  const getAlmacenForSucursal = (sucursalId: number): number | null => {
    const almacen = allAlmacenes.find((a) => a.sucursalId === sucursalId);
    return almacen?.id ?? null;
  };

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [step, setStep] = useState<"select" | "password">("select");

  const openRecepcionModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsModalVisible(true);
    setStep("select");
    setSelectedSucursal(null);
    setPassword("");
    setShowPassword(false);

    // Refrescar si hay error
    if (error) {
      refresh();
    }
  };

  const handleSelectSucursal = (sucursal: Sucursal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSucursal(sucursal);
    setStep("password");
    setPassword("");
    setShowPassword(false);
  };

  const handleBack = () => {
    setStep("select");
    setSelectedSucursal(null);
    setPassword("");
  };

  const validatePassword = () => {
    if (!selectedSucursal) return;

    setIsValidating(true);
    Keyboard.dismiss();

    // Buscar la contraseña correcta
    const sucursalKey = ALLOWED_BRANCHES.find((b) =>
      selectedSucursal.nombre.toUpperCase().includes(b),
    );
    const correctPassword = sucursalKey
      ? SUCURSAL_PASSWORDS[sucursalKey]
      : null;

    setTimeout(() => {
      if (password === correctPassword) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsModalVisible(false);
        setIsValidating(false);

        // Obtener el almacén correspondiente a la sucursal
        const almacenId = getAlmacenForSucursal(selectedSucursal.id);

        // Navegar a recibo con la sucursal y almacén seleccionados
        router.push({
          pathname: "/(main)/aduana/recibo",
          params: {
            sucursalId: selectedSucursal.id.toString(),
            sucursalNombre: selectedSucursal.nombre,
            almacenId: almacenId?.toString() || "",
          },
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsValidating(false);
        Alert.alert("Error", "Contraseña incorrecta");
        setPassword("");
      }
    }, 500);
  };

  const getSucursalColor = (nombre: string): string => {
    const key = ALLOWED_BRANCHES.find((b) => nombre.toUpperCase().includes(b));
    return key ? SUCURSAL_COLORS[key] : colors.accent;
  };

  const aduanaConfig: ModuleScreenConfig = {
    headerIcon: "airplane-outline",
    headerTitle: "Aduana",
    headerSubtitle: "Gestión de comercio exterior",
    stats: [
      { value: "0", label: "Recibos", sublabel: "hoy" },
      { value: "0", label: "Pendientes" },
    ],
    sectionLabel: "MÓDULOS",
    groups: [
      {
        id: "recepcion-sucursales",
        title: "RECEPCIÓN DE SUCURSALES",
        icon: "business-outline",
        color: "#9D4EDD",
        onPress: openRecepcionModal, // Abre modal en lugar de navegar
        modules: [],
      },
    ],
  };

  return (
    <>
      <ModuleScreen config={aduanaConfig} />

      {/* Modal de Recepción */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: colors.surface },
                ]}
              >
                {/* Header del Modal */}
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  {step === "password" ? (
                    <TouchableOpacity
                      style={[
                        styles.headerBackBtn,
                        { backgroundColor: colors.background },
                      ]}
                      onPress={handleBack}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.modalIcon,
                        { backgroundColor: "#9D4EDD20" },
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={28}
                        color="#9D4EDD"
                      />
                    </View>
                  )}
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {step === "select"
                      ? "Recepción de Sucursales"
                      : selectedSucursal?.nombre}
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {step === "select"
                      ? "Selecciona tu sucursal"
                      : "Ingresa la contraseña"}
                  </Text>
                </View>

                {/* Contenido */}
                {step === "select" ? (
                  <View style={styles.optionsContainer}>
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text
                          style={[
                            styles.loadingText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Cargando...
                        </Text>
                      </View>
                    ) : error ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={40}
                          color={colors.error}
                        />
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {error}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.retryBtn,
                            { backgroundColor: colors.accent },
                          ]}
                          onPress={refresh}
                        >
                          <Text style={styles.retryBtnText}>Reintentar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : sucursales.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons
                          name="business-outline"
                          size={40}
                          color={colors.textTertiary}
                        />
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          No hay sucursales
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10 }}
                      >
                        {sucursales.map((sucursal) => {
                          const sucColor = getSucursalColor(sucursal.nombre);
                          return (
                            <TouchableOpacity
                              key={sucursal.id}
                              style={[
                                styles.optionCard,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                },
                              ]}
                              onPress={() => handleSelectSucursal(sucursal)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.optionIcon,
                                  { backgroundColor: sucColor + "20" },
                                ]}
                              >
                                <Ionicons
                                  name="business"
                                  size={24}
                                  color={sucColor}
                                />
                              </View>
                              <View style={styles.optionText}>
                                <Text
                                  style={[
                                    styles.optionTitle,
                                    { color: colors.text },
                                  ]}
                                >
                                  {sucursal.nombre}
                                </Text>
                                <Text
                                  style={[
                                    styles.optionSubtitle,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Toca para entrar
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={colors.textTertiary}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  // Input de contraseña
                  <View style={styles.passwordContainer}>
                    <View
                      style={[
                        styles.passwordIconWrapper,
                        {
                          backgroundColor:
                            getSucursalColor(selectedSucursal?.nombre || "") +
                            "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={32}
                        color={getSucursalColor(selectedSucursal?.nombre || "")}
                      />
                    </View>

                    <View
                      style={[
                        styles.passwordInputWrapper,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="key-outline"
                        size={20}
                        color={colors.textTertiary}
                      />
                      <TextInput
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textTertiary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onSubmitEditing={validatePassword}
                        returnKeyType="go"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.enterBtn,
                        {
                          backgroundColor: getSucursalColor(
                            selectedSucursal?.nombre || "",
                          ),
                          opacity:
                            password.length === 0 || isValidating ? 0.5 : 1,
                        },
                      ]}
                      onPress={validatePassword}
                      disabled={password.length === 0 || isValidating}
                    >
                      {isValidating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="enter-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.enterBtnText}>Entrar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "90%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  optionsContainer: {
    padding: 16,
  },
  scrollContent: {
    maxHeight: 450,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
  passwordContainer: {
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  passwordIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    width: "100%",
    gap: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    width: "100%",
    borderRadius: 12,
    gap: 8,
  },
  enterBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
