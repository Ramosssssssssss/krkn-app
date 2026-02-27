import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const SLIDE_INTERVAL = 6000; // 6s per slide

// ─── Tips, consejos y datos curiosos ─────────────────────────
type SlideCategory =
  | "tip"
  | "shortcut"
  | "fact"
  | "warning"
  | "feature"
  | "trivia";

interface Slide {
  category: SlideCategory;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_CONFIG: Record<
  SlideCategory,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  tip: { label: "CONSEJO", color: "#38BDF8", icon: "bulb" },
  shortcut: { label: "ATAJO", color: "#34D399", icon: "flash" },
  fact: { label: "¿SABÍAS QUE?", color: "#FB923C", icon: "help-circle" },
  warning: { label: "IMPORTANTE", color: "#F87171", icon: "warning" },
  feature: { label: "FUNCIÓN", color: "#A78BFA", icon: "star" },
  trivia: { label: "DATO CURIOSO", color: "#FBBF24", icon: "sparkles" },
};

const SLIDES: Slide[] = [
  // Tips de uso
  {
    category: "tip",
    title: "Escaneo rápido",
    body: "En cualquier pantalla de escaneo, puedes usar la cámara o escribir el código manualmente tocando el campo de texto.",
    icon: "scan-outline",
  },
  {
    category: "tip",
    title: "Busca más rápido",
    body: "Usa el buscador en la parte superior de las listas. Busca por nombre, código o descripción.",
    icon: "search-outline",
  },
  {
    category: "tip",
    title: "Desliza para más opciones",
    body: "En algunas listas puedes deslizar un elemento hacia la izquierda para ver acciones rápidas como editar o eliminar.",
    icon: "swap-horizontal-outline",
  },
  {
    category: "tip",
    title: "Modo oscuro",
    body: "Cambia entre modo claro y oscuro desde el botón de sol/luna en la barra superior. ¡Tus ojos lo agradecerán!",
    icon: "moon-outline",
  },
  {
    category: "tip",
    title: "Arrastra para refrescar",
    body: "En cualquier lista, jala hacia abajo para actualizar los datos. Los cambios más recientes se cargarán automáticamente.",
    icon: "refresh-outline",
  },

  // Shortcuts
  {
    category: "shortcut",
    title: "Acceso directo al perfil",
    body: "Toca tu avatar en la esquina superior derecha para acceder rápidamente a tu perfil o cerrar sesión.",
    icon: "person-circle-outline",
  },
  {
    category: "shortcut",
    title: "Menú lateral",
    body: "Toca el ícono de menú ☰ para navegar rápidamente entre todos los módulos de la aplicación.",
    icon: "menu-outline",
  },
  {
    category: "shortcut",
    title: "Conteo express",
    body: "En conteo cíclico, escanea continuamente sin pausas. El sistema registra cada artículo al instante.",
    icon: "barcode-outline",
  },

  // Datos curiosos
  {
    category: "fact",
    title: "Inventario promedio",
    body: "Las empresas que hacen conteos cíclicos regulares reducen sus discrepancias de inventario hasta en un 65%.",
    icon: "trending-down-outline",
  },
  {
    category: "fact",
    title: "Códigos de barras",
    body: "El primer producto escaneado con código de barras fue un paquete de chicles Wrigley's en 1974.",
    icon: "barcode-outline",
  },
  {
    category: "fact",
    title: "Errores de picking",
    body: "El error humano promedio en picking manual es del 1-3%. Con sistemas WMS se reduce a menos del 0.1%.",
    icon: "analytics-outline",
  },
  {
    category: "fact",
    title: "Eficiencia en almacén",
    body: "El 60% del tiempo de un operador de almacén se gasta caminando. Una buena organización de ubicaciones lo reduce a la mitad.",
    icon: "walk-outline",
  },

  // Warnings
  {
    category: "warning",
    title: "Guarda tus cambios",
    body: "Antes de salir de una pantalla de edición, asegúrate de guardar. Los borradores se mantienen temporalmente.",
    icon: "save-outline",
  },
  {
    category: "warning",
    title: "Conexión estable",
    body: "Para operaciones críticas como transferencias de inventario, asegúrate de tener una conexión estable a internet.",
    icon: "wifi-outline",
  },

  // Features
  {
    category: "feature",
    title: "Temas personalizados",
    body: "Puedes personalizar los colores de la app desde Configuración > Apariencia. Hay más de 9 temas disponibles.",
    icon: "color-palette-outline",
  },
  {
    category: "feature",
    title: "Face ID / Huella",
    body: "Activa la autenticación biométrica para iniciar sesión más rápido. Ve a Configuración > Seguridad.",
    icon: "finger-print-outline",
  },
  {
    category: "feature",
    title: "Notificaciones push",
    body: "Recibe alertas en tiempo real sobre transferencias, conteos asignados y más. Actívalas en configuración.",
    icon: "notifications-outline",
  },

  // Trivia
  {
    category: "trivia",
    title: "KRKN = Kraken",
    body: "El nombre KRKN viene del Kraken, el mítico monstruo marino. Porque nuestro sistema tiene tentáculos que llegan a todo.",
    icon: "water-outline",
  },
  {
    category: "trivia",
    title: "Amazon y los robots",
    body: "Amazon usa más de 750,000 robots en sus almacenes. Nosotros te damos herramientas para ser igual de eficiente.",
    icon: "hardware-chip-outline",
  },
  {
    category: "trivia",
    title: "El almacén más grande",
    body: "El almacén más grande del mundo es el de Boeing en Everett, WA. Tiene 399,000 m² — cabrían 75 campos de fútbol.",
    icon: "business-outline",
  },
];

