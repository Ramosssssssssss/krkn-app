import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FACE_ID_ENABLED_KEY = "@krkn_face_id_enabled";
const FACE_ID_CREDENTIALS_KEY = "@krkn_face_id_credentials";

const videoSource = require("@/assets/video.mp4");

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Face ID states
  const [isFaceIdAvailable, setIsFaceIdAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "faceid" | "touchid" | "none"
  >("none");

  const { companyCode, company, selectedDatabase, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();

  // Video player
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
      <StatusBar style="light" />

      {/* Video de fondo */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Overlay de blur */}
      <BlurView
        intensity={Platform.OS === "ios" ? 20 : 10}
        style={StyleSheet.absoluteFill}
        tint="dark"
      />

      {/* Overlay oscuro y gradiente */}
      <View style={styles.videoOverlay} />
      <LinearGradient
        colors={["rgba(8,5,13,0.6)", "rgba(13,9,18,0.8)", "rgba(8,5,13,0.9)"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: "rgba(255,255,255,0.7)" }]}>
            {companyCode?.toLowerCase()}.krkn.mx
          </Text>
          <TouchableOpacity
            onPress={toggleTheme}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Center content */}
        <Animated.View
          style={[
            styles.center,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Brand */}
          <Text style={[styles.brandLetter, { color: colors.accent }]}>
            {companyCode?.toUpperCase() || "KRKN"}
          </Text>
          <Text style={[styles.title, { color: "#FFFFFF" }]}>Bienvenido</Text>
          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.6)" }]}>
            Ingresa para continuar
          </Text>

          {/* Inputs - iOS grouped style */}
          <View
            style={[
              styles.inputGroup,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.inputRow,
                focusedField === "username" && {
                  backgroundColor: `${colors.accent}08`,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Usuario"
                placeholderTextColor={colors.textTertiary}
                value={username}
                onChangeText={(t) => {
                  setUsername(t.toUpperCase());
                  setError("");
                }}
                autoCapitalize="characters"
                editable={!isLoading}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
            <View
              style={[
                styles.inputRow,
                focusedField === "password" && {
                  backgroundColor: `${colors.accent}08`,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError("");
                }}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                editable={!isLoading}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor:
                  !username.trim() || !password.trim() || isLoading
                    ? isDark
                      ? "#1a1a2e"
                      : "#f0f0f5"
                    : colors.accent,
              },
            ]}
            onPress={handleLogin}
            disabled={!username.trim() || !password.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.btnInner}>
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
                  Continuar
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={
                    !username.trim() || !password.trim()
                      ? colors.textTertiary
                      : "#fff"
                  }
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Face ID */}
          {isFaceIdAvailable && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={
                hasSavedCredentials
                  ? handleFaceIdLogin
                  : () =>
                      Alert.alert(
                        biometricType === "faceid" ? "Face ID" : "Touch ID",
                        "Inicia sesión una vez para activar el acceso rápido.",
                        [{ text: "OK" }],
                      )
              }
              disabled={isLoading}
              activeOpacity={0.6}
            >
              <Ionicons
                name={
                  biometricType === "faceid"
                    ? "scan-outline"
                    : "finger-print-outline"
                }
                size={28}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Footer */}
        <Text style={[styles.footer, { color: "rgba(255,255,255,0.4)" }]}>
          KRKN · v1.1.2
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Video
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,5,13,0.4)",
  },
  flex: {
    flex: 1,
  },
  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  // Center
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  brandLetter: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 28,
  },
  // Inputs - iOS grouped
  inputGroup: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 14,
  },
  inputIcon: {
    width: 22,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  // Error
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },
  // Button
  btn: {
    width: "100%",
    maxWidth: 340,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // Biometric
  biometricBtn: {
    marginTop: 20,
    padding: 10,
  },
  // Footer
  footer: {
    textAlign: "center",
    fontSize: 11,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    letterSpacing: 0.5,
  },
});
