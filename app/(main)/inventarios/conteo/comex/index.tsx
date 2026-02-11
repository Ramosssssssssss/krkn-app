import { useThemeColors } from "@/context/theme-context";
import { useSystemSounds } from "@/hooks/use-system-sounds";
import {
    ConteoComexItem,
    getConteoComex,
    limpiarConteoComex,
} from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as FS from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import * as Sharing from "expo-sharing";
import LottieView from "lottie-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#06B6D4";

export default function ComexHistoryScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { playSound } = useSystemSounds();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [datos, setDatos] = useState<ConteoComexItem[]>([]);
  const [txtContent, setTxtContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const clearScaleAnim = useRef(new Animated.Value(0.85)).current;
  const clearOpacityAnim = useRef(new Animated.Value(0)).current;
  const toastScaleAnim = useRef(new Animated.Value(0.5)).current;
  const toastOpacityAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  const totalSKUs = datos.length;
  const totalUnidades = useMemo(
    () => datos.reduce((sum, d) => sum + Number(d.CANTIDAD), 0),
    [datos],
  );

  const filteredDatos = useMemo(() => {
    if (!searchQuery.trim()) return datos;
    const q = searchQuery.trim().toUpperCase();
    return datos.filter((d) => d.CODIGO.toUpperCase().includes(q));
  }, [datos, searchQuery]);

  const fetchDatos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await getConteoComex();
      if (result.ok) {
        setDatos(result.datos || []);
        setTxtContent(result.contenido || "");
      } else {
        playSound("error");
      }
    } catch (_e) {
      playSound("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDatos(true);
  }, [fetchDatos]);

  // ─── Success toast ─────────────────────────────────────────
  const showSuccess = useCallback(
    (msg: string) => {
      setSuccessMsg(msg);
      setShowSuccessToast(true);
      playSound("add");
      Vibration.vibrate(10);
      toastScaleAnim.setValue(0.5);
      toastOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(toastScaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(toastOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => lottieRef.current?.play(), 100);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastScaleAnim, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setShowSuccessToast(false));
      }, 2200);
    },
    [playSound],
  );

  // ─── Export ────────────────────────────────────────────────
  const handleExport = async () => {
    if (!txtContent) {
      playSound("error");
      Vibration.vibrate([0, 80, 40, 80]);
      return;
    }
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
      const filename = `CONTEO_COMEX_${ts}.txt`;
      const uri = FS.cacheDirectory + filename;
      await FS.writeAsStringAsync(uri, txtContent, { encoding: "utf8" });
      if (await Sharing.isAvailableAsync()) {
        playSound("add");
        await Sharing.shareAsync(uri, {
          mimeType: "text/plain",
          dialogTitle: "Exportar Conteo Comex",
          UTI: "public.plain-text",
        });
      }
    } catch (_e) {
      playSound("error");
    }
  };

  // ─── Clear modal ──────────────────────────────────────────
  const openClearModal = useCallback(() => {
    setShowClearModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearScaleAnim.setValue(0.85);
    clearOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(clearScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(clearOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeClearModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(clearScaleAnim, {
        toValue: 0.85,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(clearOpacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => setShowClearModal(false));
  }, []);

  const executeClear = useCallback(async () => {
    closeClearModal();
    try {
      const result = await limpiarConteoComex();
      if (result.ok) {
        setDatos([]);
        setTxtContent("");
        setTimeout(() => showSuccess(result.message || "Tabla limpiada"), 300);
      } else {
        playSound("error");
      }
    } catch (_e) {
      playSound("error");
    }
  }, [closeClearModal, showSuccess, playSound]);

  const handleClear = () => {
    if (datos.length === 0) return;
    openClearModal();
  };

  const renderItem = ({ item }: { item: ConteoComexItem }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.rowCode, { color: colors.text }]} numberOfLines={1}>
        {item.CODIGO}
      </Text>
      <View style={styles.rowBadge}>
        <Text style={styles.rowQty}>{Math.floor(Number(item.CANTIDAD))}</Text>
      </View>
    </View>
  );

  // ─── Empty state ────────────────────────────────────────────
  if (!loading && datos.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerTitle: "Historial Comex",
            headerTitleAlign: "center",
          }}
        />
        <View style={styles.emptyWrap}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: "rgba(6,182,212,0.1)" },
            ]}
          >
            <Ionicons name="file-tray-outline" size={64} color={ACCENT} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sin registros
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            La tabla CONTEO_CIDER está vacía. Inicia un nuevo conteo para ver
            datos aquí.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            onPress={() =>
              router.push("/(main)/inventarios/conteo/comex/crear")
            }
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>Nuevo Conteo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => fetchDatos()}>
            <Ionicons name="refresh" size={18} color={ACCENT} />
            <Text style={[styles.linkBtnText, { color: ACCENT }]}>
              Recargar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Historial Comex",
          headerTitleAlign: "center",
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 8 }}
              onPress={() =>
                router.push("/(main)/inventarios/conteo/comex/crear")
              }
            >
              <Ionicons name="add-circle" size={28} color={ACCENT} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[styles.loaderText, { color: colors.textSecondary }]}>
            Cargando conteo…
          </Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View
            style={[
              styles.statsBar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: ACCENT }]}>
                {totalSKUs}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                SKUs
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.floor(totalUnidades)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                UNIDADES
              </Text>
            </View>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar código…"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filteredDatos}
            keyExtractor={(item) => item.CODIGO}
            renderItem={renderItem}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={ACCENT}
              />
            }
            ListEmptyComponent={
              <View style={styles.noResults}>
                <Text style={{ color: colors.textSecondary }}>
                  Sin resultados para "{searchQuery}"
                </Text>
              </View>
            }
          />

          {/* Bottom buttons */}
          <View style={[styles.bottomBar, { bottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: ACCENT, flex: 1 }]}
              onPress={handleExport}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Exportar TXT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dangerBtn,
                { backgroundColor: colors.surface, borderColor: "#EF4444" },
              ]}
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ─── Clear Confirm Modal ────────────────────────────── */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="none"
        onRequestClose={closeClearModal}
      >
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: clearScaleAnim }],
                opacity: clearOpacityAnim,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: "rgba(239,68,68,0.1)" },
              ]}
            >
              <Ionicons name="trash" size={40} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ¿Limpiar Conteo?
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              Se eliminarán {totalSKUs} registros de CONTEO_CIDER.{"\n"}Esta
              acción no se puede deshacer.
            </Text>

            <View
              style={[
                styles.modalStatsRow,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: "#EF4444" }]}>
                  {totalSKUs}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Registros
                </Text>
              </View>
              <View
                style={[
                  styles.modalStatDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>
                  {Math.floor(totalUnidades)}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Unidades
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalBtnSecondary,
                  { borderColor: colors.border },
                ]}
                onPress={closeClearModal}
              >
                <Text
                  style={[
                    styles.modalBtnSecondaryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnDanger, { backgroundColor: "#EF4444" }]}
                onPress={executeClear}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.modalBtnDangerText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Success Toast ──────────────────────────────────── */}
      <Modal visible={showSuccessToast} transparent animationType="none">
        <View style={styles.toastOverlay}>
          <Animated.View
            style={[
              styles.toastCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: toastScaleAnim }],
                opacity: toastOpacityAnim,
              },
            ]}
          >
            <View
              style={[
                styles.toastLottieWrap,
                { backgroundColor: "rgba(16,185,129,0.1)" },
              ]}
            >
              <LottieView
                ref={lottieRef}
                source={require("@/assets/animations/success.json")}
                style={{ width: 70, height: 70 }}
                autoPlay={false}
                loop={false}
              />
            </View>
            <Text style={[styles.toastTitle, { color: colors.text }]}>
              ¡Listo!
            </Text>
            <Text style={[styles.toastMsg, { color: colors.textSecondary }]}>
              {successMsg}
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Stats
  statsBar: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: { width: 1, height: "60%", alignSelf: "center" },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },

  // List
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCode: { flex: 1, fontSize: 15, fontWeight: "600" },
  rowBadge: {
    backgroundColor: "rgba(6,182,212,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rowQty: { fontSize: 15, fontWeight: "700", color: ACCENT },

  // Bottom
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dangerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  linkBtnText: { fontSize: 14, fontWeight: "600" },

  // Empty / Loader
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 60,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  emptySub: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 32,
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14 },
  noResults: { padding: 40, alignItems: "center" },

  // ─── Modals ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.8,
  },
  modalStatsRow: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
    width: "100%",
  },
  modalStatItem: { flex: 1, alignItems: "center" },
  modalStatValue: { fontSize: 22, fontWeight: "800" },
  modalStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  modalStatDivider: { width: 1, height: "80%", alignSelf: "center" },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: "600" },
  modalBtnDanger: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnDangerText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ─── Success Toast ─────────────────────────────────────────
  toastOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  toastCard: {
    width: 220,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  toastLottieWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  toastTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  toastMsg: { fontSize: 13, textAlign: "center", opacity: 0.8 },
});
