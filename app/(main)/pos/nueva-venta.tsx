import ScannerModal from "@/components/catalogos/ScannerModal";
import TicketModal from "@/components/pos/TicketModal";

import AppleAlertModal, { AppleAlertAction } from "@/components/pos/AppleAlertModal";
import ManagerAuthModal from "@/components/pos/ManagerAuthModal";
import ParkedSalesModal from "@/components/pos/ParkedSalesModal";
import { API_URL } from "@/config/api";
import { ParkedSale, useParkedSales } from "@/context/pos/parked-sales-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { useArticleScanner } from "@/hooks/use-article-scanner";
import { getCurrentDatabaseId } from "@/services/api";
import { ArticuloDetalle } from "@/types/inventarios";
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
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    Animated as RNAnimated,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────
type POSMode = "cobro" | "cotizacion";

interface Cliente {
  id: string;
  nombre: string;
  rfc?: string;
  tipo?: string;
  distribuidor?: boolean;
}

const CLIENTE_GENERAL: Cliente = {
  id: "0",
  nombre: "Cliente General",
  rfc: "XAXX010101000",
};

/** Resolve effective unit price based on client type */
const getEffectivePrice = (item: ArticuloDetalle, isDistribuidor: boolean) => {
  if (
    isDistribuidor &&
    item.precioDistribuidor &&
    item.precioDistribuidor > 0
  ) {
    return item.precioDistribuidor;
  }
  // Fallback: precioLista > precio > 0
  return item.precioLista || item.precio || 0;
};