// ─── Componente ───────────────────────────────────────────────

interface ScreenSaverProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ScreenSaver({ visible, onDismiss }: ScreenSaverProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffled, setShuffled] = useState<Slide[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated progress bar
  const progressWidth = useSharedValue(0);

  // Fade overlay
  const overlayOpacity = useSharedValue(0);

  // Shuffle slides on open
  useEffect(() => {
    if (visible) {
      const shuffledSlides = [...SLIDES].sort(() => Math.random() - 0.5);
      setShuffled(shuffledSlides);
      setCurrentIndex(0);
      overlayOpacity.value = withTiming(1, { duration: 500 });

      // Start progress bar
      progressWidth.value = 0;
      progressWidth.value = withTiming(1, {
        duration: SLIDE_INTERVAL,
        easing: Easing.linear,
      });

      // Cycle slides
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % shuffledSlides.length;
          // Reset progress bar
          progressWidth.value = 0;
          progressWidth.value = withTiming(1, {
            duration: SLIDE_INTERVAL,
            easing: Easing.linear,
          });
          return next;
        });
      }, SLIDE_INTERVAL);
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  // Subtle floating animation for the icon
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  // No vamos a regresar null directamente para permitir la animación de salida si se requiere (aunque está controlado por Modal),
  // pero usaremos visible en Modal.

  const slide = shuffled[currentIndex] || SLIDES[0];
  const catConfig = CATEGORY_CONFIG[slide.category];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.container, overlayStyle]}>
        {/* Background */}
        <View style={styles.background} />

        {/* Subtle grid pattern */}
        <View style={styles.gridOverlay}>
          {[...Array(6)].map((_, i) => (
            <View
              key={`h${i}`}
              style={[
                styles.gridLine,
                {
                  top: `${(i + 1) * 16}%`,
                  width: "100%",
                  height: 1,
                },
              ]}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <View
              key={`v${i}`}
              style={[
                styles.gridLine,
                {
                  left: `${(i + 1) * 25}%`,
                  height: "100%",
                  width: 1,
                },
              ]}
            />
          ))}
        </View>

        {/* Logo top-left */}
        <View style={styles.logoArea}>
          <Image
            source={require("@/assets/images/ggplay.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>KRKN</Text>
        </View>

        {/* Main content — centered */}
        <Animated.View
          key={currentIndex}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={styles.content}
        >
          {/* Category badge */}
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${catConfig.color}20` },
            ]}
          >
            <Ionicons name={catConfig.icon} size={12} color={catConfig.color} />
            <Text style={[styles.categoryText, { color: catConfig.color }]}>
              {catConfig.label}
            </Text>
          </View>

          {/* Floating icon */}
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: `${catConfig.color}15` },
              floatStyle,
            ]}
          >
            <Ionicons
              name={slide.icon as any}
              size={44}
              color={catConfig.color}
            />
          </Animated.View>

          {/* Title */}
          <Text style={styles.slideTitle}>{slide.title}</Text>

          {/* Body */}
          <Text style={styles.slideBody}>{slide.body}</Text>
        </Animated.View>

        {/* Bottom area */}
        <View style={styles.bottomArea}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: catConfig.color },
                progressStyle,
              ]}
            />
          </View>

          {/* Slide counter */}
          <View style={styles.bottomRow}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {shuffled.length || SLIDES.length}
            </Text>
            <Text style={styles.hintText}>Toca para continuar</Text>
          </View>
        </View>
      </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Estilos ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#08080F",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  logoArea: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    opacity: 0.7,
  },
  logoText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  slideBody: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    letterSpacing: 0.1,
  },
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 24,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  hintText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
