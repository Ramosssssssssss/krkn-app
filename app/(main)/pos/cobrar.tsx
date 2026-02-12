import { useTheme, useThemeColors } from "@/context/theme-context";
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    "$" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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
        savings: string;
    }>();

    const total = parseFloat(params.total || "0");
    const count = parseInt(params.count || "0", 10);
    const qty = parseInt(params.qty || "0", 10);
    const clientName = params.client || "Cliente General";
    const savings = parseFloat(params.savings || "0");

    // ── State ──────────────────────────────────────────────────────────────────
    const [method, setMethod] = useState<PayMethod>("efectivo");
    const [inputStr, setInputStr] = useState("");

    // NFC state
    const [nfcReading, setNfcReading] = useState(false);
    const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
    const [nfcError, setNfcError] = useState<string | null>(null);
    const [nfcAvailable, setNfcAvailable] = useState<boolean | null>(null);
    const nfcActive = useRef(false);

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
        [received, total]
    );

    const isExact = method !== "efectivo";
    const canConfirm = method === "efectivo"
        ? received >= total
        : method === "tarjeta"
            ? !!cardInfo
            : true; // transferencia = always confirmable
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

    const startPulseAnimation = useCallback(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        ringScale.value = withRepeat(
            withSequence(
                withTiming(1.8, { duration: 2000, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 0 })
            ),
            -1,
            false
        );
        ringOpacity.value = withRepeat(
            withSequence(
                withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
                withTiming(0.4, { duration: 0 })
            ),
            -1,
            false
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
        [inputStr]
    );

    const onQuick = useCallback((amt: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setInputStr(String(amt));
    }, []);

    const onExact = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setInputStr(total.toFixed(2));
    }, [total]);

    // ── Confirm ────────────────────────────────────────────────────────────────
    const handleConfirm = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const methodLabel = selectedMethod.label;
        let msg = `${clientName}\n${count} artículos · ${qty} pzas\nMétodo: ${methodLabel}\nTotal: ${fmt(total)}`;

        if (method === "efectivo" && change > 0) {
            msg += `\nRecibido: ${fmt(received)}\nCambio: ${fmt(change)}`;
        }
        if (method === "tarjeta" && cardInfo) {
            msg += `\n\n${cardInfo.label} •••• ${cardInfo.lastFour}`;
            if (cardInfo.expiry !== "--/--") msg += `  Exp: ${cardInfo.expiry}`;
        }

        Alert.alert("¡Venta Registrada! ✓", msg, [
            {
                text: "OK",
                onPress: () => {
                    router.back();
                    setTimeout(() => {
                        router.setParams({ cleared: "1" });
                    }, 100);
                },
            },
        ]);
    }, [selectedMethod, clientName, count, qty, total, method, change, received, cardInfo]);

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
                    <View style={{ width: 44 }} />
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
                                <Text style={[st.quickTxt, { color: "#34C759" }]}>
                                    Exacto
                                </Text>
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
                                    <Ionicons name="alert-circle" size={48} color={colors.error} />
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
                                    Sostenga la tarjeta contactless{"\n"}sobre la parte trasera del
                                    dispositivo
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
                                    style={[
                                        st.nfcIconWrap,
                                        { backgroundColor: "#FF9F0A12" },
                                    ]}
                                >
                                    <Ionicons
                                        name="warning-outline"
                                        size={48}
                                        color="#FF9F0A"
                                    />
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
                                            style={[st.nfcActionTxtAlt, { color: colors.textSecondary }]}
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
                                    style={[
                                        st.nfcIconWrap,
                                        { backgroundColor: "#6C5CE712" },
                                    ]}
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
                                entering={SlideInUp.springify().damping(14)}
                                style={st.detectedCard}
                            >
                                {/* Card visual */}
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
                                        <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
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
                                            <Text style={st.cardExpiry}>
                                                EXP {cardInfo.expiry}
                                            </Text>
                                        </View>
                                        <Text style={st.cardBrand}>{cardInfo.label}</Text>
                                    </View>
                                </LinearGradient>

                                {/* Success indicator */}
                                <View style={st.successRow}>
                                    <View style={st.successIcon}>
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    </View>
                                    <Text style={[st.successTxt, { color: colors.text }]}>
                                        Tarjeta detectada
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setCardInfo(null);
                                            setNfcError(null);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                st.successChange,
                                                { color: colors.textTertiary },
                                            ]}
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
                                        Cargo a {cardInfo.label} •••• {cardInfo.lastFour}
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
                    <Animated.View entering={FadeIn.delay(150)} style={st.exactSection}>
                        <LinearGradient
                            colors={["#007AFF10", "transparent"]}
                            style={st.exactGlow}
                        />
                        <View
                            style={[st.exactIcon, { backgroundColor: "#007AFF15" }]}
                        >
                            <Ionicons name="swap-horizontal-outline" size={48} color="#007AFF" />
                        </View>
                        <Text style={[st.exactLabel, { color: colors.textSecondary }]}>
                            Cobro por transferencia
                        </Text>
                        <Text style={[st.exactAmount, { color: "#007AFF" }]}>
                            {fmt(total)}
                        </Text>
                        <Text style={[st.exactHint, { color: colors.textTertiary }]}>
                            Solicite la transferencia SPEI y confirme{"\n"}una vez recibida la
                            notificación
                        </Text>
                    </Animated.View>
                )}
            </ScrollView>

            {/* ── Bottom confirm button ──────────────────────────────────────────── */}
            <View
                style={[st.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
                <TouchableOpacity
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    disabled={!canConfirm}
                    style={{ borderRadius: 16, overflow: "hidden" }}
                >
                    <LinearGradient
                        colors={
                            canConfirm
                                ? [...selectedMethod.gradient]
                                : [
                                    isDark
                                        ? "rgba(255,255,255,0.08)"
                                        : "rgba(0,0,0,0.06)",
                                    isDark
                                        ? "rgba(255,255,255,0.04)"
                                        : "rgba(0,0,0,0.03)",
                                ]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={st.confirmBtn}
                    >
                        <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={canConfirm ? "#fff" : colors.textTertiary}
                        />
                        <Text
                            style={[
                                st.confirmTxt,
                                { color: canConfirm ? "#fff" : colors.textTertiary },
                            ]}
                        >
                            {method === "tarjeta" && !cardInfo
                                ? "Esperando tarjeta..."
                                : "Confirmar Cobro"}
                        </Text>
                        <Text
                            style={[
                                st.confirmPrice,
                                {
                                    color: canConfirm
                                        ? "rgba(255,255,255,0.8)"
                                        : colors.textTertiary,
                                },
                            ]}
                        >
                            {fmt(total)}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
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
        paddingBottom: 100,
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

    /* Exact (transfer) */
    exactSection: {
        alignItems: "center",
        paddingVertical: 24,
        overflow: "hidden",
    },
    exactGlow: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    exactIcon: {
        width: 100,
        height: 100,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    exactLabel: {
        fontSize: 15,
        fontWeight: "500",
        marginBottom: 4,
    },
    exactAmount: {
        fontSize: 48,
        fontWeight: "200",
        letterSpacing: -2.5,
        fontVariant: ["tabular-nums"],
        marginBottom: 8,
    },
    exactHint: {
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        paddingHorizontal: 40,
        lineHeight: 19,
    },

    /* Bottom */
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    confirmBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: { elevation: 6 },
        }),
    },
    confirmTxt: {
        fontSize: 17,
        fontWeight: "700",
    },
    confirmPrice: {
        fontSize: 17,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
        marginLeft: 2,
    },
});