const MODE_COLORS = {
  cobro: { gradient: ["#6C5CE7", "#a855f7"] as const, label: "Cobro" },
  cotizacion: {
    gradient: ["#f97316", "#f59e0b"] as const,
    label: "Cotización",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number): string =>
  "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ─────────────────────────────────────────────────────────────────────────────
export default function POSIndex() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Scanner ────────────────────────────────────────────────────────────────
  const {
    searchQuery,
    isSearching,
    detalles,
    lastAddedIndex,
    searchResults,
    searchInputRef,
    listRef,
    flashAnim,
    handleSearchChange,
    handleSearchSubmit,
    handleUpdateQuantity,
    handleSetQuantity,
    handleRemoveArticle,
    clearArticles,
    setDetalles,
    selectFromResults,
    dismissResults,
  } = useArticleScanner();

  // ── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<POSMode>("cobro");
  const [scanner, setScanner] = useState(false);
  const [client, setClient] = useState<Cliente>(CLIENTE_GENERAL);
  const [clientModal, setClientModal] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [cotNum, setCotNum] = useState(0);
  const [parkedModalVisible, setParkedModalVisible] = useState(false);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [appleAlert, setAppleAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actions: AppleAlertAction[];
  }>({ visible: false, title: "", message: "", actions: [] });

  const { parkedSales, parkSale, resumeSale } = useParkedSales();

  const params = useLocalSearchParams();

  // ── Reset cart after successful payment ────────────────────────────────
  useEffect(() => {
    if (params.cleared === '1') {
      clearArticles();
      setClient(CLIENTE_GENERAL);
      setMode("cobro");
      // Importante: No podemos limpiar los params directamente con setParams si venimos de un back,
      // pero el hook ya se disparará.
    }
  }, [params.cleared]);

  const showAlert = (title: string, message: string, actions: AppleAlertAction[]) => {
    setAppleAlert({ visible: true, title, message, actions });
  };


  const hiddenRef = useRef<TextInput>(null);
  const hiddenValRef = useRef("");
  const [hiddenVal, setHiddenVal] = useState("");
  const searchFocused = useRef(false);
  const pdaScanActive = useRef(false);
  const clienteDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch clientes desde API ───────────────────────────────────────────
  const fetchClientes = useCallback(async (busqueda = "") => {
    setClientesLoading(true);
    try {
      const databaseId = getCurrentDatabaseId();
      const res = await fetch(`${API_URL}/api/POS/clientes.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId, busqueda, limite: 50 }),
      });
      const text = await res.text();
      if (!text) {
        console.warn("[POS] Respuesta vacía del servidor");
        return;
      }
      const data = JSON.parse(text);
      if (data.success && Array.isArray(data.data)) {
        const mapped: Cliente[] = data.data.map((c: any) => ({
          id: String(c.CLIENTE_ID),
          nombre: c.NOMBRE,
          rfc: c.CLAVE_CLIENTE || "",
          tipo: c.TIPO_CLIENTE || "",
          distribuidor: (c.TIPO_CLIENTE || "")
            .toUpperCase()
            .includes("DISTRIBU"),
        }));
        setClientes(mapped);
      } else {
        console.warn("[POS] Clientes API error:", data.error || data);
      }
    } catch (err) {
      console.error("[POS] Error fetch clientes:", err);
    } finally {
      setClientesLoading(false);
    }
  }, []);

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (clientModal) {
      fetchClientes(clienteSearch);
    }
  }, [clientModal]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const count = detalles.length;
  const isDistribuidor = !!client.distribuidor;
  const totalQty = useMemo(
    () => detalles.reduce((s, d) => s + d.cantidad, 0),
    [detalles],
  );
  const total = useMemo(
    () =>
      detalles.reduce(
        (s, d) => s + d.cantidad * getEffectivePrice(d, isDistribuidor),
        0,
      ),
    [detalles, isDistribuidor],
  );
  // Total at lista price (to show savings when distribuidor is active)
  const totalLista = useMemo(
    () =>
      isDistribuidor
        ? detalles.reduce(
            (s, d) => s + d.cantidad * (d.precioLista || d.precio || 0),
            0,
          )
        : 0,
    [detalles, isDistribuidor],
  );
  const totalSavings = totalLista - total;
  const mc = MODE_COLORS[mode];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const switchMode = useCallback((m: POSMode) => {
    setMode(m);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const onCameraScan = useCallback(
    (code: string) => {
      setScanner(false);
      handleSearchChange(code);
      setTimeout(() => handleSearchSubmit(), 50);
      // Delay refocus so keyboard doesn't pop after camera closes
      setTimeout(() => hiddenRef.current?.focus(), 600);
    },
    [handleSearchChange, handleSearchSubmit],
  );

  const onHiddenChange = useCallback((text: string) => {
    hiddenValRef.current = text;
    setHiddenVal(text);
  }, []);

  const onHiddenSubmit = useCallback(() => {
    const c = hiddenValRef.current.trim();
    hiddenValRef.current = "";
    setHiddenVal("");
    if (c) {
      pdaScanActive.current = true;
      handleSearchChange(c);
      setTimeout(() => handleSearchSubmit(), 50);
    }
  }, [handleSearchChange, handleSearchSubmit]);

  // When search finishes after a PDA scan, dismiss keyboard and reclaim focus
  useEffect(() => {
    if (!isSearching && pdaScanActive.current) {
      Keyboard.dismiss();
      setTimeout(() => {
        hiddenRef.current?.focus();
      }, 50);
      setTimeout(() => {
        pdaScanActive.current = false;
      }, 600);
    }
  }, [isSearching]);

  const handleParkCurrentSale = useCallback(() => {
    if (detalles.length === 0) {
      showAlert("Sin artículos", "No hay artículos para poner en espera.", [
        { text: "Entendido", onPress: () => {} }
      ]);
      return;
    }
    
    parkSale(detalles, client, mode, total);
    clearArticles();
    setClient(CLIENTE_GENERAL);
    setMode("cobro");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [detalles, client, mode, total, parkSale, clearArticles]);

  const handleResumeSale = useCallback((sale: ParkedSale) => {
    if (detalles.length > 0) {
      showAlert(
        "Navegar entre Ventas",
        "¿Deseas intercambiar la venta actual con la seleccionada?",
        [
          { text: "Cancelar", style: "cancel", onPress: () => {} },
          { 
            text: "Intercambiar (Swap)", 
            onPress: () => {
              parkSale(detalles, client, mode, total);
              const restored = resumeSale(sale.id);
              if (restored) {
                setDetalles(restored.items);
                setClient(restored.client);
                setMode(restored.mode);
              }
              setParkedModalVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          },
          {
            text: "Reemplazar Actual",
            style: "destructive",
            onPress: () => {
              const restored = resumeSale(sale.id);
              if (restored) {
                setDetalles(restored.items);
                setClient(restored.client);
                setMode(restored.mode);
              }
              setParkedModalVisible(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }
        ]
      );
    } else {
      const restored = resumeSale(sale.id);
      if (restored) {
        setDetalles(restored.items);
        setClient(restored.client);
        setMode(restored.mode);
      }
      setParkedModalVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [detalles, client, mode, total, parkSale, resumeSale, setDetalles]);

  // Focus interval: keep hidden input focused when nothing else needs it
  useEffect(() => {
    const interval = setInterval(() => {
      if (!scanner && !clientModal && !confirmModal && !searchFocused.current && !pdaScanActive.current) {
        hiddenRef.current?.focus();
      }
    }, 400);
    return () => clearInterval(interval);
  }, [scanner, clientModal, confirmModal]);

  const onQtyTap = useCallback((item: ArticuloDetalle) => {
    setEditKey(item._key);
    setEditVal(String(item.cantidad));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const onQtyConfirm = useCallback(() => {
    if (editKey) {
      const q = parseInt(editVal, 10);
      if (!isNaN(q) && q >= 0) handleSetQuantity(editKey, q);
      setEditKey(null);
      setEditVal("");
    }
  }, [editKey, editVal, handleSetQuantity]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAction = useCallback(() => {
    if (!count) {
      Alert.alert("Sin artículos", "Escanea artículos para continuar.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (mode === "cobro") {
      // Navigate to checkout screen
      router.push({
        pathname: "/(main)/pos/cobrar",
        params: {
          total: total.toFixed(2),
          count: String(count),
          qty: String(totalQty),
          client: client.nombre,
          savings: totalSavings > 0 ? totalSavings.toFixed(2) : "0",
          items: JSON.stringify(
            detalles.map((d) => ({
              clave: d.clave,
              descripcion: d.descripcion,
              cantidad: d.cantidad,
              precio: getEffectivePrice(d, isDistribuidor),
              precioLista: d.precioLista || d.precio || 0,
              umed: d.umed,
            })),
          ),
        },
      });
    } else {
      // Cotización: show confirm modal
      setConfirmModal(true);
    }
  }, [count, mode, total, totalQty, client, totalSavings]);

  const handleConfirmCobro = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert(
      "¡Venta Registrada!",
      `${client.nombre}\n${count} artículos · ${totalQty} pzas\nTotal: ${fmt(total)}`,
      [
        {
          text: "OK",
          onPress: () => {
            clearArticles();
            setClient(CLIENTE_GENERAL);
            setMode("cobro");
            setConfirmModal(false);
          },
        },
      ],
    );
  }, [client, count, totalQty, total, clearArticles, showAlert]);

  const handleConfirmCot = useCallback(() => {
    const n = cotNum + 1;
    setCotNum(n);
    const folio = `COT-${String(n).padStart(4, "0")}`;
    const now = new Date();
    const fecha = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

    let txt = `═══ COTIZACIÓN ${folio} ═══\nFecha: ${fecha}\nCliente: ${client.nombre}\n`;
    if (client.rfc) txt += `RFC: ${client.rfc}\n`;
    txt += `─────────────────────\n`;
    detalles.forEach((d, i) => {
      const ep = getEffectivePrice(d, isDistribuidor);
      const lp = d.precioLista || d.precio || 0;
      const sub = ep * d.cantidad;
      let line = `${i + 1}. ${d.clave} — ${d.descripcion}\n   ${d.cantidad} ${d.umed || "pza"} × ${fmt(ep)} = ${fmt(sub)}`;
      if (isDistribuidor && lp > ep) {
        const pct = Math.round((1 - ep / lp) * 100);
        line += ` (Lista: ${fmt(lp)} → -${pct}%)`;
      }
      txt += line + "\n";
    });
    txt += `─────────────────────\nTotal: ${fmt(total)}`;
    if (isDistribuidor && totalSavings > 0) {
      txt += `\nAhorro distribuidor: ${fmt(totalSavings)}`;
    }
    txt += `\n═══════════════════\nKRKN POS`;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert("¡Cotización Generada!", `Folio: ${folio}\n${fmt(total)}`, [
      {
        text: "Compartir",
        onPress: () => {
          Share.share({ message: txt, title: `Cotización ${folio}` });
          setConfirmModal(false);
          clearArticles();
          setClient(CLIENTE_GENERAL);
          setMode("cobro");
        },
      },
      {
        text: "Nueva",
        style: "destructive",
        onPress: () => {
          clearArticles();
          setClient(CLIENTE_GENERAL);
          setMode("cobro");
          setConfirmModal(false);
        },
      },
      {
        text: "Ver Ticket",
        onPress: () => {
          setConfirmModal(false);
          setTicketModalVisible(true);
          clearArticles();
          setClient(CLIENTE_GENERAL);
          setMode("cobro");
        },
      },
      { 
        text: "OK", 
        onPress: () => {
          setConfirmModal(false);
          clearArticles();
          setClient(CLIENTE_GENERAL);
          setMode("cobro");
        } 
      },
    ]);

  }, [
    client,
    detalles,
    total,
    totalSavings,
    isDistribuidor,
    cotNum,
    clearArticles,
  ]);

  // ── Render Item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: ArticuloDetalle; index: number }) => {
      const isFlash = lastAddedIndex === index;
      const effectivePrice = getEffectivePrice(item, isDistribuidor);
      const sub = effectivePrice * item.cantidad;
      const listaPrice = item.precioLista || item.precio || 0;
      const hasDiscount =
        isDistribuidor &&
        item.precioDistribuidor &&
        item.precioDistribuidor > 0 &&
        listaPrice > effectivePrice;
      const discountPct = hasDiscount
        ? Math.round((1 - effectivePrice / listaPrice) * 100)
        : 0;

      const bg = flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.surface, mc.gradient[0] + "18"],
      });

      return (
        <RNAnimated.View
          style={[
            s.itemRow,
            {
              backgroundColor: isFlash ? bg : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={s.itemLeft}>
            <View style={s.itemTopRow}>
              <View style={s.itemClaveRow}>
                <Text
                  style={[s.itemClave, { color: mc.gradient[0] }]}
                  numberOfLines={1}
                >
                  {item.clave}
                </Text>
                {hasDiscount && (
                  <View style={s.discountBadge}>
                    <Text style={s.discountBadgeTxt}>-{discountPct}%</Text>
                  </View>
                )}
              </View>
              <View style={s.itemPriceCol}>
                <Text style={[s.itemSub, { color: colors.text }]}>
                  {fmt(sub)}
                </Text>
                {hasDiscount && (
                  <Text
                    style={[s.itemSubStrike, { color: colors.textTertiary }]}
                  >
                    {fmt(listaPrice * item.cantidad)}
                  </Text>
                )}
              </View>
            </View>
            <Text
              style={[s.itemDesc, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.descripcion}
            </Text>

            {/* Bottom row: qty + unit price */}
            <View style={s.itemBtm}>
              <View style={s.qtyRow}>
                <TouchableOpacity
                  style={[
                    s.qtyBtn,
                    {
                      backgroundColor:
                        item.cantidad <= 1
                          ? colors.error + "12"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => {
                    if (item.cantidad <= 1) {
                      handleRemoveArticle(item._key);
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Warning,
                      );
                    } else {
                      handleUpdateQuantity(item._key, -1);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Ionicons
                    name={item.cantidad <= 1 ? "trash-outline" : "remove"}
                    size={15}
                    color={item.cantidad <= 1 ? colors.error : colors.text}
                  />
                </TouchableOpacity>

                {editKey === item._key ? (
                  <TextInput
                    autoFocus
                    value={editVal}
                    onChangeText={setEditVal}
                    onBlur={onQtyConfirm}
                    onSubmitEditing={onQtyConfirm}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={[
                      s.qtyInput,
                      {
                        color: colors.text,
                        backgroundColor: mc.gradient[0] + "12",
                        borderColor: mc.gradient[0],
                      },
                    ]}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => onQtyTap(item)}
                    style={[
                      s.qtyVal,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                  >
                    <Text style={[s.qtyTxt, { color: colors.text }]}>
                      {item.cantidad}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    s.qtyBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => {
                    handleUpdateQuantity(item._key, 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="add" size={15} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={s.priceCol}>
                <Text
                  style={[
                    s.unitPrice,
                    { color: hasDiscount ? "#34C759" : colors.textTertiary },
                  ]}
                >
                  {fmt(effectivePrice)} c/u
                </Text>
                {hasDiscount && (
                  <Text
                    style={[s.unitPriceStrike, { color: colors.textTertiary }]}
                  >
                    {fmt(listaPrice)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </RNAnimated.View>
      );
    },
    [
      lastAddedIndex,
      flashAnim,
      colors,
      isDark,
      mc,
      editKey,
      editVal,
      onQtyTap,
      onQtyConfirm,
      handleUpdateQuantity,
      handleRemoveArticle,
      isDistribuidor,
    ],
  );

  // ── Search results modal ───────────────────────────────────────────────────
  const renderSearchResults = () => {
    if (!searchResults.length) return null;
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={dismissResults}
      >
        <View style={s.overlay}>
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            style={[s.srModal, { backgroundColor: colors.surface }]}
          >
            <View style={s.srHeader}>
              <Text style={[s.srTitle, { color: colors.text }]}>
                Selecciona artículo
              </Text>
              <TouchableOpacity onPress={dismissResults}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(r, i) => `sr-${r.ARTICULO_ID || i}`}
              renderItem={({ item: r }) => (
                <TouchableOpacity
                  style={[s.srItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectFromResults(r)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.srClave, { color: mc.gradient[0] }]}>
                      {r.CLAVE || r.CLAVE_ARTICULO}
                    </Text>
                    <Text
                      style={[s.srNombre, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {r.NOMBRE}
                    </Text>
                  </View>
                  {r.PRECIO > 0 && (
                    <Text style={[s.srPrice, { color: colors.textSecondary }]}>
                      {fmt(r.PRECIO)}
                    </Text>
                  )}
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={mc.gradient[0]}
                  />
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Hidden PDA scanner */}
      <TextInput
        ref={hiddenRef}
        autoFocus
        showSoftInputOnFocus={false}
        caretHidden
        value={hiddenVal}
        onChangeText={onHiddenChange}
        style={s.hidden}
        onSubmitEditing={onHiddenSubmit}
        blurOnSubmit={false}
        onBlur={() => {
          if (!scanner && !clientModal && !confirmModal && !searchFocused.current) {
            setTimeout(() => hiddenRef.current?.focus(), 150);
          }
        }}
      />

      {/* ═══ Total + Header card ════════════════════════════════════════════ */}
      <View
        style={[
          s.topCard,
          {
            paddingTop: Math.max(insets.top, 16) + 4,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Gradient glow line */}
        <LinearGradient
          colors={["transparent", mc.gradient[0] + "50", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.glowLine}
        />

        {/* Header actions */}
        <View style={s.topActions}>
          <Text style={[s.brandLabel, { color: colors.textTertiary }]}>
            KRKN POS
          </Text>
          <View style={s.topBtns}>
            {count > 0 && (
              <TouchableOpacity
                style={[s.topBtn, { backgroundColor: colors.error + "12" }]}
                onPress={() =>
                  showAlert("Cancelar Venta", "¿Deseas eliminar todos los artículos actuales?", [
                    { text: "No, mantener", style: "cancel", onPress: () => {} },
                    {
                      text: "Cancelar Venta",
                      style: "destructive",
                      onPress: () => setManagerModalVisible(true),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={17} color={colors.error} />
              </TouchableOpacity>
            )}

            {count > 0 && (
              <TouchableOpacity
                style={[s.topBtn, { backgroundColor: colors.primary + "12" }]}
                onPress={handleParkCurrentSale}
              >
                <Ionicons name="pause-outline" size={17} color={colors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                s.topBtn, 
                { backgroundColor: parkedSales.length > 0 ? "#FF950012" : colors.textTertiary + "0A" }
              ]}
              onPress={() => setParkedModalVisible(true)}
            >
              <View>
                <Ionicons 
                  name="time-outline" 
                  size={18} 
                  color={parkedSales.length > 0 ? "#FF9500" : colors.textTertiary} 
                />
                {parkedSales.length > 0 && (
                  <View style={[s.badge, { backgroundColor: "#FF9500" }]}>
                    <Text style={s.badgeTxt}>{parkedSales.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.topBtn, { backgroundColor: mc.gradient[0] + "12" }]}
              onPress={() => setScanner(true)}
            >
              <Ionicons name="scan-outline" size={18} color={mc.gradient[0]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Big total */}
        <Text style={[s.totalAmount, { color: colors.text }]}>
          {fmt(total)}
        </Text>

        {/* Pills row */}
        <View style={s.pillsRow}>
          <View style={[s.pill, { backgroundColor: mc.gradient[0] + "12" }]}>
            <Text style={[s.pillTxt, { color: mc.gradient[0] }]}>
              {count} {count === 1 ? "artículo" : "artículos"}
            </Text>
          </View>
          <View
            style={[
              s.pill,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              },
            ]}
          >
            <Text style={[s.pillTxt, { color: colors.textSecondary }]}>
              {totalQty} pzas
            </Text>
          </View>
          {isDistribuidor && totalSavings > 0 && (
            <View style={[s.pill, { backgroundColor: "#34C75915" }]}>
              <Text style={[s.pillTxt, { color: "#34C759" }]}>
                Ahorras {fmt(totalSavings)}
              </Text>
            </View>
          )}
        </View>

        {/* Client selector */}
        <TouchableOpacity
          style={[
            s.clientRow,
            {
              backgroundColor: isDistribuidor
                ? "#34C75910"
                : isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              borderWidth: isDistribuidor ? 1 : 0,
              borderColor: isDistribuidor ? "#34C75930" : "transparent",
            },
          ]}
          onPress={() => setClientModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="person-circle-outline"
            size={18}
            color={isDistribuidor ? "#34C759" : colors.textTertiary}
          />
          <Text style={[s.clientTxt, { color: colors.text }]} numberOfLines={1}>
            {client.nombre}
          </Text>
          {isDistribuidor && (
            <View style={s.distBadge}>
              <Text style={s.distBadgeTxt}>DISTRIBUIDOR</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Search bar (inside top card) */}
        <View
          style={[
            s.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(142,142,147,0.12)",
            },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            ref={searchInputRef}
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Buscar clave, nombre o código..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => {
              handleSearchSubmit();
              // After submitting, release focus back to hidden scanner
              searchFocused.current = false;
              setTimeout(() => hiddenRef.current?.focus(), 200);
            }}
            onFocus={() => {
              if (pdaScanActive.current) {
                // PDA scan in progress — reject focus, dismiss keyboard
                Keyboard.dismiss();
                setTimeout(() => hiddenRef.current?.focus(), 50);
                return;
              }
              searchFocused.current = true;
            }}
            onBlur={() => {
              searchFocused.current = false;
              // Return focus to hidden PDA input after a short delay
              setTimeout(() => {
                if (!searchFocused.current) hiddenRef.current?.focus();
              }, 300);
            }}
            returnKeyType="search"
            autoCapitalize="characters"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={mc.gradient[0]} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => handleSearchChange("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ═══ Articles list ═════════════════════════════════════════════════ */}
      {!count ? (
        <View style={s.emptyWrap}>
          <Animated.View entering={FadeIn.delay(200)} style={s.emptyInner}>
            <LinearGradient
              colors={[mc.gradient[0] + "14", mc.gradient[1] + "08"]}
              style={s.emptyIcon}
            >
              <Ionicons
                name={
                  mode === "cobro" ? "cart-outline" : "document-text-outline"
                }
                size={40}
                color={mc.gradient[0]}
              />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              {mode === "cobro" ? "Comienza una venta" : "Nueva cotización"}
            </Text>
            <Text style={[s.emptySub, { color: colors.textTertiary }]}>
              Escanea un código de barras o busca un artículo
            </Text>
          </Animated.View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={detalles}
          renderItem={renderItem}
          keyExtractor={(i) => i._key}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 160,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={() => {}}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* ═══ Floating Dock (Picking-style) ═════════════════════════════════ */}
      <View
        style={[
          s.dockContainer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={s.dockShadow}>
          <BlurView
            intensity={Platform.OS === "ios" ? 90 : 100}
            tint={isDark ? "dark" : "light"}
            style={[
              s.dockBlur,
              {
                borderColor: colors.border,
                backgroundColor: (isDark ? colors.surface : "#fff") + "F0",
              },
            ]}
          />
          <View style={s.dockInner}>
            {/* Tab switcher */}
            <View
              style={[
                s.tabRow,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              {(["cobro", "cotizacion"] as POSMode[]).map((m) => {
                const active = mode === m;
                const mColors = MODE_COLORS[m];
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      s.tab,
                      active && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.10)"
                          : "#fff",
                        ...Platform.select({
                          ios: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                          },
                          android: { elevation: 2 },
                        }),
                      },
                    ]}
                    onPress={() => switchMode(m)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        m === "cobro" ? "card-outline" : "document-text-outline"
                      }
                      size={16}
                      color={active ? mColors.gradient[0] : colors.textTertiary}
                    />
                    <Text
                      style={[
                        s.tabLabel,
                        {
                          color: active
                            ? mColors.gradient[0]
                            : colors.textTertiary,
                          fontWeight: active ? "700" : "500",
                        },
                      ]}
                    >
                      {mColors.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action button — gradient like Picking */}
            <TouchableOpacity
              onPress={handleAction}
              activeOpacity={0.85}
              disabled={!count}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={
                  count > 0
                    ? [...mc.gradient]
                    : [
                        isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      ]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.actionBtn}
              >
                <Ionicons
                  name={
                    mode === "cobro" ? "card-outline" : "document-text-outline"
                  }
                  size={20}
                  color={count > 0 ? "#fff" : colors.textTertiary}
                />
                <Text
                  style={[
                    s.actionTxt,
                    { color: count > 0 ? "#fff" : colors.textTertiary },
                  ]}
                >
                  {mode === "cobro" ? "Cobrar" : "Cotizar"}
                </Text>
                {count > 0 && <Text style={s.actionPrice}>{fmt(total)}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ Modals ═══════════════════════════════════════════════════════ */}
      <ScannerModal
        visible={scanner}
        onClose={() => {
          setScanner(false);
          setTimeout(() => hiddenRef.current?.focus(), 200);
        }}
        onScan={onCameraScan}
      />

      <TicketModal
        visible={ticketModalVisible}
        onClose={() => setTicketModalVisible(false)}
        ticketData={{
          folio: `COT-${String(cotNum).padStart(4, "0")}`,
          fecha: new Date().toLocaleDateString(),
          cliente: client.nombre,
          items: detalles.map((d) => ({
            clave: d.clave,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precio: getEffectivePrice(d, isDistribuidor),
          })),
          total: total,
          metodoPago: "Cotización",
        }}
      />


      {renderSearchResults()}

      {/* Client modal */}
      <Modal
        visible={clientModal}
        transparent
        animationType="fade"
        onRequestClose={() => setClientModal(false)}
      >
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setClientModal(false)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[s.clientModal, { backgroundColor: colors.surface }]}
          >
            <View style={s.handle} />
            <Animated.Text
              entering={FadeInDown.delay(50).duration(300)}
              style={[s.cmTitle, { color: colors.text }]}
            >
              Seleccionar Cliente
            </Animated.Text>

            {/* Barra de búsqueda */}
            <View style={[s.cmSearchRow, { borderBottomColor: colors.border }]}>
              <Ionicons
                name="search"
                size={16}
                color={colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={[s.cmSearchInput, { color: colors.text }]}
                placeholder="Buscar por nombre o clave..."
                placeholderTextColor={colors.textTertiary}
                value={clienteSearch}
                onChangeText={(txt) => {
                  setClienteSearch(txt);
                  if (clienteDebounce.current)
                    clearTimeout(clienteDebounce.current);
                  clienteDebounce.current = setTimeout(
                    () => fetchClientes(txt),
                    350,
                  );
                }}
                onSubmitEditing={() => {
                  if (clienteDebounce.current)
                    clearTimeout(clienteDebounce.current);
                  fetchClientes(clienteSearch);
                }}
                returnKeyType="search"
                autoFocus
              />
              {clienteSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setClienteSearch("");
                    fetchClientes("");
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Cliente General siempre visible */}
            <TouchableOpacity
              style={[
                s.cmOpt,
                client.id === "0" && { backgroundColor: mc.gradient[0] + "0A" },
                { borderBottomColor: colors.border },
              ]}
              onPress={() => {
                setClient(CLIENTE_GENERAL);
                setClientModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View
                style={[
                  s.cmIcon,
                  {
                    backgroundColor:
                      client.id === "0"
                        ? mc.gradient[0]
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <Ionicons
                  name="storefront"
                  size={13}
                  color={client.id === "0" ? "#fff" : colors.textTertiary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cmName, { color: colors.text }]}>
                  Cliente General
                </Text>
                <Text style={[s.cmRfc, { color: colors.textTertiary }]}>
                  XAXX010101000
                </Text>
              </View>
              {client.id === "0" && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={mc.gradient[0]}
                />
              )}
            </TouchableOpacity>

            {/* Lista de clientes del API */}
            {clientesLoading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <ActivityIndicator size="small" color={mc.gradient[0]} />
                <Text
                  style={[
                    s.cmRfc,
                    { color: colors.textTertiary, marginTop: 8 },
                  ]}
                >
                  Cargando clientes...
                </Text>
              </View>
            ) : clientes.length === 0 ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={[s.cmRfc, { color: colors.textTertiary }]}>
                  {clienteSearch ? "Sin resultados" : "No hay clientes"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={clientes}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 350 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: c }) => {
                  const sel = c.id === client.id;
                  return (
                    <View>
                      <TouchableOpacity
                        style={[
                          s.cmOpt,
                          sel && { backgroundColor: mc.gradient[0] + "0A" },
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => {
                          setClient(c);
                          setClientModal(false);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }}
                      >
                        <View
                          style={[
                            s.cmIcon,
                            {
                              backgroundColor: sel
                                ? mc.gradient[0]
                                : isDark
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(0,0,0,0.05)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="person"
                            size={13}
                            color={sel ? "#fff" : colors.textTertiary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.cmName, { color: colors.text }]}>
                            {c.nombre}
                          </Text>
                          {(c.tipo || c.rfc) && (
                            <Text
                              style={[s.cmRfc, { color: colors.textTertiary }]}
                            >
                              {c.tipo}
                              {c.tipo && c.rfc ? " · " : ""}
                              {c.rfc}
                            </Text>
                          )}
                        </View>
                        {sel && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={mc.gradient[0]}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm modal (cobro or cotización) */}
      <Modal
        visible={confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(false)}
      >
        <View style={s.overlay}>
          <Animated.View
            entering={FadeInDown.springify().damping(16)}
            style={[s.cfModal, { backgroundColor: colors.surface }]}
          >
            <LinearGradient
              colors={[mc.gradient[0] + "12", "transparent"]}
              style={s.cfGlow}
            />
            <View
              style={[s.cfIconWrap, { backgroundColor: mc.gradient[0] + "10" }]}
            >
              <Ionicons
                name={
                  mode === "cobro" ? "card-outline" : "document-text-outline"
                }
                size={36}
                color={mc.gradient[0]}
              />
            </View>
            <Text style={[s.cfTitle, { color: colors.text }]}>
              {mode === "cobro" ? "Confirmar Venta" : "Generar Cotización"}
            </Text>
            <Text style={[s.cfAmount, { color: mc.gradient[0] }]}>
              {fmt(total)}
            </Text>

            <View
              style={[
                s.cfInfo,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={s.cfRow}>
                <Text style={[s.cfLabel, { color: colors.textTertiary }]}>
                  Cliente
                </Text>
                <Text style={[s.cfValue, { color: colors.text }]}>
                  {client.nombre}
                </Text>
              </View>
              <View style={[s.cfDiv, { backgroundColor: colors.border }]} />
              <View style={s.cfRow}>
                <Text style={[s.cfLabel, { color: colors.textTertiary }]}>
                  Artículos
                </Text>
                <Text style={[s.cfValue, { color: colors.text }]}>
                  {count} · {totalQty} pzas
                </Text>
              </View>

              {mode === "cotizacion" && (
                <>
                  <View style={[s.cfDiv, { backgroundColor: colors.border }]} />
                  {detalles.slice(0, 3).map((d) => (
                    <View key={d._key} style={s.cfRow}>
                      <Text
                        style={[s.cfLabel, { color: colors.textTertiary }]}
                        numberOfLines={1}
                      >
                        {d.cantidad}× {d.clave}
                      </Text>
                      <Text style={[s.cfValue, { color: colors.text }]}>
                        {fmt((d.precio || 0) * d.cantidad)}
                      </Text>
                    </View>
                  ))}
                  {detalles.length > 3 && (
                    <Text style={[s.cfMore, { color: colors.textTertiary }]}>
                      +{detalles.length - 3} más
                    </Text>
                  )}
                </>
              )}
            </View>

            <View style={s.cfBtns}>
              <TouchableOpacity
                style={[
                  s.cfCancel,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={[s.cfCancelTxt, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1.5, borderRadius: 14, overflow: "hidden" }}
                onPress={
                  mode === "cobro" ? handleConfirmCobro : handleConfirmCot
                }
              >
                <LinearGradient
                  colors={[...mc.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.cfOk}
                >
                  <Ionicons
                    name={mode === "cobro" ? "checkmark" : "paper-plane"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.cfOkTxt}>
                    {mode === "cobro" ? "Confirmar" : "Generar"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ParkedSalesModal 
        visible={parkedModalVisible}
        onClose={() => setParkedModalVisible(false)}
        onResume={handleResumeSale}
      />

      <AppleAlertModal
        visible={appleAlert.visible}
        title={appleAlert.title}
        message={appleAlert.message}
        actions={appleAlert.actions}
        onClose={() => setAppleAlert(prev => ({ ...prev, visible: false }))}
      />

      <ManagerAuthModal
        visible={managerModalVisible}
        onClose={() => setManagerModalVisible(false)}
        onAuthorize={clearArticles}
      />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1 },
  hidden: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },

  /* ── Top card ──────────────────────────────────────────────────────────── */
  topCard: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  glowLine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  topBtns: { flexDirection: "row", gap: 8 },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  totalAmount: {
    fontSize: 52,
    fontWeight: "300",
    letterSpacing: -2.5,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    marginVertical: 2,
  },
  pillsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 100 },
  pillTxt: { fontSize: 12, fontWeight: "600" },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  clientTxt: { fontSize: 13, fontWeight: "600", maxWidth: 200 },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 0 },

  /* ── Empty ─────────────────────────────────────────────────────────────── */
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  emptyInner: { alignItems: "center" },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  /* ── Item row ──────────────────────────────────────────────────────────── */
  itemRow: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: { flex: 1 },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  itemClaveRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  itemClave: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  discountBadge: {
    backgroundColor: "#34C75918",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#34C759",
  },
  itemPriceCol: { alignItems: "flex-end" },
  itemSub: { fontSize: 16, fontWeight: "400", fontVariant: ["tabular-nums"] },
  itemSubStrike: {
    fontSize: 11,
    fontWeight: "500",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  itemDesc: { fontSize: 14, fontWeight: "500", marginBottom: 10 },
  itemBtm: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceCol: { alignItems: "flex-end" },
  unitPrice: { fontSize: 11, fontWeight: "600" },
  unitPriceStrike: {
    fontSize: 9,
    fontWeight: "400",
    textDecorationLine: "line-through",
  },
  distBadge: {
    backgroundColor: "#34C75918",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distBadgeTxt: {
    fontSize: 8,
    fontWeight: "800",
    color: "#34C759",
    letterSpacing: 0.5,
  },

  /* Qty */
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  qtyVal: {
    minWidth: 40,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  qtyTxt: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
  qtyInput: {
    width: 50,
    height: 30,
    borderRadius: 10,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 0,
  },

  /* ═══ Dock ═════════════════════════════════════════════════════════════ */
  dockContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  dockShadow: {
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  dockBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  dockInner: {
    padding: 10,
    gap: 8,
  },

  /* Tabs */
  tabRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  tabLabel: { fontSize: 13 },

  /* Action */
  actionBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionTxt: { fontSize: 17, fontWeight: "700" },
  actionPrice: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 17,
    fontWeight: "400",
    fontVariant: ["tabular-nums"],
    marginLeft: 2,
  },

  /* ── Modals shared ─────────────────────────────────────────────────────── */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  /* Search results */
  srModal: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: 24,
    overflow: "hidden",
  },
  srHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  srTitle: { fontSize: 17, fontWeight: "700" },
  srItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  srClave: { fontSize: 12, fontWeight: "700" },
  srNombre: { fontSize: 14, fontWeight: "500", marginTop: 2 },
  srPrice: { fontSize: 14, fontWeight: "700", marginRight: 8 },

  /* Client modal */
  clientModal: { width: "100%", borderRadius: 24, padding: 20 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 14,
  },
  cmTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  cmSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cmSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  cmOpt: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cmIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cmName: { fontSize: 14, fontWeight: "600" },
  cmRfc: { fontSize: 10, fontWeight: "500", marginTop: 1 },

  /* Confirm */
  cfModal: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  cfGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  cfIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cfTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  cfAmount: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
    marginBottom: 16,
  },
  cfInfo: {
    width: "100%",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 20,
  },
  cfRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  cfDiv: { height: StyleSheet.hairlineWidth, width: "100%", marginVertical: 4 },
  cfLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  cfValue: { fontSize: 13, fontWeight: "700" },
  cfMore: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingTop: 6,
  },
  cfBtns: { flexDirection: "row", gap: 10, width: "100%" },
  cfCancel: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cfCancelTxt: { fontSize: 15, fontWeight: "600" },
  cfOk: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  cfOkTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
