import TicketModal from "@/components/pos/TicketModal";
import { usePOS } from "@/context/pos/pos-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { apiRequest, getCurrentDatabaseId } from "@/services/api";
import {
    cancelNfcRead,
    CardInfo,
    initNfc,
    isNfcSupported,
    readContactlessCard,
} from "@/utils/nfc-card-reader";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const SLIDER_H = 62;
const THUMB_SIZE = 50;
const SLIDER_PAD = 6;
const TRACK_W = SCREEN_W - 40; // 20px padding each side
const MAX_SLIDE = TRACK_W - THUMB_SIZE - SLIDER_PAD * 2;

// ─── Types ───────────────────────────────────────────────────────────────────
type PayMethod = "efectivo" | "tarjeta" | "transferencia";

interface PayMethodOption {
  key: PayMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  sublabel: string;
  gradient: readonly [string, string];
}

const METHODS: PayMethodOption[] = [
  {
    key: "efectivo",
    label: "Efectivo",
    icon: "cash-outline",
    sublabel: "Pago en efectivo",
    gradient: ["#34C759", "#30D158"],
  },
  {
    key: "tarjeta",
    label: "Tarjeta",
    icon: "card-outline",
    sublabel: "NFC Contactless",
    gradient: ["#6C5CE7", "#a855f7"],
  },
  {
    key: "transferencia",
    label: "Transferencia",
    icon: "swap-horizontal-outline",
    sublabel: "SPEI / depósito",
    gradient: ["#007AFF", "#5AC8FA"],
  },
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number): string =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const fmtInt = (n: number): string =>
  "$" +
  Math.floor(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

interface CartSummaryItem {
  articuloId: number;
  clave: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  precioLista: number;
  umed: string | null;
}

const CARD_BRAND_COLORS: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#006FCF",
  unknown: "#6C5CE7",
};

const CARD_BRAND_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  visa: "card",
  mastercard: "card",
  amex: "card",
  unknown: "card-outline",
};

// ─── CLABE por banco ─────────────────────────────────────────────────────────
interface BankClabe {
  key: string;
  bank: string;
  clabe: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  beneficiario: string;
  referencia: string;
  bancoCode: string;
}

const BANK_CLABES: BankClabe[] = [
  {
    key: "bbva",
    bank: "BBVA",
    clabe: "012180001234567890",
    color: "#004481",
    icon: "business",
    beneficiario: "KRKN Comercializadora S.A.",
    referencia: "1234567",
    bancoCode: "012",
  },
  {
    key: "banorte",
    bank: "Banorte",
    clabe: "072180009876543210",
    color: "#CB0C2B",
    icon: "business",
    beneficiario: "KRKN Comercializadora S.A.",
    referencia: "9876543",
    bancoCode: "072",
  },
  {
    key: "santander",
    bank: "Santander",
    clabe: "014180005678901234",
    color: "#EC0000",
    icon: "business",
    beneficiario: "KRKN Comercializadora S.A.",
    referencia: "5678901",
    bancoCode: "014",
  },
  {
    key: "hsbc",
    bank: "HSBC",
    clabe: "021180004321098765",
    color: "#DB0011",
    icon: "business",
    beneficiario: "KRKN Comercializadora S.A.",
    referencia: "4321098",
    bancoCode: "021",
  },
];

// ─── Slide To Confirm ────────────────────────────────────────────────────────
interface SlideToConfirmProps {
  enabled: boolean;
  gradient: readonly [string, string];
  label: string;
  amount: string;
  onConfirm: () => void;
  isDark: boolean;
}

