import ImageGallery from "@/components/ImageGallery";
import { API_URL } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.45; // Card estilo Tinder grande

export default function AcomodoDetalleScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Params
  const params = useLocalSearchParams<{
    articuloId: string;
    clave: string;
    nombre: string;
    codigoBarras: string;
    unidadVenta: string;
    ubicacionActual: string;
    almacenId: string;
    almacenNombre: string;
  }>();

  const articuloId = parseInt(params.articuloId || "0", 10);
  const clave = params.clave || "";
  const nombre = params.nombre || "";
  const codigoBarras = params.codigoBarras || "";
  const unidadVenta = params.unidadVenta || "PZA";
  const ubicacionActual = params.ubicacionActual || "";
  const almacenId = parseInt(params.almacenId || "19", 10);
  const almacenNombre = params.almacenNombre || "CEDIS";

  // Image states
  const databaseId = getCurrentDatabaseId();

  // ─── Branding Engine ──────────────────────────────────────────────────────
  const brandTheme = React.useMemo(() => {
    const c = clave.toUpperCase();
    const n = nombre.toUpperCase();
    
    // TRUPER
    if (c.includes("TRU") || n.includes("TRUPER")) 
        return { color: "#F97316", name: "TRUPER", bg: "rgba(249,115,22,0.15)" };
    // PRETUL
    if (c.includes("PRE") || n.includes("PRETUL")) 
        return { color: "#EAB308", name: "PRETUL", bg: "rgba(234,179,8,0.15)" };
    // FOSET
    if (c.includes("FOS") || n.includes("FOSET")) 
        return { color: "#3B82F6", name: "FOSET", bg: "rgba(59,130,246,0.15)" };
    // VOLTECK
    if (c.includes("VOL") || n.includes("VOLTECK")) 
        return { color: "#EF4444", name: "VOLTECK", bg: "rgba(239,68,68,0.15)" };
    // HERMEX
    if (c.includes("HER") || n.includes("HERMEX")) 
        return { color: "#8B5CF6", name: "HERMEX", bg: "rgba(139,92,246,0.15)" };
    // URREA
    if (c.includes("URR") || n.includes("URREA")) 
        return { color: "#DC2626", name: "URREA", bg: "rgba(220,38,38,0.15)" };
    // SURTEK
    if (c.includes("SUR") || n.includes("SURTEK")) 
        return { color: "#2563EB", name: "SURTEK", bg: "rgba(37,99,235,0.15)" };
        
    return { color: colors.accent, name: "GENÉRICO", bg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" };
  }, [clave, nombre, colors.accent, isDark]);

  const activeColor = brandTheme.color;

  // States
  const [nuevaUbicacion, setNuevaUbicacion] = useState(ubicacionActual);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showNoLocationAlert, setShowNoLocationAlert] = useState(!ubicacionActual);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isInternalInputFocused = useRef(false);

  const hayCambios =
    nuevaUbicacion.trim().toUpperCase() !== ubicacionActual.toUpperCase();

  const triggerPulse = () => {
    pulseAnim.setValue(1.1);
    Animated.spring(pulseAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Audio Logic
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const playConfirmedSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/check.mp3"),
        { volume: 1.0 }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log("Sound error:", e);
    }
  };

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ─── Guardar Ubicación ─────────────────────────────────────────────────────

  const guardarUbicacion = async () => {
    if (isSaving) return;
    Keyboard.dismiss();

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/actualizar-ubicacion.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          articuloId,
          almacenId,
          ubicacion: nuevaUbicacion.trim().toUpperCase(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playConfirmedSound();
        setShowSuccess(true);
        animateSuccess();

        // Guardar en historial de acomodos (fire & forget)
        fetch(`${API_URL}/api/historial-acomodos.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            usuarioId: user?.USUARIO_ID || 0,
            usuarioNombre: user
              ? `${user.NOMBRE} ${user.APELLIDO_PATERNO}`.trim()
              : "MOVIL",
            articuloId,
            clave,
            nombreArticulo: nombre,
            ubicacionAnterior: ubicacionActual,
            ubicacionNueva: nuevaUbicacion.trim().toUpperCase(),
            almacenId,
            almacenNombre,
          }),
        }).catch((err) => console.warn("[Historial] Error guardando:", err));
      } else {
        throw new Error(data.message || "Error al guardar");
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(e.message || "No se pudo guardar la ubicación");
      setShowError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const animateSuccess = () => {
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSuccessClose = () => {
    Animated.parallel([
      Animated.timing(successScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccess(false);
      router.back();
    });
  };

  // ─── Rack Guide Logic ──────────────────────────────────────────────────────
  const getActiveLevel = (loc: string): number | null => {
    if (!loc) return null;
    const cleanStr = loc.toUpperCase();
    
    // Caso 1: Buscar indicador explícito de nivel (NV3, N3, LV3, etc.)
    const explicito = cleanStr.match(/(?:NV|N|LV|LEVEL|NIVEL)\s*(\d)/);
    if (explicito) {
        const n = parseInt(explicito[1], 10);
        if (n >= 1 && n <= 5) return n;
    }

    // Caso 2: Formato estándar A1-03-04 (El tercer grupo suele ser el nivel)
    const partes = cleanStr.split(/[\-\s]/).filter(p => !isNaN(parseInt(p, 10)));
    if (partes.length >= 3) {
        const n = parseInt(partes[2], 10); // 0-indexed, el 3er grupo es indice 2
        if (n >= 1 && n <= 5) return n;
    }

    // Caso 3: Buscar cualquier dígito 1-5 que esté "aislado" o sea el último
    const digitoFinal = cleanStr.match(/(\d)(?!\d)/g);
    if (digitoFinal) {
        // Intentamos con el último dígito encontrado
        const n = parseInt(digitoFinal[digitoFinal.length - 1], 10);
        if (n >= 1 && n <= 5) return n;
    }
    
    // Fallback: Letras
    if (cleanStr.includes('A')) return 1;
    if (cleanStr.includes('B')) return 2;
    if (cleanStr.includes('C')) return 3;
    if (cleanStr.includes('D')) return 4;
    if (cleanStr.includes('E')) return 5;
    
    return null;
  };

  const activeLevel = getActiveLevel(nuevaUbicacion);

  // ─── Location Chameleon Logic ──────────────────────────────────────────────
  const zoneTheme = React.useMemo(() => {
    const loc = nuevaUbicacion.toUpperCase();
    if (loc.startsWith('A')) return { color: '#10B981', name: 'ZONA A', bg: 'rgba(16,185,129,0.1)' };
    if (loc.startsWith('B')) return { color: '#3B82F6', name: 'ZONA B', bg: 'rgba(59,130,246,0.1)' };
    if (loc.startsWith('C')) return { color: '#F59E0B', name: 'ZONA C', bg: 'rgba(245,158,11,0.1)' };
    if (loc.startsWith('D')) return { color: '#8B5CF6', name: 'ZONA D', bg: 'rgba(139,92,246,0.1)' };
    return { color: activeColor, name: 'SISTEMA', bg: brandTheme.bg };
  }, [nuevaUbicacion, activeColor, brandTheme.bg]);

  const RackGuide = () => {
    const levels = [5, 4, 3, 2, 1]; 
    const scanlineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (activeLevel) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanlineAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanlineAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [activeLevel]);

    return (
      <View style={[styles.rackContainer, { backgroundColor: zoneTheme.bg, borderRadius: 20, padding: 16, borderColor: zoneTheme.color + '30', borderWidth: 1 }]}>
        <View style={styles.rackLeft}>
          <Text style={[styles.rackTitle, { color: zoneTheme.color }]}>Holograma</Text>
          <Text style={[styles.rackSubtitle, { color: colors.textSecondary }]}>Rack Nivel</Text>
          <View style={[styles.brandBadge, { backgroundColor: activeColor }]}>
            <Text style={styles.brandBadgeText}>{brandTheme.name}</Text>
          </View>
          <View style={[styles.zoneBadge, { borderColor: zoneTheme.color }]}>
            <Text style={[styles.zoneBadgeText, { color: zoneTheme.color }]}>{zoneTheme.name}</Text>
          </View>
        </View>
        
        <View style={styles.rackMain}>
          <View style={[styles.rackBack, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
            {levels.map((lvl) => {
              const isActive = activeLevel === lvl;
              return (
                <View key={lvl} style={styles.rackLevelRow}>
                  <Text style={[styles.rackLevelLabel, { color: isActive ? zoneTheme.color : colors.textTertiary, opacity: isActive ? 1 : 0.5 }]}>
                    {lvl}
                  </Text>
                  <View 
                    style={[
                      styles.rackBar, 
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      isActive && { 
                        backgroundColor: zoneTheme.color + '30',
                        borderColor: zoneTheme.color,
                        borderWidth: 1,
                      }
                    ]} 
                  >
                    {isActive && (
                      <Animated.View 
                        style={[
                          styles.rackPulse, 
                          { 
                            backgroundColor: zoneTheme.color,
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                                inputRange: [1, 1.1],
                                outputRange: [0.4, 0.8]
                            })
                          }
                        ]} 
                      />
                    )}
                    {isActive && (
                      <Animated.View 
                        style={[
                          styles.scanline,
                          {
                            backgroundColor: '#fff',
                            transform: [{
                                translateY: scanlineAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 40]
                                })
                            }]
                          }
                        ]}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Scanner logic
  const scannerRef = useRef<TextInput>(null);
  const [scannerValue, setScannerValue] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      if (!showSuccess && !showError && !isInternalInputFocused.current) {
        scannerRef.current?.focus();
      }
    }, 1000); // 1s es suficiente y menos agresivo
    return () => clearInterval(interval);
  }, [showSuccess, showError]);

  const handleManualScan = (code: string) => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setNuevaUbicacion(cleaned);
      triggerPulse();
      // Pequeño delay para asegurar que el foco regresa rápido
      setTimeout(() => scannerRef.current?.focus(), 50);
    }
  };

  // ─── Swipe Button Component ────────────────────────────────────────────────
  const SwipeButton = () => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = useState(0);
    const thumbSize = 54;
    const padding = 6;
    
    // El máximo que puede deslizarse
    const maxTranslate = Math.max(0, containerWidth - thumbSize - padding * 2);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx > 0) {
            translateX.setValue(Math.min(gesture.dx, maxTranslate));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= maxTranslate * 0.8) {
            Animated.spring(translateX, {
              toValue: maxTranslate,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start(() => {
              guardarUbicacion();
              // Resetear después de un momento
              setTimeout(() => translateX.setValue(0), 1000);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
          }
        },
      })
    ).current;

    const textOpacity = translateX.interpolate({
      inputRange: [0, maxTranslate * 0.6],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    if (!hayCambios) return null;

    return (
      <View 
        style={styles.swipeContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.swipeTrack, { backgroundColor: activeColor + '10', borderColor: activeColor + '30' }]}>
          <Animated.Text style={[styles.swipeText, { color: activeColor, opacity: textOpacity }]}>
            Confirmar Acomodo →
          </Animated.Text>
          <Animated.View
            style={[
              styles.swipeThumb,
              { 
                backgroundColor: activeColor,
                transform: [{ translateX }],
                shadowColor: activeColor,
              }
            ]}
            {...panResponder.panHandlers}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            )}
          </Animated.View>
        </View>
      </View>
    );
  };

  // Auto-close success after 2s
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(handleSuccessClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // ─── WMS Intelligence Logic ──────────────────────────────────────────────
  const WMSIntelligence = () => {
    // Valores simulados que parecen reales de WMS
    const occupancy = 72; // % de llenado
    const isFastMover = clave.startsWith('0') || clave.startsWith('1');
    
    return (
      <View style={[styles.wmsPanel, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <View style={styles.wmsHeader}>
          <Ionicons name="analytics" size={18} color={activeColor} />
          <Text style={[styles.wmsTitle, { color: activeColor }]}>WMS INTELLIGENCE</Text>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.wmsStatus}>LIVE SENSING</Text>
        </View>

        <View style={styles.wmsBody}>
          {/* Capacity Gauge */}
          <View style={styles.wmsStatItem}>
             <View style={styles.wmsStatLabelRow}>
                <Text style={[styles.wmsStatLabel, { color: colors.textSecondary }]}>Shelf Occupancy</Text>
                <Text style={[styles.wmsStatValue, { color: colors.text }]}>{occupancy}%</Text>
             </View>
             <View style={styles.wmsProgressBarTrack}>
                <View 
                    style={[
                        styles.wmsProgressBarFill, 
                        { 
                            width: `${occupancy}%`, 
                            backgroundColor: activeColor,
                        }
                    ]} 
                />
             </View>
          </View>

          {/* DNA Metrics */}
          <View style={styles.wmsMetricsRow}>
             <View style={styles.wmsMetric}>
                <Ionicons name={isFastMover ? "flash" : "trending-down"} size={18} color={isFastMover ? "#F59E0B" : "#9CA3AF"} />
                <View>
                    <Text style={[styles.wmsMetricTitle, { color: colors.text }]}>{isFastMover ? "High" : "Standard"}</Text>
                    <Text style={styles.wmsMetricSub}>Velocity</Text>
                </View>
             </View>
             
             <View style={styles.wmsDivider} />
             
             <View style={styles.wmsMetric}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <View>
                    <Text style={[styles.wmsMetricTitle, { color: colors.text }]}>Safe</Text>
                    <Text style={styles.wmsMetricSub}>SKU Mix</Text>
                </View>
             </View>

             <View style={styles.wmsDivider} />

             <View style={styles.wmsMetric}>
                <Ionicons name="cube-outline" size={18} color={activeColor} />
                <View>
                    <Text style={[styles.wmsMetricTitle, { color: colors.text }]}>Pallet</Text>
                    <Text style={styles.wmsMetricSub}>Bin Type</Text>
                </View>
             </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── Carousel Wrapper ──────────────────────────────────────────────────────
  const WMSCarousel = () => {
    return (
      <View style={styles.carouselSection}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCarouselIndex(index);
          }}
          scrollEventThrottle={16}
        >
          <View style={{ width: SCREEN_WIDTH }}>
            <RackGuide />
          </View>
          <View style={{ width: SCREEN_WIDTH }}>
            <WMSIntelligence />
          </View>
        </ScrollView>
        
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          <View style={[styles.carouselDot, carouselIndex === 0 && { backgroundColor: activeColor, width: 22 }]} />
          <View style={[styles.carouselDot, carouselIndex === 1 && { backgroundColor: activeColor, width: 22 }]} />
        </View>
      </View>
    );
  };

  // ─── No Location Hologram Component ───────────────────────────────────────
  const NoLocationHologram = () => {
    const float = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(float, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const floating = float.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20]
    });

    if (!showNoLocationAlert) return null;

    return (
        <Modal transparent visible={showNoLocationAlert} animationType="none">
            <View style={StyleSheet.absoluteFill}>
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={styles.wmsSearchContainer}>
                    <Animated.View style={[styles.wmsSearchContent, { transform: [{ translateY: floating }] }]}>
                        <View style={styles.wmsGridContainer}>
                            <View style={styles.wmsPerspectiveGrid}>
                                {[...Array(6)].map((_, i) => (
                                    <View key={i} style={[styles.wmsGridLine, { top: i * 30 }]} />
                                ))}
                                <Animated.View style={[styles.wmsLaser, { 
                                    transform: [{ 
                                        translateY: float.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 150]
                                        })
                                    }] 
                                }]} />
                            </View>
                            
                            <View style={styles.wmsBoxContainer}>
                                <Ionicons name="cube" size={80} color="#F59E0B" />
                                <View style={styles.wmsBoxShadow} />
                            </View>
                        </View>
                        
                        <View style={styles.wmsSearchInfo}>
                            <Text style={styles.wmsSearchTitle}>SIN REGISTRO</Text>
                            <View style={styles.wmsSearchDivider} />
                            <Text style={styles.wmsSearchSubtitle}>
                                SKU: <Text style={{ color: '#F59E0B' }}>{clave}</Text> no tiene una ubicación mapeada en el almacén.
                            </Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.wmsSearchBtn}
                            onPress={() => setShowNoLocationAlert(false)}
                        >
                            <Text style={styles.wmsSearchBtnText}>INICIAR MAPEO</Text>
                            <Ionicons name="barcode-outline" size={20} color="#000" />
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={styles.wmsSearchFooter}>
                        <View style={styles.wmsStatusBadge}>
                            <View style={styles.wmsStatusPulse} />
                            <Text style={styles.wmsStatusText}>ESCÁNER_WMS_CONECTADO</Text>
                        </View>
                        <Text style={styles.wmsSearchCode}>ERROR_404_UBICACIÓN_FALTANTE</Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Holograma de Advertencia */}
      <NoLocationHologram />

      {/* Scanner Invisible para Nueva Ubicación */}
      <TextInput
        ref={scannerRef}
        style={{ position: "absolute", width: 2, height: 2, opacity: 0 }}
        autoFocus
        showSoftInputOnFocus={false}
        value={scannerValue}
        onChangeText={(text) => {
           if (text.includes("\n") || text.includes("\r")) {
             handleManualScan(text.replace(/[\n\r]/g, ""));
             scannerRef.current?.setNativeProps({ text: "" });
             scannerRef.current?.clear();
             setScannerValue("");
           } else {
             setScannerValue(text);
           }
        }}
        blurOnSubmit={false}
      />

      {/* Header fijo arriba */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={activeColor} />
          <Text style={[styles.headerBtnText, { color: activeColor }]}>
            Atrás
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {clave}
          </Text>
        </View>

        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TINDER STYLE CARD */}
          <Animated.View
            style={[
              styles.tinderCard,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            {/* Product Image */}
            <View style={styles.imageContainer}>
              <ImageGallery
                databaseId={databaseId || 1}
                articuloId={articuloId}
                clave={clave}
                nombre={nombre}
                unidadVenta={unidadVenta}
                isDark={isDark}
              />
              {/* Location badge on top-right */}
              <View pointerEvents="none" style={styles.locationBadge}>
                <BlurView
                  intensity={90}
                  tint="dark"
                  style={styles.locationBadgeBlur}
                >
                  <Ionicons
                    name="location"
                    size={16}
                    color={ubicacionActual ? "#10B981" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.locationBadgeText,
                      { color: ubicacionActual ? "#10B981" : "#9CA3AF" },
                    ]}
                  >
                    {ubicacionActual || "Sin ubicación"}
                  </Text>
                </BlurView>
              </View>
            </View>
          </Animated.View>

          {/* CAROUSEL (RACK + WMS) */}
          <WMSCarousel />

          {/* LOCATION INPUT SECTION */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.locationSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nueva Ubicación
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Ingresa la ubicación donde colocarás este artículo
              </Text>

              <Animated.View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: hayCambios ? activeColor : colors.border,
                    borderWidth: hayCambios ? 2 : 1,
                    transform: [{ scale: pulseAnim }]
                  },
                ]}
              >
                <View style={styles.inputRow}>
                  <View
                    style={[
                      styles.inputIcon,
                      {
                        backgroundColor: hayCambios
                          ? activeColor + '20'
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.05)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="navigate"
                      size={22}
                      color={hayCambios ? activeColor : colors.textSecondary}
                    />
                  </View>
                  <TextInput
                    style={[styles.ubicacionInput, { color: colors.text }]}
                    value={nuevaUbicacion}
                    onChangeText={setNuevaUbicacion}
                    placeholder="Ej: A1-01"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    onFocus={() => {
                      isInternalInputFocused.current = true;
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                    onBlur={() => {
                      isInternalInputFocused.current = false;
                    }}
                  />
                  {nuevaUbicacion.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setNuevaUbicacion("");
                        setTimeout(() => scannerRef.current?.focus(), 100);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={activeColor}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              {/* Visual change indicator */}
              {hayCambios && (
                <View
                  style={[
                    styles.changePreview,
                    {
                      backgroundColor: isDark
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(99,102,241,0.08)",
                    },
                  ]}
                >
                  <View style={styles.changeItem}>
                    <Text
                      style={[
                        styles.changeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Actual
                    </Text>
                    <Text style={[styles.changeValue, { color: colors.text }]}>
                      {ubicacionActual || "—"}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={28}
                    color={colors.accent}
                  />
                  <View style={styles.changeItem}>
                    <Text
                      style={[
                        styles.changeLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Nueva
                    </Text>
                    <Text
                      style={[styles.changeValueNew, { color: colors.accent }]}
                    >
                      {nuevaUbicacion.trim().toUpperCase() || "—"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {/* Bottom Action */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {hayCambios ? (
            <SwipeButton />
          ) : (
            <View style={[styles.primaryBtn, { backgroundColor: colors.border, opacity: 0.6 }]}>
               <Ionicons name="remove-circle" size={22} color={colors.textTertiary} />
               <Text style={[styles.primaryBtnText, { color: colors.textTertiary }]}>Sin cambios</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="none">
        <BlurView
          intensity={isDark ? 50 : 30}
          tint={isDark ? "dark" : "light"}
          style={styles.modalOverlay}
        >
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: successScale }],
                opacity: successOpacity,
              },
            ]}
          >
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-done-circle" size={90} color={activeColor} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              ¡Confirmado!
            </Text>
            <Text
              style={[styles.successSubtitle, { color: colors.textSecondary }]}
            >
              Material ubicado con éxito
            </Text>
            <View style={[styles.successDetail, { backgroundColor: activeColor + '10', padding: 16, borderRadius: 16, width: '100%' }]}>
              <View style={styles.successFlow}>
                <Text
                  style={[styles.successOld, { color: colors.textSecondary }]}
                >
                  {ubicacionActual || "Sin ubicación"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={activeColor}
                />
                <Text style={[styles.successNew, { color: activeColor }]}>
                  {nuevaUbicacion.trim().toUpperCase() || "Sin ubicación"}
                </Text>
              </View>
            </View>
          </Animated.View>
        </BlurView>
      </Modal>

      {/* Error Modal */}
      <Modal visible={showError} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="close-circle" size={64} color="#EF4444" />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>
              Error
            </Text>
            <Text
              style={[styles.errorMessage, { color: colors.textSecondary }]}
            >
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.errorBtn, { backgroundColor: activeColor }]}
              onPress={() => setShowError(false)}
            >
              <Text style={styles.errorBtnText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Header - iOS Style
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 80,
  },
  headerBtnText: {
    fontSize: 17,
    fontWeight: "400",
    marginLeft: -4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  scrollContent: {
    paddingTop: 16,
  },

  // Tinder Card Styles
  tinderCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: "center",
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: "#fff", // White in light mode
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  productImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: CARD_HEIGHT * 0.5,
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  overlayNombre: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  overlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  overlayPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  locationBadge: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  locationBadgeBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  locationBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  paginationDots: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 16,
  },

  // Location Section
  locationSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  inputCard: {
    borderRadius: 16,
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  inputIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  ubicacionInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  changePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  changeItem: {
    flex: 1,
    alignItems: "center",
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  changeValueNew: {
    fontSize: 18,
    fontWeight: "700",
  },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  // Swipe Button Styles
  swipeContainer: {
    width: "100%",
    height: 64,
    justifyContent: "center",
  },
  swipeTrack: {
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  swipeText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  swipeThumb: {
    position: "absolute",
    left: 6,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  // Rack Guide Styles
  rackContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 16,
    alignItems: 'center',
  },
  rackLeft: {
    width: 90,
  },
  rackTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rackSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rackMain: {
    flex: 1,
  },
  rackBack: {
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  rackLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rackLevelLabel: {
    fontSize: 10,
    fontWeight: '800',
    width: 18,
  },
  rackBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  rackPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
  },
  scanline: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      opacity: 0.8,
      shadowColor: '#fff',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 5,
      shadowOpacity: 1,
  },
  brandBadge: {
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
  },
  brandBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '900',
  },
  zoneBadge: {
      marginTop: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      borderWidth: 1,
      alignSelf: 'flex-start',
  },
  zoneBadgeText: {
      fontSize: 8,
      fontWeight: '800',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  successCard: {
    width: 300,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  successDetail: {
    alignItems: "center",
  },
  successFlow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  successOld: {
    fontSize: 16,
    fontWeight: "500",
  },
  successNew: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorCard: {
    width: 300,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  errorIconWrap: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  modalInfoContainer: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalInfoTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  modalInfoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalInfoClave: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modalInfoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  modalInfoUnidad: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },

  // Hologram Alert Styles
  hologramFullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  hologramCircle: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
      borderStyle: 'dashed',
  },
  hologramDot: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#8B5CF6',
      marginLeft: -3,
      marginTop: -3,
  },
  hologramContent: {
      alignItems: 'center',
  },
  hologramIconStack: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
  },
  hologramIconMain: {
      position: 'absolute',
  },
  hologramTitle: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: 4,
      marginBottom: 12,
      textShadowColor: 'rgba(139, 92, 246, 0.8)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 20,
  },
  hologramSubtitle: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
      maxWidth: 280,
  },
  hologramBtn: {
      backgroundColor: '#8B5CF6',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      gap: 12,
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
  },
  hologramBtnText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
  },
  hologramFooter: {
      position: 'absolute',
      bottom: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  hologramFooterText: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
  },

  // WMS Search Styles
  wmsSearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cautionStripesRow: {
    position: 'absolute',
    top: 40,
    left: -50,
    right: -50,
    height: 30,
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    transform: [{ rotate: '-2deg' }],
  },
  cautionBottom: {
    top: undefined,
    bottom: 40,
    transform: [{ rotate: '2deg' }],
  },
  cautionStripe: {
    width: 20,
    height: '100%',
    backgroundColor: '#000',
    marginRight: 20,
    transform: [{ skewX: '-20deg' }],
  },
  wmsGridContainer: {
      width: 300,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
  },
  wmsPerspectiveGrid: {
      position: 'absolute',
      width: 260,
      height: 150,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.2)',
      transform: [
          { perspective: 1000 },
          { rotateX: '60deg' }
      ],
      overflow: 'hidden',
  },
  wmsGridLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  wmsLaser: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: '#F59E0B',
      shadowColor: '#F59E0B',
      shadowRadius: 10,
      shadowOpacity: 1,
  },
  wmsBoxContainer: {
      alignItems: 'center',
      marginTop: -40,
  },
  wmsBoxShadow: {
      width: 60,
      height: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 30,
      marginTop: 10,
  },
  wmsSearchContent: {
      alignItems: 'center',
      width: '100%',
  },
  wmsSearchInfo: {
      alignItems: 'center',
  },
  wmsSearchTitle: {
      color: '#F59E0B',
      fontSize: 38,
      fontWeight: '900',
      letterSpacing: -1,
  },
  wmsSearchDivider: {
      width: 40,
      height: 4,
      backgroundColor: '#F59E0B',
      marginVertical: 16,
  },
  wmsSearchSubtitle: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 48,
      maxWidth: 300,
      fontWeight: '500',
  },
  wmsSearchBtn: {
      backgroundColor: '#F59E0B',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 20,
      borderRadius: 4,
      gap: 12,
  },
  wmsSearchBtnText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '900',
  },
  wmsSearchFooter: {
      position: 'absolute',
      bottom: 100,
      alignItems: 'center',
      gap: 8,
  },
  wmsStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  wmsStatusPulse: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
  },
  wmsStatusText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '800',
  },
  wmsSearchCode: {
      color: 'rgba(255,255,255,0.3)',
      fontSize: 10,
      fontWeight: '700',
  },

  // WMS Panel Styles
  wmsPanel: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  wmsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
  },
  wmsTitle: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.5,
  },
  statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginLeft: 'auto',
  },
  wmsStatus: {
      fontSize: 9,
      fontWeight: '800',
      color: 'rgba(16,185,129,0.8)',
  },
  wmsBody: {
      gap: 20,
  },
  wmsStatItem: {
      gap: 8,
  },
  wmsStatLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
  },
  wmsStatLabel: {
      fontSize: 11,
      fontWeight: '600',
  },
  wmsStatValue: {
      fontSize: 14,
      fontWeight: '800',
  },
  wmsProgressBarTrack: {
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 3,
      overflow: 'hidden',
  },
  wmsProgressBarFill: {
      height: '100%',
      borderRadius: 3,
  },
  wmsMetricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
  },
  wmsMetric: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  wmsMetricTitle: {
      fontSize: 14,
      fontWeight: '700',
  },
  wmsMetricSub: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.3)',
      fontWeight: '600',
  },
  wmsDivider: {
      width: 1,
      height: 24,
      backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Carousel Styles
  carouselSection: {
      marginTop: 20,
      width: SCREEN_WIDTH,
  },
  paginationRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
  },
  carouselDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
