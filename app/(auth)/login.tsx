import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const FACE_ID_ENABLED_KEY = "@krkn_face_id_enabled";
const FACE_ID_CREDENTIALS_KEY = "@krkn_face_id_credentials";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDatabaseSelector, setShowDatabaseSelector] = useState(false);

  // Face ID states
  const [isFaceIdAvailable, setIsFaceIdAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "faceid" | "touchid" | "none"
  >("none");

  const {
    companyCode,
    company,
    databases,
    selectedDatabase,
    selectDatabase,
    login,
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Verificar Face ID al cargar
  useEffect(() => {
    checkFaceIdAvailability();
  }, [companyCode, selectedDatabase]);

  const checkFaceIdAvailability = async () => {
    // Solo para iOS (comentado para testing - descomenta para producción)
    // if (Platform.OS !== 'ios') {
    //   setIsFaceIdAvailable(false);
    //   return;
    // }

    try {
      // Verificar si Face ID está habilitado en configuración
      const faceIdEnabled = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);

      // Si Face ID está habilitado, mostrar el botón
      if (faceIdEnabled === "true") {
        // Verificar hardware biométrico (solo en iOS real)
        if (Platform.OS === "ios") {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();

          if (compatible && enrolled) {
            const types =
              await LocalAuthentication.supportedAuthenticationTypesAsync();

            if (
              types.includes(
                LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
              )
            ) {
              setBiometricType("faceid");
            } else if (
              types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
            ) {
              setBiometricType("touchid");
            }
          }
        } else {
          // Para testing en Android/Web, simular Face ID
          setBiometricType("faceid");
        }

        // Verificar si hay credenciales guardadas para esta empresa/database
        const savedCredentials = await AsyncStorage.getItem(
          FACE_ID_CREDENTIALS_KEY,
        );
        if (savedCredentials) {
          const creds = JSON.parse(savedCredentials);
          if (
            creds.companyCode === companyCode &&
            creds.databaseId === selectedDatabase?.id
          ) {
            setIsFaceIdAvailable(true);
            setHasSavedCredentials(true);
            return;
          }
        }

        // Aunque no hay credenciales, mostramos el botón si Face ID está habilitado
        // El primer login las guardará
        setIsFaceIdAvailable(true);
        setHasSavedCredentials(false);
      } else {
        setIsFaceIdAvailable(false);
        setHasSavedCredentials(false);
      }
    } catch (error) {
      console.error("Error checking Face ID:", error);
    }
  };

  const handleFaceIdLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          biometricType === "faceid"
            ? "Inicia sesión con Face ID"
            : "Inicia sesión con Touch ID",
        cancelLabel: "Cancelar",
        disableDeviceFallback: true,
        fallbackLabel: "",
      });

      if (result.success) {
        // Obtener credenciales guardadas
        const savedCredentials = await AsyncStorage.getItem(
          FACE_ID_CREDENTIALS_KEY,
        );
        if (savedCredentials) {
          const creds = JSON.parse(savedCredentials);

          setIsLoading(true);
          setError("");

          try {
            const response = await fetch(
              `https://app.krkn.mx/api/login.php?companyCode=${creds.companyCode}&databaseId=${creds.databaseId}&username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`,
              {
                method: "GET",
              },
            );

            const data = await response.json();

            if (data.ok) {
              await login(data.user, data.token, data.database);
              router.replace("/(main)");
            } else {
              setError("Sesión expirada. Ingresa manualmente.");
              // Limpiar credenciales guardadas si fallan
              await AsyncStorage.removeItem(FACE_ID_CREDENTIALS_KEY);
              setHasSavedCredentials(false);
            }
          } catch (e) {
            console.error("Error en login con Face ID:", e);
            setError("Error de conexión. Verifica tu internet.");
          }

          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Face ID error:", error);
      Alert.alert("Error", "No se pudo autenticar con Face ID");
    }
  };

  const saveCredentialsForFaceId = async (user: string, pass: string) => {
    try {
      const faceIdEnabled = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);
      if (faceIdEnabled === "true" && selectedDatabase) {
        await AsyncStorage.setItem(
          FACE_ID_CREDENTIALS_KEY,
          JSON.stringify({
            companyCode,
            databaseId: selectedDatabase.id,
            username: user,
            password: pass,
          }),
        );
      }
    } catch (error) {
      console.error("Error saving credentials for Face ID:", error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Completa todos los campos");
      return;
    }

    if (!selectedDatabase) {
      setError("Selecciona una base de datos");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://app.krkn.mx/api/login.php?companyCode=${companyCode}&databaseId=${selectedDatabase.id}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "GET",
        },
      );

      const data = await response.json();

      if (data.ok) {
        // Guardar credenciales para Face ID si está habilitado
        await saveCredentialsForFaceId(username, password);
        // Guardar usuario y token en el contexto
        await login(data.user, data.token, data.database);
        router.replace("/(main)");
      } else {
        setError(data.message || "Credenciales incorrectas");
      }
    } catch (e) {
      console.error("Error en login:", e);
      setError("Error de conexión. Verifica tu internet.");
    }

    setIsLoading(false);
  };

  const goBack = () => {
    router.replace("/(auth)/company-code");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.headerBtn,
            { backgroundColor: colors.inputBackground },
          ]}
          onPress={goBack}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.headerBtn,
            { backgroundColor: colors.inputBackground },
          ]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Company Initial */}
            <View
              style={[styles.initialContainer, { borderColor: colors.border }]}
            >
              <Text style={[styles.initialText, { color: colors.accent }]}>
                {companyCode?.charAt(0).toUpperCase() || "K"}
              </Text>
            </View>

            <Text style={[styles.companyName, { color: colors.text }]}>
              {companyCode?.toUpperCase() || "EMPRESA"}
            </Text>
            <Text
              style={[styles.companyDomain, { color: colors.textTertiary }]}
            >
              {companyCode}.krkn.mx
            </Text>

            <View style={styles.dividerLine}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* Database Selector */}
            {databases && databases.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.databaseSelector,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selectedDatabase
                      ? colors.accent
                      : colors.border,
                  },
                ]}
                onPress={() => setShowDatabaseSelector(true)}
              >
                <View style={styles.databaseInfo}>
                  <Ionicons
                    name="server-outline"
                    size={20}
                    color={
                      selectedDatabase ? colors.accent : colors.textTertiary
                    }
                  />
                  <View style={styles.databaseText}>
                    <Text
                      style={[
                        styles.databaseLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      Base de datos
                    </Text>
                    <Text style={[styles.databaseName, { color: colors.text }]}>
                      {selectedDatabase
                        ? selectedDatabase.nombre
                        : "Selecciona una base de datos"}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}

            <Text style={[styles.title, { color: colors.text }]}>
              Bienvenido
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa tus credenciales
            </Text>

            {/* Card */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {/* Glow line */}
              <LinearGradient
                colors={["transparent", `${colors.accent}60`, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardGlow}
              />

              {/* Username */}
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor:
                      focusedField === "username"
                        ? colors.accent
                        : error && !username.trim()
                          ? "#EF4444"
                          : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Usuario"
                  placeholderTextColor={colors.textTertiary}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text.toUpperCase());
                    setError("");
                  }}
                  autoCapitalize="characters"
                  editable={!isLoading}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor:
                      focusedField === "password"
                        ? colors.accent
                        : error && !password.trim()
                          ? "#EF4444"
                          : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text.toUpperCase());
                    setError("");
                  }}
                  autoCapitalize="characters"
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.accent }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.btn,
                  (!username.trim() || !password.trim() || isLoading) &&
                    styles.btnDisabled,
                ]}
                onPress={handleLogin}
                disabled={!username.trim() || !password.trim() || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    !username.trim() || !password.trim() || isLoading
                      ? [
                          isDark ? "#1C1326" : "#E5E5E5",
                          isDark ? "#1C1326" : "#E5E5E5",
                        ]
                      : [colors.accent, colors.accent]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.btnText,
                          {
                            color:
                              !username.trim() || !password.trim()
                                ? colors.textTertiary
                                : "#fff",
                          },
                        ]}
                      >
                        Entrar
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={
                          !username.trim() || !password.trim()
                            ? colors.textTertiary
                            : "#fff"
                        }
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Face ID Button */}
              {isFaceIdAvailable && (
                <>
                  <View style={styles.dividerWithText}>
                    <View
                      style={[
                        styles.dividerLineSmall,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      o
                    </Text>
                    <View
                      style={[
                        styles.dividerLineSmall,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.faceIdBtn,
                      {
                        backgroundColor: hasSavedCredentials
                          ? colors.inputBackground
                          : `${colors.accent}10`,
                        borderColor: hasSavedCredentials
                          ? colors.border
                          : colors.accent,
                      },
                    ]}
                    onPress={
                      hasSavedCredentials
                        ? handleFaceIdLogin
                        : () =>
                            Alert.alert(
                              biometricType === "faceid"
                                ? "Face ID"
                                : "Touch ID",
                              "Inicia sesión una vez con tu usuario y contraseña para activar el acceso rápido.",
                              [{ text: "Entendido" }],
                            )
                    }
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        biometricType === "faceid"
                          ? "scan-outline"
                          : "finger-print-outline"
                      }
                      size={24}
                      color={colors.accent}
                    />
                    <Text style={[styles.faceIdText, { color: colors.text }]}>
                      {biometricType === "faceid"
                        ? "Usar Face ID"
                        : "Usar Touch ID"}
                    </Text>
                    {!hasSavedCredentials && (
                      <View
                        style={[
                          styles.faceIdBadge,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Text style={styles.faceIdBadgeText}>Nuevo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        © 2026 KRKN Systems
      </Text>

      {/* Database Selector Modal */}
      {showDatabaseSelector && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatabaseSelector(false)}
          />
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Selecciona una base de datos
              </Text>
              <TouchableOpacity onPress={() => setShowDatabaseSelector(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.databaseList}>
              {databases.map((db) => (
                <TouchableOpacity
                  key={db.id}
                  style={[
                    styles.databaseItem,
                    {
                      backgroundColor:
                        selectedDatabase?.id === db.id
                          ? `${colors.accent}15`
                          : colors.inputBackground,
                      borderColor:
                        selectedDatabase?.id === db.id
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    selectDatabase(db);
                    setShowDatabaseSelector(false);
                  }}
                >
                  <View style={styles.databaseItemContent}>
                    <Ionicons
                      name={
                        selectedDatabase?.id === db.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={22}
                      color={
                        selectedDatabase?.id === db.id
                          ? colors.accent
                          : colors.textTertiary
                      }
                    />
                    <View style={styles.databaseItemText}>
                      <Text style={[styles.dbName, { color: colors.text }]}>
                        {db.nombre}
                      </Text>
                      <Text
                        style={[
                          styles.dbServer,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {db.ip_servidor}:{db.puerto_bd}
                      </Text>
                    </View>
                  </View>
                  {selectedDatabase?.id === db.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 80,
  },
  content: {
    alignItems: "center",
  },
  // Company Initial
  initialContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  initialText: {
    fontSize: 28,
    fontWeight: "700",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 4,
  },
  companyDomain: {
    fontSize: 12,
    marginBottom: 20,
  },
  dividerLine: {
    width: 40,
    marginBottom: 20,
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  // Card
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  // Input
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Button
  btn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  // Footer
  footer: {
    textAlign: "center",
    fontSize: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  // Database Selector
  databaseSelector: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  databaseInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  databaseText: {
    flex: 1,
  },
  databaseLabel: {
    fontSize: 11,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  databaseName: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  databaseList: {
    maxHeight: 400,
  },
  databaseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  databaseItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  databaseItemText: {
    flex: 1,
  },
  dbName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  dbServer: {
    fontSize: 12,
  },
  // Face ID Button
  dividerWithText: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  dividerLineSmall: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  faceIdBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  faceIdText: {
    fontSize: 15,
    fontWeight: "600",
  },
  faceIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  faceIdBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