function SlideToConfirm({
  enabled,
  gradient,
  label,
  amount,
  onConfirm,
  isDark,
}: SlideToConfirmProps) {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const confirmed = useSharedValue(false);

  const triggerConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
    setTimeout(() => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 180 });
      confirmed.value = false;
    }, 600);
  }, [onConfirm, translateX, confirmed]);

  const hapticGrab = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX(4)
    .onStart(() => {
      "worklet";
      context.value = translateX.value;
      runOnJS(hapticGrab)();
    })
    .onUpdate((e) => {
      "worklet";
      const next = context.value + e.translationX;
      translateX.value = Math.max(0, Math.min(next, MAX_SLIDE));
    })
    .onEnd(() => {
      "worklet";
      if (translateX.value > MAX_SLIDE * 0.85 && !confirmed.value) {
        confirmed.value = true;
        translateX.value = withSpring(MAX_SLIDE, {
          damping: 18,
          stiffness: 200,
        });
        runOnJS(triggerConfirm)();
      } else {
        translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + SLIDER_PAD,
  }));

  const labelOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, MAX_SLIDE * 0.5],
      [1, 0],
      "clamp",
    ),
  }));

  const checkOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [MAX_SLIDE * 0.7, MAX_SLIDE],
      [0, 1],
      "clamp",
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [MAX_SLIDE * 0.7, MAX_SLIDE],
          [0.5, 1],
          "clamp",
        ),
      },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, MAX_SLIDE * 0.2],
      [1, 0],
      "clamp",
    ),
  }));

  const disabledBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const disabledFg = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";

  return (
    <View
      style={[
        st.sliderTrack,
        {
          backgroundColor: enabled
            ? isDark
              ? gradient[0] + "20"
              : gradient[0] + "10"
            : disabledBg,
          borderColor: enabled ? gradient[0] + "25" : "transparent",
        },
      ]}
    >
      {/* Fill */}
      <Animated.View style={[st.sliderFill, fillStyle]}>
        <LinearGradient
          colors={enabled ? [...gradient] : [disabledBg, disabledBg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={st.sliderFillGrad}
        />
      </Animated.View>

      {/* Center label */}
      <Animated.View style={[st.sliderLabelWrap, labelOpacity]}>
        <Animated.View style={[st.sliderShimmer, shimmerStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              enabled ? "rgba(255,255,255,0.08)" : "transparent",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text
          style={[
            st.sliderLabel,
            { color: enabled ? gradient[0] : disabledFg },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            st.sliderAmount,
            { color: enabled ? gradient[0] + "90" : disabledFg },
          ]}
        >
          {amount}
        </Text>
      </Animated.View>

      {/* Completed check */}
      <Animated.View style={[st.sliderCheckWrap, checkOpacity]}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={st.sliderCheckText}>¡Confirmado!</Text>
      </Animated.View>

      {/* Thumb */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            st.sliderThumb,
            thumbStyle,
            {
              backgroundColor: enabled
                ? "#fff"
                : isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.08)",
            },
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={enabled ? gradient[0] : disabledFg}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CobrarScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    total: string;
    count: string;
    qty: string;
    client: string;
    clientId: string;
    clientClave: string;
    savings: string;
    items: string;
  }>();

  const { selectedCaja, selectedCajero, sucursalId } = usePOS();
  const [isProcessing, setIsProcessing] = useState(false);

  const total = parseFloat(params.total || "0");
  const count = parseInt(params.count || "0", 10);
  const qty = parseInt(params.qty || "0", 10);
  const clientName = params.client || "Cliente General";
  const savings = parseFloat(params.savings || "0");

  const cartItems: CartSummaryItem[] = useMemo(() => {
    try {
      return params.items ? JSON.parse(params.items) : [];
    } catch {
      return [];
    }
  }, [params.items]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [inputStr, setInputStr] = useState("");

  // NFC state
  const [nfcReading, setNfcReading] = useState(false);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [nfcAvailable, setNfcAvailable] = useState<boolean | null>(null);
  const nfcActive = useRef(false);

  // Transfer / CLABE state
  const [selectedBank, setSelectedBank] = useState<BankClabe>(BANK_CLABES[0]);
  const [clabeCopied, setClabeCopied] = useState(false);

  // Summary modal
  const [summaryVisible, setSummaryVisible] = useState(false);

  // Caja open state — 2 step: Abrir Caja → Confirmar Cambio
  const [cajaOpen, setCajaOpen] = useState(false);
  const [cambioConfirmed, setCambioConfirmed] = useState(false);

  // Auth & success modals
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMethodLabel, setSuccessMethodLabel] = useState("");
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [lastSaleInfo, setLastSaleInfo] = useState<{
    folio: string;
    items: any[];
    total: number;
    cliente: string;
    metodoPago: string;
    fecha: string;
    hora: string;
  } | null>(null);
  const [formasCobroIds, setFormasCobroIds] = useState<Record<string, number>>({
    efectivo: 67, 
    tarjeta: 395564,
    transferencia: 395565
  });


  // ── NFC Pulse Animation ────────────────────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  // ── Derived ────────────────────────────────────────────────────────────────
  const received = useMemo(() => {
    if (!inputStr) return 0;
    const val = parseFloat(inputStr);
    return isNaN(val) ? 0 : val;
  }, [inputStr]);

  const change = useMemo(
    () => (received > total ? received - total : 0),
    [received, total],
  );

  const isExact = method !== "efectivo";
  const canConfirm =
    method === "efectivo"
      ? cambioConfirmed
      : method === "tarjeta"
        ? !!cardInfo
        : true;
  const selectedMethod = METHODS.find((m) => m.key === method)!;

  // ── NFC Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkNfc = async () => {
      const supported = await isNfcSupported();
      setNfcAvailable(supported);
      if (supported) await initNfc();
    };
    checkNfc();

    return () => {
      if (nfcActive.current) {
        cancelNfcRead();
        nfcActive.current = false;
      }
    };
  }, []);

  // Start/stop NFC reading when switching to/from tarjeta
  useEffect(() => {
    if (method === "tarjeta" && nfcAvailable && !cardInfo) {
      startNfcRead();
    } else if (method !== "tarjeta") {
      if (nfcActive.current) {
        cancelNfcRead();
        nfcActive.current = false;
      }
      stopPulseAnimation();
    }
  }, [method, nfcAvailable, cardInfo]);

  useEffect(() => {
    const fetchFormas = async () => {
      try {
        const res = await apiRequest<any[]>("api/POS/formas-cobro.php", { method: "POST" });
        if (res.success && res.data) {
          const mapping: Record<string, number> = {};
          res.data.forEach((f: any) => {
            const name = f.NOMBRE.toLowerCase();
            if (name.includes('efectivo')) mapping.efectivo = f.ID;
            if (name.includes('tarjeta') && (name.includes('débito') || name.includes('debito'))) mapping.tarjeta = f.ID;
            if (name.includes('tarjeta') && !mapping.tarjeta) mapping.tarjeta = f.ID; 
            if (name.includes('transferencia')) mapping.transferencia = f.ID;
          });
          setFormasCobroIds(prev => ({ ...prev, ...mapping }));
        }
      } catch (e) {
        console.warn("[POS] Error fetching forms of payment:", e);
      }
    };
    fetchFormas();
  }, []);

  const startPulseAnimation = useCallback(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        withTiming(0.4, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  const stopPulseAnimation = useCallback(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    cancelAnimation(ringScale);
    cancelAnimation(ringOpacity);
    pulseScale.value = 1;
    pulseOpacity.value = 0.6;
    ringScale.value = 1;
    ringOpacity.value = 0.4;
  }, []);

  const startNfcRead = useCallback(async () => {
    if (nfcActive.current) return;

    setNfcReading(true);
    setNfcError(null);
    setCardInfo(null);
    nfcActive.current = true;
    startPulseAnimation();

    const card = await readContactlessCard();
    nfcActive.current = false;
    setNfcReading(false);
    stopPulseAnimation();

    if (card) {
      setCardInfo(card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setNfcError("No se pudo leer la tarjeta");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [startPulseAnimation, stopPulseAnimation]);

  // ── Keypad ─────────────────────────────────────────────────────────────────
  const onKey = useCallback(
    (key: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Reset caja flow when amount changes
      if (cajaOpen || cambioConfirmed) {
        setCajaOpen(false);
        setCambioConfirmed(false);
      }
      if (key === "del") {
        setInputStr((p) => p.slice(0, -1));
      } else if (key === ".") {
        if (!inputStr.includes(".")) setInputStr((p) => p + ".");
      } else {
        const parts = (inputStr + key).split(".");
        if (parts[1] && parts[1].length > 2) return;
        setInputStr((p) => p + key);
      }
    },
    [inputStr, cajaOpen, cambioConfirmed],
  );

  const onQuick = useCallback((amt: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInputStr(String(amt));
    // Reset caja flow
    setCajaOpen(false);
    setCambioConfirmed(false);
  }, []);

  const onExact = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInputStr(total.toFixed(2));
  }, [total]);

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    // ─ Transfer: open auth modal ─
    if (method === "transferencia" && !authModalVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setAuthPassword("");
      setAuthError(false);
      setAuthModalVisible(true);
      return;
    }

    if (!selectedCaja || !selectedCajero || !sucursalId) {
      Alert.alert("Error de Sesión", "No hay una sesión de caja activa.");
      return;
    }

    setIsProcessing(true);
    try {
      const databaseId = getCurrentDatabaseId();
      
      // Usamos los IDs obtenidos dinámicamente
      const payload = {
        databaseId,
        sucursalId,
        almacenId: selectedCaja.ALMACEN_ID,
        clienteId: parseInt(params.clientId || "0"),
        claveCliente: params.clientClave || "0",
        cajaId: selectedCaja.CAJA_ID,
        items: cartItems.map(item => ({
          articuloId: item.articuloId,
          clave: item.clave,
          unidades: item.cantidad,
          precio: item.precio
        })),
        pago: {
          formaPagoId: formasCobroIds[method],
          importe: total,
          referencia: method === 'tarjeta' ? (cardInfo?.lastFour || '') : (method === 'transferencia' ? selectedBank.referencia : ''),
          banco: method === 'transferencia' ? selectedBank.bank : (cardInfo?.type || ''),
          tarjeta: cardInfo?.lastFour || '',
          fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
        }
      };

      const data = await apiRequest<any>("api/POS/finalizar-venta.php", {
        method: "POST",
        body: payload,
      });

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const now = new Date();
        setLastSaleInfo({
          folio: data.data.folio,
          items: cartItems,
          total: total,
          cliente: clientName,
          metodoPago: selectedMethod.label,
          fecha: now.toLocaleDateString(),
          hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        setSuccessMethodLabel(selectedMethod.label);
        setSuccessModalVisible(true);
        setTimeout(() => {
          Alert.alert("DEBUG: Detalles Guardados", JSON.stringify(data.data.debugSeguro, null, 2));
        }, 300);
      } else {
        throw new Error(data.error || "Error desconocido al procesar la venta");
      }

    } catch (err: any) {
      console.error("[POS] Checkout error:", err);
      Alert.alert("Error de Venta", err.message || "Ocurrió un problema al finalizar la venta.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMethod, method, selectedCaja, selectedCajero, sucursalId, cartItems, params, total, cardInfo, selectedBank, authModalVisible]);

  const handleAuthVerify = useCallback(() => {
    if (authPassword !== "1234") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAuthError(true);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAuthModalVisible(false);
    setSuccessMethodLabel(`${selectedMethod.label} (${selectedBank.bank})`);
    setTimeout(() => setSuccessModalVisible(true), 300);
  }, [authPassword, selectedMethod, selectedBank]);

  const handleSuccessDismiss = useCallback(() => {
    setSuccessModalVisible(false);
    // Mostrar ticket antes de salir
    setTimeout(() => {
      setTicketModalVisible(true);
    }, 400);
  }, []);

  const handleTicketClose = useCallback(() => {
    setTicketModalVisible(false);
    // Go back and signal that the cart should be cleared
    router.replace({ pathname: "/(main)/pos/nueva-venta", params: { cleared: "1" } });
  }, []);

  // ─── Keypad keys ───────────────────────────────────────────────────────────
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "del"],
  ];

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? "dark" : "light"}
        style={[st.header, { paddingTop: insets.top }]}
      >
        <View style={st.headerInner}>
          <TouchableOpacity
            style={st.backBtn}
            onPress={() => {
              if (nfcActive.current) cancelNfcRead();
              router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: colors.text }]}>Cobrar</Text>
          <TouchableOpacity
            style={st.backBtn}
            onPress={() => {
              setSummaryVisible(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* ── Scrollable Content ─────────────────────────────────────────────── */}
      <ScrollView
        style={[st.content, { paddingTop: insets.top + 64 }]}
        contentContainerStyle={st.contentInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Big total */}
        <Animated.View entering={FadeIn.delay(100)} style={st.totalSection}>
          <Text style={[st.totalLabel, { color: colors.textTertiary }]}>
            TOTAL A COBRAR
          </Text>
          <Text style={[st.totalAmount, { color: colors.text }]}>
            {fmt(total)}
          </Text>
          <View style={st.metaRow}>
            <View
              style={[
                st.metaPill,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={11}
                color={colors.textTertiary}
              />
              <Text
                style={[st.metaTxt, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {clientName}
              </Text>
            </View>
            <View
              style={[
                st.metaPill,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              <Text style={[st.metaTxt, { color: colors.textSecondary }]}>
                {count} arts · {qty} pzas
              </Text>
            </View>
            {savings > 0 && (
              <View style={[st.metaPill, { backgroundColor: "#34C75912" }]}>
                <Text style={[st.metaTxt, { color: "#34C759" }]}>
                  -{fmt(savings)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Payment methods ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={[st.sectionLabel, { color: colors.textTertiary }]}>
            MÉTODO DE PAGO
          </Text>
          <View style={st.methodsRow}>
            {METHODS.map((m) => {
              const active = method === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    st.methodCard,
                    {
                      backgroundColor: active
                        ? m.gradient[0] + "12"
                        : isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.03)",
                      borderColor: active
                        ? m.gradient[0] + "40"
                        : colors.border,
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                    },
                  ]}
                  onPress={() => {
                    setMethod(m.key);
                    setCardInfo(null);
                    setNfcError(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      st.methodIcon,
                      {
                        backgroundColor: active
                          ? m.gradient[0]
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={m.icon}
                      size={20}
                      color={active ? "#fff" : colors.textTertiary}
                    />
                  </View>
                  <Text
                    style={[
                      st.methodLabel,
                      { color: active ? m.gradient[0] : colors.text },
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={[
                      st.methodSub,
                      {
                        color: active
                          ? m.gradient[0] + "90"
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {m.sublabel}
                  </Text>
                  {active && (
                    <View
                      style={[
                        st.methodCheck,
                        { backgroundColor: m.gradient[0] },
                      ]}
                    >
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── EFECTIVO ─────────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {method === "efectivo" && (
          <Animated.View
            entering={FadeInUp.springify().damping(16)}
            style={st.cashSection}
          >
            {/* Received amount display */}
            <View
              style={[
                st.inputDisplay,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[st.inputLabel, { color: colors.textTertiary }]}>
                Recibido
              </Text>
              <Text
                style={[
                  st.inputAmount,
                  {
                    color: received >= total ? "#34C759" : colors.text,
                  },
                ]}
              >
                {inputStr ? `$${inputStr}` : "$0"}
              </Text>
              {change > 0 && (
                <View style={st.changeRow}>
                  <Text
                    style={[st.changeLabel, { color: colors.textTertiary }]}
                  >
                    Cambio
                  </Text>
                  <Text style={st.changeAmount}>{fmt(change)}</Text>
                </View>
              )}
            </View>

            {/* Quick amounts */}
            <View style={st.quickRow}>
              <TouchableOpacity
                style={[
                  st.quickChip,
                  {
                    backgroundColor: "#34C75915",
                    borderColor: "#34C75930",
                    borderWidth: 1,
                  },
                ]}
                onPress={onExact}
              >
                <Text style={[st.quickTxt, { color: "#34C759" }]}>Exacto</Text>
              </TouchableOpacity>
              {QUICK_AMOUNTS.filter((a) => a >= total * 0.5)
                .slice(0, 4)
                .map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      st.quickChip,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => onQuick(a)}
                  >
                    <Text style={[st.quickTxt, { color: colors.text }]}>
                      {fmtInt(a)}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {/* Numeric keypad */}
            <View style={st.keypad}>
              {keys.map((row, ri) => (
                <View key={ri} style={st.keyRow}>
                  {row.map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[
                        st.key,
                        {
                          backgroundColor:
                            k === "del"
                              ? isDark
                                ? "rgba(255,80,80,0.08)"
                                : "rgba(255,59,48,0.06)"
                              : isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.04)",
                        },
                      ]}
                      onPress={() => onKey(k)}
                      activeOpacity={0.6}
                    >
                      {k === "del" ? (
                        <Ionicons
                          name="backspace-outline"
                          size={22}
                          color={colors.error}
                        />
                      ) : (
                        <Text style={[st.keyTxt, { color: colors.text }]}>
                          {k}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Master caja button */}
            {!cambioConfirmed && (
              <TouchableOpacity
                style={[
                  st.cajaBtn,
                  {
                    backgroundColor: cajaOpen
                      ? "#FF990012"
                      : isDark
                        ? "rgba(108,92,231,0.12)"
                        : "rgba(108,92,231,0.08)",
                    borderColor: cajaOpen ? "#FF990035" : "#6C5CE730",
                    opacity: !cajaOpen && received < total ? 0.45 : 1,
                  },
                ]}
                disabled={!cajaOpen && received < total}
                onPress={() => {
                  if (!cajaOpen) {
                    // Step 1: Abrir caja
                    setCajaOpen(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } else {
                    // Step 2: Confirmar cambio
                    setCambioConfirmed(true);
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success,
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    st.cajaBtnIcon,
                    { backgroundColor: cajaOpen ? "#FF990018" : "#6C5CE718" },
                  ]}
                >
                  <Ionicons
                    name={cajaOpen ? "cash-outline" : "lock-open-outline"}
                    size={18}
                    color={cajaOpen ? "#FF9900" : "#6C5CE7"}
                  />
                </View>
                <View style={st.cajaBtnTextWrap}>
                  <Text
                    style={[
                      st.cajaBtnLabel,
                      { color: cajaOpen ? "#FF9900" : "#6C5CE7" },
                    ]}
                  >
                    {cajaOpen ? "Confirmar Cambio" : "Abrir Caja"}
                  </Text>
                  <Text
                    style={[st.cajaBtnHint, { color: colors.textTertiary }]}
                  >
                    {cajaOpen
                      ? `Cambio: ${fmt(change)} — ¿ya lo entregaste?`
                      : received >= total
                        ? "Listo para abrir"
                        : "Ingresa el monto recibido"}
                  </Text>
                </View>
                <Ionicons
                  name={
                    cajaOpen ? "checkmark-circle-outline" : "chevron-forward"
                  }
                  size={16}
                  color={cajaOpen ? "#FF9900" : "#6C5CE7"}
                />
              </TouchableOpacity>
            )}

            {/* Confirmed badge */}
            {cambioConfirmed && (
              <View
                style={[
                  st.cajaBtn,
                  {
                    backgroundColor: "#34C75910",
                    borderColor: "#34C75930",
                  },
                ]}
              >
                <View
                  style={[st.cajaBtnIcon, { backgroundColor: "#34C75918" }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                </View>
                <View style={st.cajaBtnTextWrap}>
                  <Text style={[st.cajaBtnLabel, { color: "#34C759" }]}>
                    Cambio Entregado
                  </Text>
                  <Text
                    style={[st.cajaBtnHint, { color: colors.textTertiary }]}
                  >
                    {fmt(change)} — Desliza para finalizar
                  </Text>
                </View>
                <Ionicons name="checkmark-done" size={16} color="#34C759" />
              </View>
            )}
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TARJETA (NFC) ────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {method === "tarjeta" && (
          <Animated.View entering={FadeIn.delay(150)} style={st.cardSection}>
            {/* NFC not available */}
            {nfcAvailable === false && (
              <View style={st.nfcCenter}>
                <View
                  style={[
                    st.nfcIconWrap,
                    { backgroundColor: colors.error + "12" },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={48}
                    color={colors.error}
                  />
                </View>
                <Text style={[st.nfcTitle, { color: colors.text }]}>
                  NFC No Disponible
                </Text>
                <Text style={[st.nfcHint, { color: colors.textTertiary }]}>
                  Este dispositivo no soporta NFC o está desactivado.
                  {"\n"}Actívalo en Configuración.
                </Text>
                <TouchableOpacity
                  style={[st.nfcActionBtn, { backgroundColor: "#6C5CE712" }]}
                  onPress={() => {
                    // Skip NFC, confirm manually
                    setCardInfo({
                      type: "unknown",
                      label: "TARJETA",
                      lastFour: "0000",
                      expiry: "--/--",
                      aid: "",
                    });
                  }}
                >
                  <Text style={st.nfcActionTxt}>Confirmar sin NFC</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Waiting for card (NFC reading) */}
            {nfcAvailable !== false && nfcReading && !cardInfo && (
              <View style={st.nfcCenter}>
                <View style={st.pulseContainer}>
                  {/* Outer pulsing ring */}
                  <Animated.View
                    style={[
                      st.pulseRing,
                      {
                        borderColor: "#6C5CE7",
                        backgroundColor: "transparent",
                      },
                      ringStyle,
                    ]}
                  />
                  {/* Inner pulsing circle */}
                  <Animated.View
                    style={[
                      st.pulseCircle,
                      { backgroundColor: "#6C5CE715" },
                      pulseStyle,
                    ]}
                  >
                    <LinearGradient
                      colors={["#6C5CE725", "#a855f710"]}
                      style={st.pulseGradient}
                    >
                      <Ionicons name="wifi" size={52} color="#6C5CE7" />
                    </LinearGradient>
                  </Animated.View>
                </View>
                <Text style={[st.nfcTitle, { color: colors.text }]}>
                  Acerque su tarjeta
                </Text>
                <Text style={[st.nfcHint, { color: colors.textTertiary }]}>
                  Sostenga la tarjeta contactless{"\n"}sobre la parte trasera
                  del dispositivo
                </Text>
                <View style={st.nfcBadgeRow}>
                  <View
                    style={[
                      st.nfcBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Text
                      style={[st.nfcBadgeTxt, { color: colors.textTertiary }]}
                    >
                      VISA
                    </Text>
                  </View>
                  <View
                    style={[
                      st.nfcBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Text
                      style={[st.nfcBadgeTxt, { color: colors.textTertiary }]}
                    >
                      MASTERCARD
                    </Text>
                  </View>
                  <View
                    style={[
                      st.nfcBadge,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Text
                      style={[st.nfcBadgeTxt, { color: colors.textTertiary }]}
                    >
                      AMEX
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* NFC Error */}
            {nfcAvailable !== false && !nfcReading && nfcError && !cardInfo && (
              <View style={st.nfcCenter}>
                <View
                  style={[st.nfcIconWrap, { backgroundColor: "#FF9F0A12" }]}
                >
                  <Ionicons name="warning-outline" size={48} color="#FF9F0A" />
                </View>
                <Text style={[st.nfcTitle, { color: colors.text }]}>
                  {nfcError}
                </Text>
                <Text style={[st.nfcHint, { color: colors.textTertiary }]}>
                  Intente acercar la tarjeta nuevamente{"\n"}o pruebe con otra
                  tarjeta
                </Text>
                <View style={st.nfcActionsRow}>
                  <TouchableOpacity
                    style={[
                      st.nfcActionBtn,
                      { backgroundColor: "#6C5CE712", flex: 1 },
                    ]}
                    onPress={startNfcRead}
                  >
                    <Ionicons name="refresh" size={16} color="#6C5CE7" />
                    <Text style={st.nfcActionTxt}>Reintentar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      st.nfcActionBtn,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                        flex: 1,
                      },
                    ]}
                    onPress={() => {
                      setCardInfo({
                        type: "unknown",
                        label: "TARJETA",
                        lastFour: "0000",
                        expiry: "--/--",
                        aid: "",
                      });
                    }}
                  >
                    <Text
                      style={[
                        st.nfcActionTxtAlt,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Sin NFC
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* NFC not started yet (checking availability) */}
            {nfcAvailable === null && !nfcReading && !cardInfo && (
              <View style={st.nfcCenter}>
                <View
                  style={[st.nfcIconWrap, { backgroundColor: "#6C5CE712" }]}
                >
                  <Ionicons name="wifi" size={48} color="#6C5CE7" />
                </View>
                <Text style={[st.nfcTitle, { color: colors.text }]}>
                  Verificando NFC...
                </Text>
              </View>
            )}

            {/* ── Card Detected ───────────────────────────────────────────── */}
            {cardInfo && (
              <Animated.View
                entering={FadeInDown.duration(500).easing(
                  Easing.out(Easing.cubic),
                )}
                style={st.detectedCard}
              >
                {/* Apple Watch / Apple Pay visual */}
                {cardInfo.device === "apple-pay" ? (
                  <View style={st.watchContainer}>
                    {/* Watch body */}
                    <View
                      style={[
                        st.watchBody,
                        { backgroundColor: isDark ? "#2C2C2E" : "#1C1C1E" },
                      ]}
                    >
                      {/* Crown / Digital Crown */}
                      <View
                        style={[
                          st.watchCrown,
                          { backgroundColor: isDark ? "#48484A" : "#3A3A3C" },
                        ]}
                      />
                      <View
                        style={[
                          st.watchButton,
                          { backgroundColor: isDark ? "#48484A" : "#3A3A3C" },
                        ]}
                      />

                      {/* Watch screen */}
                      <LinearGradient
                        colors={
                          cardInfo.type === "visa"
                            ? ["#1A1F71", "#4B5EAA"]
                            : cardInfo.type === "mastercard"
                              ? ["#1A1A2E", "#EB001B"]
                              : cardInfo.type === "amex"
                                ? ["#006FCF", "#4BA3F5"]
                                : ["#6C5CE7", "#a855f7"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.watchScreen}
                      >
                        {/* Orb glow */}
                        <View style={st.watchOrb} />

                        {/* Apple Pay icon area */}
                        <View style={st.watchPayIcon}>
                          <Ionicons
                            name="card"
                            size={16}
                            color="rgba(255,255,255,0.9)"
                          />
                        </View>

                        {/* Card info on screen */}
                        <View style={st.watchCardInfo}>
                          <Text style={st.watchBrand}>{cardInfo.label}</Text>
                          <View style={st.watchDotsRow}>
                            <Text style={st.watchDots}>····</Text>
                            <Text style={st.watchLast4}>
                              {cardInfo.lastFour}
                            </Text>
                          </View>
                        </View>

                        {/* Checkmark */}
                        <View style={st.watchCheck}>
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#34C759"
                          />
                        </View>
                      </LinearGradient>
                    </View>
                  </View>
                ) : (
                  /* Physical Card visual */
                  <LinearGradient
                    colors={
                      cardInfo.type === "visa"
                        ? ["#1A1F71", "#4B5EAA"]
                        : cardInfo.type === "mastercard"
                          ? ["#1A1A2E", "#EB001B30"]
                          : cardInfo.type === "amex"
                            ? ["#006FCF", "#4BA3F5"]
                            : ["#6C5CE7", "#a855f7"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={st.cardVisual}
                  >
                    {/* Card chip icon */}
                    <View style={st.cardChipRow}>
                      <View style={st.cardChip}>
                        <View style={st.cardChipInner} />
                      </View>
                      <Ionicons
                        name="wifi"
                        size={20}
                        color="rgba(255,255,255,0.5)"
                        style={{ transform: [{ rotate: "90deg" }] }}
                      />
                    </View>

                    {/* Card number */}
                    <View style={st.cardNumberRow}>
                      <Text style={st.cardDots}>••••</Text>
                      <Text style={st.cardDots}>••••</Text>
                      <Text style={st.cardDots}>••••</Text>
                      <Text style={st.cardLast4}>{cardInfo.lastFour}</Text>
                    </View>

                    {/* Card bottom */}
                    <View style={st.cardBottomRow}>
                      <View>
                        {cardInfo.holderName ? (
                          <Text style={st.cardHolder}>
                            {cardInfo.holderName}
                          </Text>
                        ) : (
                          <Text style={st.cardHolder}>TARJETAHABIENTE</Text>
                        )}
                        <Text style={st.cardExpiry}>EXP {cardInfo.expiry}</Text>
                      </View>
                      <Text style={st.cardBrand}>{cardInfo.label}</Text>
                    </View>
                  </LinearGradient>
                )}

                {/* Success indicator */}
                <View style={st.successRow}>
                  <View style={st.successIcon}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                  <Text style={[st.successTxt, { color: colors.text }]}>
                    {cardInfo.device === "apple-pay"
                      ? "Apple Pay detectado"
                      : "Tarjeta detectada"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCardInfo(null);
                      setNfcError(null);
                    }}
                  >
                    <Text
                      style={[st.successChange, { color: colors.textTertiary }]}
                    >
                      Cambiar
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Amount to charge */}
                <View
                  style={[
                    st.chargeAmountCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)",
                    },
                  ]}
                >
                  <Text
                    style={[st.chargeLabel, { color: colors.textTertiary }]}
                  >
                    {cardInfo.device === "apple-pay"
                      ? `Apple Pay · ${cardInfo.label} •••• ${cardInfo.lastFour}`
                      : `Cargo a ${cardInfo.label} •••• ${cardInfo.lastFour}`}
                  </Text>
                  <Text
                    style={[
                      st.chargeAmount,
                      { color: CARD_BRAND_COLORS[cardInfo.type] || "#6C5CE7" },
                    ]}
                  >
                    {fmt(total)}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TRANSFERENCIA ────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {method === "transferencia" && (
          <Animated.View entering={FadeIn.delay(150)} style={st.xferSection}>
            {/* Bank selector — horizontal cards */}
            <Text style={[st.xferSectionLabel, { color: colors.textTertiary }]}>
              BANCO DESTINO
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={st.xferBankScroll}
              contentContainerStyle={st.xferBankScrollInner}
            >
              {BANK_CLABES.map((b, i) => {
                const active = selectedBank.key === b.key;
                return (
                  <Animated.View
                    key={b.key}
                    entering={FadeInDown.delay(150 + i * 60).duration(350)}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedBank(b);
                        setClabeCopied(false);
                      }}
                      style={[
                        st.xferBankCard,
                        {
                          backgroundColor: active
                            ? b.color + "12"
                            : isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(0,0,0,0.02)",
                          borderColor: active
                            ? b.color + "45"
                            : isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[st.xferBankDot, { backgroundColor: b.color }]}
                      />
                      <Text
                        style={[
                          st.xferBankName,
                          {
                            color: active ? b.color : colors.text,
                            fontWeight: active ? "800" : "600",
                          },
                        ]}
                      >
                        {b.bank}
                      </Text>
                      <Text
                        style={[
                          st.xferBankCode,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {b.bancoCode}
                      </Text>
                      {active && (
                        <View
                          style={[
                            st.xferBankCheck,
                            { backgroundColor: b.color },
                          ]}
                        >
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>

            {/* ── Datos bancarios card ── */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(400)}
              style={[
                st.xferDataCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              {/* Header */}
              <View style={st.xferDataHeader}>
                <View
                  style={[
                    st.xferDataIcon,
                    { backgroundColor: selectedBank.color + "12" },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={selectedBank.color}
                  />
                </View>
                <Text style={[st.xferDataTitle, { color: colors.text }]}>
                  Datos para Transferencia
                </Text>
              </View>

              {/* Rows */}
              <View style={st.xferDataRows}>
                {/* Beneficiario */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    Beneficiario
                  </Text>
                  <Text style={[st.xferDataValue, { color: colors.text }]}>
                    {selectedBank.beneficiario}
                  </Text>
                </View>

                <View
                  style={[
                    st.xferDataDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                />

                {/* Banco */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    Banco
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={[
                        st.xferBankDotSmall,
                        { backgroundColor: selectedBank.color },
                      ]}
                    />
                    <Text style={[st.xferDataValue, { color: colors.text }]}>
                      {selectedBank.bank}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    st.xferDataDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                />

                {/* CLABE */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    CLABE Interbancaria
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setClabeCopied(true);
                      setTimeout(() => setClabeCopied(false), 3000);
                    }}
                    style={st.xferClabeRow}
                  >
                    <Text style={[st.xferClabeNum, { color: colors.text }]}>
                      {selectedBank.clabe.replace(
                        /(\d{3})(\d{3})(\d{11})(\d{1})/,
                        "$1 $2 $3 $4",
                      )}
                    </Text>
                    <View
                      style={[
                        st.xferCopyBtn,
                        {
                          backgroundColor: clabeCopied
                            ? "#34C75915"
                            : selectedBank.color + "12",
                        },
                      ]}
                    >
                      <Ionicons
                        name={clabeCopied ? "checkmark" : "copy-outline"}
                        size={13}
                        color={clabeCopied ? "#34C759" : selectedBank.color}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    st.xferDataDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                />

                {/* Referencia */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    Referencia
                  </Text>
                  <Text
                    style={[
                      st.xferDataValue,
                      {
                        color: colors.text,
                        fontVariant: ["tabular-nums"],
                        letterSpacing: 1,
                      },
                    ]}
                  >
                    {selectedBank.referencia}
                  </Text>
                </View>

                <View
                  style={[
                    st.xferDataDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                />

                {/* Concepto */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    Concepto
                  </Text>
                  <Text style={[st.xferDataValue, { color: colors.text }]}>
                    Pago POS — {clientName}
                  </Text>
                </View>

                <View
                  style={[
                    st.xferDataDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                />

                {/* Monto */}
                <View style={st.xferDataRow}>
                  <Text
                    style={[st.xferDataLabel, { color: colors.textTertiary }]}
                  >
                    Monto
                  </Text>
                  <Text
                    style={[
                      st.xferDataValue,
                      { color: "#007AFF", fontWeight: "800", fontSize: 16 },
                    ]}
                  >
                    {fmt(total)}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Hint */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(350)}
              style={st.xferHintCard}
            >
              <View
                style={[
                  st.xferHintIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(0,122,255,0.1)"
                      : "rgba(0,122,255,0.06)",
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
              </View>
              <Text style={[st.xferHintText, { color: colors.textTertiary }]}>
                Solicite la transferencia SPEI al cliente.{"\n"}Al confirmar se
                pedirá autorización de su supervisor.
              </Text>
            </Animated.View>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Summary Modal ────────────────────────────────────────────── */}
      <Modal
        visible={summaryVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setSummaryVisible(false)}
      >
        <View style={st.smOverlay}>
          <BlurView
            intensity={isDark ? 90 : 95}
            tint={isDark ? "dark" : "light"}
            style={[
              st.smSheet,
              {
                backgroundColor: isDark
                  ? "rgba(20,20,22,0.92)"
                  : "rgba(245,245,247,0.93)",
              },
            ]}
          >
            {/* Handle */}
            <View style={st.smHandle} />

            {/* Header */}
            <View style={st.smHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[st.smTitle, { color: colors.text }]}>
                  Resumen de Compra
                </Text>
                <Text style={[st.smSubtitle, { color: colors.textTertiary }]}>
                  {count} artículos · {qty} piezas
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSummaryVisible(false)}
                style={[
                  st.smCloseBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Client pill */}
            <View
              style={[
                st.smClientPill,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={13}
                color={colors.textTertiary}
              />
              <Text
                style={[st.smClientName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {clientName}
              </Text>
            </View>

            {/* Items list */}
            <FlatList
              data={cartItems}
              keyExtractor={(item, idx) => `${item.clave}-${idx}`}
              showsVerticalScrollIndicator={false}
              style={st.smList}
              contentContainerStyle={{ paddingBottom: 8 }}
              ItemSeparatorComponent={() => (
                <View
                  style={[
                    st.smSeparator,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                />
              )}
              renderItem={({ item, index }) => {
                const lineTotal = item.cantidad * item.precio;
                const hasDiscount =
                  item.precioLista > item.precio && item.precioLista > 0;
                const discountPct = hasDiscount
                  ? Math.round((1 - item.precio / item.precioLista) * 100)
                  : 0;
                const discountAmt = hasDiscount
                  ? (item.precioLista - item.precio) * item.cantidad
                  : 0;
                return (
                  <Animated.View
                    entering={FadeInDown.delay(index * 40).duration(350)}
                    style={st.smItem}
                  >
                    {/* Row number */}
                    <View
                      style={[
                        st.smItemNum,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          st.smItemNumTxt,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={st.smItemInfo}>
                      <Text style={[st.smItemClave, { color: colors.accent }]}>
                        {item.clave}
                      </Text>
                      <Text
                        style={[st.smItemDesc, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {item.descripcion}
                      </Text>
                      <View style={st.smItemMeta}>
                        <Text
                          style={[
                            st.smItemQty,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.cantidad} {item.umed || "pza"} ×{" "}
                          {fmt(item.precio)}
                        </Text>
                        {hasDiscount && (
                          <View style={st.smDiscountBadge}>
                            <Ionicons
                              name="pricetag"
                              size={9}
                              color="#34C759"
                            />
                            <Text style={st.smDiscountTxt}>
                              -{discountPct}%
                            </Text>
                          </View>
                        )}
                      </View>
                      {hasDiscount && (
                        <View style={st.smDiscountRow}>
                          <Text style={st.smDiscountOld}>
                            P. Lista: {fmt(item.precioLista)}
                          </Text>
                          <Text style={st.smDiscountSave}>
                            Ahorras {fmt(discountAmt)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Line total */}
                    <Text style={[st.smItemTotal, { color: colors.text }]}>
                      {fmt(lineTotal)}
                    </Text>
                  </Animated.View>
                );
              }}
              ListEmptyComponent={
                <View style={st.smEmpty}>
                  <Ionicons
                    name="cart-outline"
                    size={40}
                    color={colors.textTertiary}
                  />
                  <Text style={[st.smEmptyTxt, { color: colors.textTertiary }]}>
                    Sin artículos
                  </Text>
                </View>
              }
            />

            {/* Footer totals */}
            <View
              style={[
                st.smFooter,
                {
                  borderTopColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              {savings > 0 && (
                <View style={st.smFooterRow}>
                  <View style={st.smSavingsLabel}>
                    <Ionicons name="pricetag" size={13} color="#34C759" />
                    <Text style={st.smSavingsTxt}>Descuento total</Text>
                  </View>
                  <Text style={st.smSavingsAmt}>-{fmt(savings)}</Text>
                </View>
              )}
              <View style={st.smFooterRow}>
                <Text
                  style={[st.smTotalLabel, { color: colors.textSecondary }]}
                >
                  Total
                </Text>
                <Text style={[st.smTotalValue, { color: colors.text }]}>
                  {fmt(total)}
                </Text>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ── Auth Modal (Transfer) ──────────────────────────────────── */}
      <Modal
        visible={authModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <View style={st.mdOverlay}>
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? "dark" : "light"}
            style={st.mdOverlayBlur}
          />
          <Animated.View
            entering={FadeInDown.duration(400).springify().damping(18)}
            style={[
              st.mdCard,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
            ]}
          >
            {/* Decorative top gradient bar */}
            <LinearGradient
              colors={["#FF9F0A", "#FF6723"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.mdTopBar}
            />

            {/* Icon */}
            <View style={[st.mdIconCircle, { backgroundColor: "#FF9F0A14" }]}>
              <View style={[st.mdIconInner, { backgroundColor: "#FF9F0A20" }]}>
                <Ionicons name="shield-checkmark" size={36} color="#FF9F0A" />
              </View>
            </View>

            <Text style={[st.mdTitle, { color: colors.text }]}>
              Autorización Requerida
            </Text>
            <Text style={[st.mdBody, { color: colors.textSecondary }]}>
              Confirma que el pago SPEI por{" "}
              <Text style={{ fontWeight: "800", color: colors.text }}>
                {fmt(total)}
              </Text>{" "}
              ha sido recibido en{" "}
              <Text style={{ fontWeight: "700", color: selectedBank.color }}>
                {selectedBank.bank}
              </Text>
            </Text>

            {/* CLABE card */}
            <View
              style={[
                st.mdInfoCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.025)",
                },
              ]}
            >
              <View style={st.mdInfoRow}>
                <View
                  style={[
                    st.mdInfoIcon,
                    { backgroundColor: selectedBank.color + "15" },
                  ]}
                >
                  <Ionicons
                    name="business"
                    size={14}
                    color={selectedBank.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                  >
                    CLABE Interbancaria
                  </Text>
                  <Text style={[st.mdInfoValue, { color: colors.text }]}>
                    {selectedBank.clabe.replace(
                      /(\d{3})(\d{3})(\d{11})(\d{1})/,
                      "$1 $2 $3 $4",
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Password section */}
            <View style={st.mdPasswordSection}>
              <Text style={[st.mdInputLabel, { color: colors.textSecondary }]}>
                Contraseña de supervisor
              </Text>
              <View
                style={[
                  st.mdInputWrap,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(120,120,128,0.08)",
                    borderColor: authError ? "#FF3B30" : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    st.mdLockIcon,
                    {
                      backgroundColor: authError
                        ? "#FF3B3015"
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={15}
                    color={authError ? "#FF3B30" : colors.textTertiary}
                  />
                </View>
                <TextInput
                  value={authPassword}
                  onChangeText={(t) => {
                    setAuthPassword(t);
                    setAuthError(false);
                  }}
                  placeholder="Ingresa el PIN"
                  placeholderTextColor={
                    isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"
                  }
                  secureTextEntry
                  keyboardType="number-pad"
                  autoFocus
                  maxLength={8}
                  style={[st.mdInput, { color: colors.text }]}
                />
                {authPassword.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAuthPassword("")}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {authError && (
                <View style={st.mdErrorRow}>
                  <Ionicons name="alert-circle" size={13} color="#FF3B30" />
                  <Text style={st.mdErrorTxt}>Contraseña incorrecta</Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={st.mdBtnRow}>
              <TouchableOpacity
                style={[
                  st.mdBtnFull,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(120,120,128,0.12)",
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setAuthModalVisible(false)}
              >
                <Text style={[st.mdBtnLabel, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  st.mdBtnFull,
                  st.mdBtnAccent,
                  { opacity: authPassword.length >= 4 ? 1 : 0.45 },
                ]}
                activeOpacity={0.7}
                disabled={authPassword.length < 4}
                onPress={handleAuthVerify}
              >
                <Ionicons name="shield-checkmark" size={18} color="#fff" />
                <Text style={[st.mdBtnLabel, { color: "#fff" }]}>
                  Verificar Pago
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Success Modal ────────────────────────────────────────────── */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={handleSuccessDismiss}
      >
        <View style={st.mdOverlay}>
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? "dark" : "light"}
            style={st.mdOverlayBlur}
          />
          <Animated.View
            entering={FadeInDown.duration(400).springify().damping(18)}
            style={[
              st.mdCard,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", maxHeight: '90%' },
            ]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ width: '100%' }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {/* Decorative top gradient bar */}
              <LinearGradient
                colors={["#34C759", "#30D158"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.mdTopBar}
              />

              {/* Success icon */}
              <View style={[st.mdIconCircle, { backgroundColor: "#34C75912" }]}>
                <View style={[st.mdIconInner, { backgroundColor: "#34C75920" }]}>
                  <Ionicons name="checkmark-circle" size={42} color="#34C759" />
                </View>
              </View>

              <Text style={[st.mdTitle, { color: colors.text }]}>
                ¡Venta Registrada!
              </Text>
              <Text style={[st.mdSubtitle, { color: colors.textTertiary }]}>
                Operación completada exitosamente
              </Text>

              {/* Details card */}
              <View
                style={[
                  st.mdInfoCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.025)",
                  },
                ]}
              >
                <View style={st.mdInfoRow}>
                  <View
                    style={[
                      st.mdInfoIcon,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                    >
                      Cliente
                    </Text>
                    <Text
                      style={[st.mdInfoValue, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {clientName}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    st.mdInfoDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                />
                <View style={st.mdInfoRow}>
                  <View
                    style={[
                      st.mdInfoIcon,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="cube"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                    >
                      Artículos
                    </Text>
                    <Text style={[st.mdInfoValue, { color: colors.text }]}>
                      {count} artículos · {qty} piezas
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    st.mdInfoDivider,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                />
                <View style={st.mdInfoRow}>
                  <View
                    style={[
                      st.mdInfoIcon,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        method === "efectivo"
                          ? "cash"
                          : method === "tarjeta"
                            ? "card"
                            : "swap-horizontal"
                      }
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                    >
                      Método de pago
                    </Text>
                    <Text style={[st.mdInfoValue, { color: colors.text }]}>
                      {successMethodLabel}
                    </Text>
                  </View>
                </View>
                {method === "efectivo" && change > 0 && (
                  <>
                    <View
                      style={[
                        st.mdInfoDivider,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        },
                      ]}
                    />
                    <View style={st.mdInfoRow}>
                      <View
                        style={[st.mdInfoIcon, { backgroundColor: "#FF9F0A12" }]}
                      >
                        <Ionicons name="arrow-undo" size={14} color="#FF9F0A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                        >
                          Cambio
                        </Text>
                        <Text
                          style={[
                            st.mdInfoValue,
                            { color: "#FF9F0A", fontWeight: "800" },
                          ]}
                        >
                          {fmt(change)}
                        </Text>
                      </View>
                      <View style={st.mdChangeBadge}>
                        <Text style={st.mdChangeBadgeTxt}>
                          Recibido {fmt(received)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                {method === "tarjeta" && cardInfo && (
                  <>
                    <View
                      style={[
                        st.mdInfoDivider,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        },
                      ]}
                    />
                    <View style={st.mdInfoRow}>
                      <View
                        style={[
                          st.mdInfoIcon,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        ]}
                      >
                        <Ionicons
                          name="card"
                          size={14}
                          color={colors.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                        >
                          Tarjeta
                        </Text>
                        <Text style={[st.mdInfoValue, { color: colors.text }]}>
                          {cardInfo.label} •••• {cardInfo.lastFour}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                {method === "transferencia" && (
                  <>
                    <View
                      style={[
                        st.mdInfoDivider,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                        },
                      ]}
                    />
                    <View style={st.mdInfoRow}>
                      <View
                        style={[st.mdInfoIcon, { backgroundColor: selectedBank.color + "15" }]}
                      >
                        <Ionicons
                          name="business"
                          size={14}
                          color={selectedBank.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[st.mdInfoLabel, { color: colors.textTertiary }]}
                        >
                          Banco
                        </Text>
                        <Text style={[st.mdInfoValue, { color: colors.text }]}>
                          {selectedBank.bank}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Total hero */}
              <View style={st.mdTotalRow}>
                <Text style={[st.mdTotalLabel, { color: colors.textTertiary }]}>
                  Total cobrado
                </Text>
                <Text style={[st.mdTotalValue, { color: "#34C759" }]}>
                  {fmt(total)}
                </Text>
              </View>

              <TouchableOpacity 
                style={st.mdCloseBtn} 
                onPress={handleSuccessDismiss}
              >
                <Ionicons name="close-circle" size={28} color={colors.textTertiary + '80'} />
              </TouchableOpacity>

              {/* Action buttons — Ticket & Factura */}
              <View style={st.mdActionsRow}>
                <TouchableOpacity
                  style={[
                    st.mdActionBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTicketModalVisible(true);
                  }}

                >
                  <View
                    style={[
                      st.mdActionIconWrap,
                      { backgroundColor: "#007AFF14" },
                    ]}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#007AFF" />
                  </View>
                  <Text style={[st.mdActionLabel, { color: colors.text }]}>
                    Ticket
                  </Text>
                  <Text style={[st.mdActionHint, { color: colors.textTertiary }]}>
                    Imprimir
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    st.mdActionBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // TODO: generar factura
                  }}
                >
                  <View
                    style={[
                      st.mdActionIconWrap,
                      { backgroundColor: "#5856D614" },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#5856D6"
                    />
                  </View>
                  <Text style={[st.mdActionLabel, { color: colors.text }]}>
                    Facturar
                  </Text>
                  <Text style={[st.mdActionHint, { color: colors.textTertiary }]}>
                    CFDI
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Close — green master button */}
              <TouchableOpacity
                style={[
                  st.mdBtnFull,
                  st.mdBtnSuccess,
                  {
                    marginHorizontal: 20,
                    marginBottom: 24,
                    alignSelf: "stretch",
                  },
                ]}
                activeOpacity={0.7}
                onPress={handleSuccessDismiss}
              >
                <Text style={[st.mdBtnLabel, { color: "#fff" }]}>Finalizar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <TicketModal
        visible={ticketModalVisible}
        onClose={handleTicketClose}
        ticketData={{
          folio: lastSaleInfo?.folio || `V-${new Date().getTime().toString().slice(-6)}`,
          fecha: lastSaleInfo?.fecha || new Date().toLocaleDateString(),
          hora: lastSaleInfo?.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cliente: clientName,
          items: cartItems.map((it) => ({
            clave: it.clave,
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precio: it.precio,
          })),
          total: total,
          metodoPago: lastSaleInfo?.metodoPago || (successMethodLabel || method),
          recibido: method === "efectivo" ? received : total,
          cambio: method === "efectivo" ? change : 0,
        }}
      />

      {/* ── Bottom slide-to-confirm ────────────────────────────────────── */}
      <View
        style={[st.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <SlideToConfirm
          enabled={canConfirm}
          gradient={selectedMethod.gradient}
          label={
            method === "tarjeta" && !cardInfo
              ? "Esperando tarjeta..."
              : "Desliza para confirmar"
          }
          amount={fmt(total)}
          onConfirm={handleConfirm}
          isDark={isDark}
        />
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerInner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  /* Content */
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentInner: {
    paddingBottom: 140,
  },

  /* Total */
  totalSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 56,
    fontWeight: "200",
    letterSpacing: -3,
    fontVariant: ["tabular-nums"],
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  metaTxt: { fontSize: 11, fontWeight: "600" },

  /* Section label */
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  /* Payment methods */
  methodsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  methodSub: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
  },
  methodCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Cash input */
  cashSection: {},
  inputDisplay: {
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  inputAmount: {
    fontSize: 44,
    fontWeight: "200",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    backgroundColor: "#34C75910",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
  },
  changeLabel: { fontSize: 12, fontWeight: "600" },
  changeAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34C759",
    fontVariant: ["tabular-nums"],
  },

  /* Quick amounts */
  quickRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  quickTxt: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  /* Keypad */
  keypad: {
    gap: 6,
    maxHeight: 260,
  },
  keyRow: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    flex: 1,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    height: 56,
  },
  keyTxt: {
    fontSize: 26,
    fontWeight: "400",
    fontVariant: ["tabular-nums"],
  },

  /* ── NFC / Card Section ─────────────────────────────────────────────────── */
  cardSection: {
    flex: 1,
  },
  nfcCenter: {
    alignItems: "center",
    paddingVertical: 24,
  },

  /* Pulse animation */
  pulseContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },

  nfcIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  nfcTitle: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  nfcHint: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  nfcBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  nfcBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nfcBadgeTxt: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  nfcActionsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    paddingHorizontal: 20,
  },
  nfcActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  nfcActionTxt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  nfcActionTxtAlt: {
    fontSize: 14,
    fontWeight: "600",
  },

  /* ── Detected Card ──────────────────────────────────────────────────────── */
  detectedCard: {
    alignItems: "center",
    paddingTop: 4,
  },

  /* Apple Watch visual */
  watchContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  watchBody: {
    width: 160,
    height: 190,
    borderRadius: 36,
    padding: 10,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
    }),
  },
  watchCrown: {
    position: "absolute",
    right: -6,
    top: 52,
    width: 6,
    height: 24,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  watchButton: {
    position: "absolute",
    right: -5,
    top: 86,
    width: 5,
    height: 14,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  watchScreen: {
    flex: 1,
    borderRadius: 28,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  watchOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -30,
    right: -30,
  },
  watchPayIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  watchCardInfo: {
    alignItems: "center",
    gap: 4,
  },
  watchBrand: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.5,
  },
  watchDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  watchDots: {
    fontSize: 13,
    fontWeight: "300",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 2,
  },
  watchLast4: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  watchCheck: {
    marginTop: 2,
  },

  cardVisual: {
    width: "100%",
    aspectRatio: 1.586, // Standard card proportions
    borderRadius: 16,
    padding: 20,
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  cardChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardChip: {
    width: 36,
    height: 26,
    borderRadius: 5,
    backgroundColor: "rgba(255,215,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardChipInner: {
    width: 24,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "rgba(200,160,0,0.4)",
    backgroundColor: "rgba(255,215,0,0.6)",
  },
  cardNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardDots: {
    fontSize: 22,
    fontWeight: "300",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
  },
  cardLast4: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 3,
    fontVariant: ["tabular-nums"],
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardHolder: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
  cardBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },

  /* Success indicator */
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
  },
  successTxt: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  successChange: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  /* Charge amount */
  chargeAmountCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  chargeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  chargeAmount: {
    fontSize: 36,
    fontWeight: "200",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },

  /* ── Transfer / SPEI ─────────────────────────────────────────────── */
  xferSection: {
    gap: 0,
  },

  /* Amount hero card */
  xferAmountCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  xferAmountGrad: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  xferAmountOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -60,
    right: -40,
  },
  xferAmountOrb2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  xferAmountLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginBottom: 4,
  },
  xferAmountValue: {
    fontSize: 42,
    fontWeight: "200",
    color: "#fff",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  xferAmountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  xferAmountBadgeTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
  },

  /* Section label */
  xferSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  /* Bank selector scroll */
  xferBankScroll: {
    marginBottom: 14,
    marginHorizontal: -20,
  },
  xferBankScrollInner: {
    paddingHorizontal: 20,
    gap: 8,
  },
  xferBankCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
  },
  xferBankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  xferBankName: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  xferBankCode: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  xferBankCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },

  /* Data card */
  xferDataCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  xferDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  xferDataIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  xferDataTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  xferDataRows: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  xferDataRow: {
    paddingVertical: 8,
  },
  xferDataLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  xferDataValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  xferDataDivider: {
    height: StyleSheet.hairlineWidth,
  },
  xferBankDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  xferClabeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  xferClabeNum: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    fontVariant: ["tabular-nums"],
  },
  xferCopyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Hint */
  xferHintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 4,
  },
  xferHintIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  xferHintText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    flex: 1,
  },

  /* Bottom */
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  /* Abrir Caja button */
  cajaBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  cajaBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cajaBtnTextWrap: {
    flex: 1,
  },
  cajaBtnLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cajaBtnHint: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },

  /* Slide to confirm */
  sliderTrack: {
    height: SLIDER_H,
    borderRadius: SLIDER_H / 2,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  sliderFill: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: SLIDER_H / 2,
    overflow: "hidden",
  },
  sliderFillGrad: {
    flex: 1,
    borderRadius: SLIDER_H / 2,
  },
  sliderLabelWrap: {
    position: "absolute",
    left: THUMB_SIZE + SLIDER_PAD + 8,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sliderShimmer: {
    position: "absolute",
    left: -60,
    right: -60,
    top: -20,
    bottom: -20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sliderAmount: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  sliderCheckWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sliderCheckText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  sliderThumb: {
    position: "absolute",
    left: SLIDER_PAD,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },

  /* ── Auth / Success Modals ──────────────────────────────────────────── */
  mdOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mdOverlayBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  mdCard: {
    width: "100%",
    maxWidth: 370,
    borderRadius: 28,
    padding: 0,
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 32,
      },
      android: { elevation: 16 },
    }),
  },
  mdTopBar: {
    width: "100%",
    height: 4,
  },
  mdIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    marginBottom: 4,
  },
  mdIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mdTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  mdSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  mdBody: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 28,
  },
  mdInfoCard: {
    alignSelf: "stretch",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    overflow: "hidden",
  },
  mdInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mdInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mdInfoLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  mdInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  mdInfoDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  mdPasswordSection: {
    alignSelf: "stretch",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  mdInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  mdInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 12,
    borderWidth: 2,
    height: 48,
  },
  mdLockIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  mdInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    padding: 0,
    letterSpacing: 3,
  },
  mdErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  mdErrorTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF3B30",
  },
  mdBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignSelf: "stretch",
  },
  mdBtnFull: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  mdCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  mdBtnAccent: {
    backgroundColor: "#FF9F0A",
  },
  mdBtnSuccess: {
    backgroundColor: "#34C759",
  },
  mdBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  mdActionsRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  mdActionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
  },
  mdActionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  mdActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  mdActionHint: {
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mdChangeBadge: {
    backgroundColor: "#FF9F0A14",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mdChangeBadgeTxt: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF9F0A",
  },
  mdTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  mdTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  mdTotalValue: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums" as const],
  },

  /* ── Summary Modal ──────────────────────────────────────────────────── */
  smOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  smSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingTop: 12,
  },
  smHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.35)",
    alignSelf: "center",
    marginBottom: 10,
  },
  smHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  smTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  smSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  smCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  smClientPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  smClientName: {
    fontSize: 12,
    fontWeight: "600",
  },
  smList: {
    paddingHorizontal: 16,
  },
  smSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  smItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 10,
  },
  smItemNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  smItemNumTxt: {
    fontSize: 11,
    fontWeight: "800",
  },
  smItemInfo: {
    flex: 1,
  },
  smItemClave: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  smItemDesc: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
    marginBottom: 3,
  },
  smItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  smItemQty: {
    fontSize: 11,
    fontWeight: "500",
  },
  smDiscountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#34C75914",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smDiscountTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34C759",
  },
  smDiscountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  smDiscountOld: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FF3B30",
    textDecorationLine: "line-through",
  },
  smDiscountSave: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34C759",
  },
  smItemTotal: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  smEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  smEmptyTxt: {
    fontSize: 14,
    fontWeight: "600",
  },
  smFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 6,
  },
  smFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smSavingsLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  smSavingsTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34C759",
  },
  smSavingsAmt: {
    fontSize: 15,
    fontWeight: "800",
    color: "#34C759",
  },
  smTotalLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  smTotalValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
});
