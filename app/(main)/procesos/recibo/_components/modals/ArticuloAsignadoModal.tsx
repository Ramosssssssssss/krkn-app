import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface ArticuloAsignadoModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  clave: string;
  caja: string;
  folio: string;
}

export function ArticuloAsignadoModal({
  visible,
  onClose,
  colors,
  clave,
  caja,
  folio,
}: ArticuloAsignadoModalProps) {
  const scale = useSharedValue(1);
  const scanInputRef = useRef<TextInput>(null);
  const [scannerText, setScannerText] = React.useState("");
  const processingRef = useRef(false);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.15, { duration: 200 }),
        withTiming(1, { duration: 200 }),
      );
      // Enfocar input para recibir escaneo
      setTimeout(() => scanInputRef.current?.focus(), 300);
      setScannerText("");
      processingRef.current = false;
    }
  }, [visible, scale]);

  // Manejar escaneo - si escanean la misma caja, cerrar modal
  const handleTextChange = (text: string) => {
    console.log("[ARTICULO-ASIGNADO] Input recibido:", JSON.stringify(text));

    // Si ya estamos procesando, ignorar
    if (processingRef.current) {
      console.log("[ARTICULO-ASIGNADO] Ignorando - ya procesando");
      return;
    }

    // Detectar Enter del scanner
    if (text.includes("\n") || text.includes("\r")) {
      const cleanText = text
        .replace(/[\n\r]/g, "")
        .trim()
        .toUpperCase();
      processingRef.current = true;
      setScannerText("");
      procesarCodigo(cleanText);
      setTimeout(() => {
        processingRef.current = false;
      }, 500);
      return;
    }

    // Si no hay Enter, detectar si el texto contiene la caja
    // El scanner puede no enviar Enter, así que procesamos directamente
    const cleanText = text.trim().toUpperCase();
    const cajaUpper = caja.toUpperCase().replace(/[\s\-_]/g, "");
    const cleanTextNormalized = cleanText.replace(/[\s\-_]/g, "");

    // Si el texto normalizado contiene la caja, procesar inmediatamente
    if (
      cleanTextNormalized.includes(cajaUpper) ||
      cajaUpper.includes(cleanTextNormalized)
    ) {
      console.log("[ARTICULO-ASIGNADO] Detectada caja sin Enter:", cleanText);
      processingRef.current = true;
      setScannerText("");
      procesarCodigo(cleanText);
      setTimeout(() => {
        processingRef.current = false;
      }, 500);
      return;
    }

    setScannerText(text);
  };

  // Procesar código escaneado
  const procesarCodigo = (texto: string) => {
    const cleanTextNormalized = texto.replace(/[\s\-_]/g, "");
    const cajaUpper = caja.toUpperCase().replace(/[\s\-_]/g, "");

    console.log(
      "[ARTICULO-ASIGNADO] Procesando:",
      cleanTextNormalized,
      "vs Caja:",
      cajaUpper,
    );

    // Comparar si es la misma caja (flexible)
    const esLaMismaCaja =
      cleanTextNormalized === cajaUpper ||
      cleanTextNormalized.includes(cajaUpper) ||
      cajaUpper.includes(cleanTextNormalized) ||
      cleanTextNormalized.endsWith(cajaUpper) ||
      cajaUpper.endsWith(cleanTextNormalized);

    console.log("[ARTICULO-ASIGNADO] ¿Es la misma caja?:", esLaMismaCaja);

    if (esLaMismaCaja) {
      // Es la misma caja, cerrar modal (como presionar "Siguiente")
      console.log("[ARTICULO-ASIGNADO] ¡Cerrando modal!");
      onClose();
    }
  };

  // También manejar onSubmitEditing por si acaso
  const handleSubmit = () => {
    const cleanText = scannerText
      .trim()
      .toUpperCase()
      .replace(/[\s\-_]/g, "");
    const cajaUpper = caja.toUpperCase().replace(/[\s\-_]/g, "");

    console.log(
      "[ARTICULO-ASIGNADO] Submit - Escaneado:",
      cleanText,
      "vs Caja:",
      cajaUpper,
    );

    if (
      cleanText &&
      (cleanText === cajaUpper ||
        cleanText.includes(cajaUpper) ||
        cajaUpper.includes(cleanText))
    ) {
      console.log("[ARTICULO-ASIGNADO] Submit - ¡Cerrando modal!");
      onClose();
    }
    setScannerText("");
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => scanInputRef.current?.focus()}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => scanInputRef.current?.focus()}
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Input oculto para recibir escaneo de la caja */}
          <TextInput
            ref={scanInputRef}
            style={styles.hiddenInput}
            value={scannerText}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSubmit}
            autoCapitalize="characters"
            autoCorrect={false}
            blurOnSubmit={false}
            showSoftInputOnFocus={false}
            autoFocus={true}
            onBlur={() => {
              // Re-enfocar si pierde el foco
              if (visible) {
                setTimeout(() => scanInputRef.current?.focus(), 100);
              }
            }}
          />

          {/* Icono de éxito animado */}
          <Animated.View style={[styles.iconContainer, animatedStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="cube" size={50} color="#fff" />
            </View>
          </Animated.View>

          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            ¡Artículo Asignado!
          </Text>

          {/* Subtítulo */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            El artículo fue asignado a la caja del pedido
          </Text>

          {/* Info del artículo */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#8B5CF620" }]}>
                <Ionicons name="barcode" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Artículo
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {clave}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#3B82F620" }]}>
                <Ionicons name="cube-outline" size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Caja Asignada
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {caja}
                </Text>
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: "#F5920B20" }]}>
                <Ionicons name="document-text" size={20} color="#F5920B" />
              </View>
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Pedido
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {folio}
                </Text>
              </View>
            </View>
          </View>

          {/* Mensaje */}
          <View style={styles.messageContainer}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textTertiary}
            />
            <Text style={[styles.messageText, { color: colors.textTertiary }]}>
              Continúa escaneando para completar el pedido
            </Text>
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#3B82F6" }]}
            onPress={onClose}
          >
            <Ionicons name="scan" size={24} color="#fff" />
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: width - 48,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  hiddenInput: {
    position: "absolute",
    top: -100,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  infoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  messageText: {
    fontSize: 12,
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
