import { API_URL } from "@/config/api";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Direccion {
  CALLE: string;
  NOMBRE_CALLE: string;
  NUM_INTERIOR: string;
  NUM_EXTERIOR: string;
  COLONIA: string;
  ESTADO: string;
  POBLACION: string;
}

interface Cliente {
  CLIENTE_ID: number;
  NOMBRE: string;
  TIPO_CLIENTE: string;
  CLAVE_CLIENTE: string;
  DIRECCIONES: Direccion[];
  CONTACTO: string;
  NOMBRE_CONSIG: string;
  EMAIL: string;
  ESTATUS: string;
}

// ── Colores por tipo ─────────────────────────────────────────────────────────
const TIPO_COLORS: Record<string, { color: string; bg: string }> = {
  MAYOREO: { color: "#4F46E5", bg: "#EEF2FF" },
  MENUDEO: { color: "#0369A1", bg: "#E0F2FE" },
  EMPLEADO: { color: "#059669", bg: "#ECFDF5" },
  GOBIERNO: { color: "#D97706", bg: "#FFFBEB" },
  DEFAULT: { color: "#64748B", bg: "#F1F5F9" },
};

const getTypeColor = (tipo: string) => {
  const upper = tipo?.toUpperCase() || "";
  for (const key of Object.keys(TIPO_COLORS)) {
    if (upper.includes(key)) return TIPO_COLORS[key];
  }
  return TIPO_COLORS.DEFAULT;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildAddress = (d: Direccion): string => {
  const parts: string[] = [];
  const calle = d.NOMBRE_CALLE || d.CALLE || "";
  if (calle) {
    let line = calle;
    if (d.NUM_EXTERIOR) line += ` #${d.NUM_EXTERIOR}`;
    if (d.NUM_INTERIOR) line += ` Int. ${d.NUM_INTERIOR}`;
    parts.push(line);
  }
  if (d.COLONIA) parts.push(`Col. ${d.COLONIA}`);
  const cityState: string[] = [];
  if (d.POBLACION) cityState.push(d.POBLACION);
  if (d.ESTADO) cityState.push(d.ESTADO);
  if (cityState.length) parts.push(cityState.join(", "));
  return parts.join("\n");
};

const getInitials = (name: string) => {
  if (!name) return "??";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const AVATAR_GRADIENTS = [
  ["#4F46E5", "#818CF8"],
  ["#0369A1", "#38BDF8"],
  ["#059669", "#34D399"],
  ["#D97706", "#FBBF24"],
  ["#DC2626", "#F87171"],
  ["#7C3AED", "#A78BFA"],
  ["#DB2777", "#F472B6"],
  ["#0891B2", "#22D3EE"],
];

const getAvatarColor = (id: number) =>
  AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length][0];

// ─────────────────────────────────────────────────────────────────────────────
export default function MisClientesScreen() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const searchRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const POR_PAGINA = 30;

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchClientes = useCallback(
    async (busqueda: string, page: number, append = false) => {
      try {
        const databaseId = getCurrentDatabaseId();
        const res = await fetch(`${API_URL}/api/POS/clientes.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId,
            busqueda: busqueda.trim(),
            limite: POR_PAGINA,
            pagina: page,
          }),
        });
        const json = await res.json();
        if (json.success) {
          const data: Cliente[] = json.data || [];
          setClientes((prev) => (append ? [...prev, ...data] : data));
          setTotalClientes(json.total || 0);
          setHasMore(page < (json.totalPaginas || 1));
          setPagina(page);
        }
      } catch {
        /* silencioso */
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchClientes("", 1);
  }, [fetchClientes]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setClientes([]);
      fetchClientes(text, 1);
    }, 400);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientes(searchText, 1);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchClientes(searchText, pagina + 1, true);
  };

  const toggleExpand = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const glassBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const subtleText = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  // ── Render client card ─────────────────────────────────────────────────
  const renderCliente = ({ item, index }: { item: Cliente; index: number }) => {
    const tc = getTypeColor(item.TIPO_CLIENTE);
    const avatarColor = getAvatarColor(item.CLIENTE_ID);
    const isExpanded = expandedId === item.CLIENTE_ID;
    const dirs = item.DIRECCIONES || [];
    const hasContact = !!(item.CONTACTO || item.EMAIL);

    return (
      <Animated.View entering={FadeInUp.delay(index * 35).duration(350)}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleExpand(item.CLIENTE_ID)}
          style={[
            st.card,
            {
              backgroundColor: cardBg,
              borderColor: isExpanded ? avatarColor + "30" : cardBorder,
              ...(isExpanded && {
                shadowColor: avatarColor,
                shadowOpacity: 0.08,
              }),
            },
          ]}
        >
          {/* ── Header row ──────────────────────────────────────────── */}
          <View style={st.cardHeader}>
            {/* Avatar */}
            <View style={[st.avatar, { backgroundColor: avatarColor + "14" }]}>
              <Text style={[st.avatarText, { color: avatarColor }]}>
                {getInitials(item.NOMBRE)}
              </Text>
            </View>

            {/* Name + Clave */}
            <View style={st.cardInfo}>
              <Text
                style={[st.cardName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.NOMBRE}
              </Text>
              <View style={st.cardMetaRow}>
                <Text style={[st.cardClave, { color: subtleText }]}>
                  {item.CLAVE_CLIENTE}
                </Text>
                <View style={st.cardDot} />
                <View
                  style={[
                    st.typePill,
                    {
                      backgroundColor: isDark ? tc.color + "18" : tc.bg,
                    },
                  ]}
                >
                  <Text style={[st.typeText, { color: tc.color }]}>
                    {item.TIPO_CLIENTE}
                  </Text>
                </View>
              </View>
            </View>

            {/* Expand indicator */}
            <View
              style={[
                st.expandBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
            >
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={subtleText}
              />
            </View>
          </View>

          {/* ── Expanded Detail ──────────────────────────────────────── */}
          {isExpanded && (
            <Animated.View entering={FadeIn.duration(250)}>
              <View
                style={[
                  st.divider,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                  },
                ]}
              />

              {/* Direcciones */}
              {dirs.length > 0 && (
                <View style={st.detailSection}>
                  <View style={st.detailHeader}>
                    <View
                      style={[
                        st.detailIconWrap,
                        {
                          backgroundColor: isDark
                            ? "rgba(59,130,246,0.1)"
                            : "rgba(59,130,246,0.06)",
                        },
                      ]}
                    >
                      <Ionicons name="location" size={14} color="#3B82F6" />
                    </View>
                    <Text style={[st.detailLabel, { color: subtleText }]}>
                      {dirs.length === 1
                        ? "Dirección"
                        : `Direcciones (${dirs.length})`}
                    </Text>
                  </View>
                  {dirs.map((d, di) => {
                    const addr = buildAddress(d);
                    if (!addr) return null;
                    return (
                      <View
                        key={di}
                        style={di > 0 ? { marginTop: 8 } : undefined}
                      >
                        {dirs.length > 1 && (
                          <Text style={[st.dirIndex, { color: subtleText }]}>
                            #{di + 1}
                          </Text>
                        )}
                        <Text style={[st.detailValue, { color: colors.text }]}>
                          {addr}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Contacto */}
              {hasContact && (
                <View style={st.detailSection}>
                  <View style={st.detailHeader}>
                    <View
                      style={[
                        st.detailIconWrap,
                        {
                          backgroundColor: isDark
                            ? "rgba(16,185,129,0.1)"
                            : "rgba(16,185,129,0.06)",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={14} color="#10B981" />
                    </View>
                    <Text style={[st.detailLabel, { color: subtleText }]}>
                      Contacto
                    </Text>
                  </View>
                  {item.CONTACTO ? (
                    <Text style={[st.detailValue, { color: colors.text }]}>
                      {item.CONTACTO}
                    </Text>
                  ) : null}
                  {item.EMAIL ? (
                    <View style={st.emailRow}>
                      <Ionicons
                        name="mail-outline"
                        size={12}
                        color={subtleText}
                      />
                      <Text
                        style={[st.emailText, { color: colors.textSecondary }]}
                      >
                        {item.EMAIL}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Consignatario */}
              {item.NOMBRE_CONSIG ? (
                <View style={st.detailSection}>
                  <View style={st.detailHeader}>
                    <View
                      style={[
                        st.detailIconWrap,
                        {
                          backgroundColor: isDark
                            ? "rgba(217,119,6,0.1)"
                            : "rgba(217,119,6,0.06)",
                        },
                      ]}
                    >
                      <Ionicons name="business" size={14} color="#D97706" />
                    </View>
                    <Text style={[st.detailLabel, { color: subtleText }]}>
                      Consignatario
                    </Text>
                  </View>
                  <Text style={[st.detailValue, { color: colors.text }]}>
                    {item.NOMBRE_CONSIG}
                  </Text>
                </View>
              ) : null}

              {/* Location tags — from first address */}
              {dirs.length > 0 && (dirs[0].POBLACION || dirs[0].ESTADO) && (
                <View style={st.tagRow}>
                  {dirs[0].POBLACION ? (
                    <View
                      style={[
                        st.locTag,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={10}
                        color={subtleText}
                      />
                      <Text style={[st.locTagText, { color: subtleText }]}>
                        {dirs[0].POBLACION}
                      </Text>
                    </View>
                  ) : null}
                  {dirs[0].ESTADO ? (
                    <View
                      style={[
                        st.locTag,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={10}
                        color={subtleText}
                      />
                      <Text style={[st.locTagText, { color: subtleText }]}>
                        {dirs[0].ESTADO}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Header Component ───────────────────────────────────────────────────
  const ListHeader = () => (
    <>
      {/* Stats bar */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(450)}
        style={st.statsRow}
      >
        <View
          style={[
            st.statCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View
            style={[
              st.statIcon,
              {
                backgroundColor: isDark
                  ? "rgba(79,70,229,0.12)"
                  : "rgba(79,70,229,0.06)",
              },
            ]}
          >
            <Ionicons name="people" size={18} color="#4F46E5" />
          </View>
          <Text style={[st.statNumber, { color: colors.text }]}>
            {totalClientes}
          </Text>
          <Text style={[st.statLabel, { color: subtleText }]}>Total</Text>
        </View>

        <View
          style={[
            st.statCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View
            style={[
              st.statIcon,
              {
                backgroundColor: isDark
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(16,185,129,0.06)",
              },
            ]}
          >
            <Ionicons name="list" size={18} color="#10B981" />
          </View>
          <Text style={[st.statNumber, { color: colors.text }]}>
            {clientes.length}
          </Text>
          <Text style={[st.statLabel, { color: subtleText }]}>Cargados</Text>
        </View>

        <View
          style={[
            st.statCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View
            style={[
              st.statIcon,
              {
                backgroundColor: isDark
                  ? "rgba(217,119,6,0.12)"
                  : "rgba(217,119,6,0.06)",
              },
            ]}
          >
            <Ionicons name="location" size={18} color="#D97706" />
          </View>
          <Text style={[st.statNumber, { color: colors.text }]}>
            {clientes.filter((c) => (c.DIRECCIONES?.length || 0) > 0).length}
          </Text>
          <Text style={[st.statLabel, { color: subtleText }]}>
            Con dirección
          </Text>
        </View>
      </Animated.View>
    </>
  );

  // ── Empty State ────────────────────────────────────────────────────────
  const EmptyState = () => (
    <Animated.View
      entering={FadeIn.delay(200).duration(400)}
      style={st.emptyWrap}
    >
      <View
        style={[
          st.emptyIconWrap,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
          },
        ]}
      >
        <Ionicons name="people-outline" size={40} color={subtleText} />
      </View>
      <Text style={[st.emptyTitle, { color: colors.text }]}>
        {searchText ? "Sin resultados" : "Sin clientes"}
      </Text>
      <Text style={[st.emptyDesc, { color: subtleText }]}>
        {searchText
          ? `No se encontraron clientes con "${searchText}"`
          : "No hay clientes registrados aún"}
      </Text>
    </Animated.View>
  );

  // ── Main Render ────────────────────────────────────────────────────────
  return (
    <View
      style={[
        st.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* ══ Header ══════════════════════════════════════════════════════ */}
      <Animated.View entering={FadeIn.duration(500)} style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[st.backBtn, { backgroundColor: glassBorder }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerSub, { color: subtleText }]}>POS</Text>
          <Text style={[st.headerTitle, { color: colors.text }]}>
            Mis Clientes
          </Text>
        </View>
        <View
          style={[
            st.countPill,
            {
              backgroundColor: isDark
                ? "rgba(79,70,229,0.12)"
                : "rgba(79,70,229,0.06)",
            },
          ]}
        >
          <Ionicons name="people" size={14} color="#4F46E5" />
          <Text style={st.countText}>{totalClientes}</Text>
        </View>
      </Animated.View>

      {/* ══ Search Bar ══════════════════════════════════════════════════ */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={st.searchWrap}
      >
        <View
          style={[
            st.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              borderColor: searchFocused
                ? "#4F46E5" + "40"
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons
            name="search"
            size={17}
            color={searchFocused ? "#4F46E5" : subtleText}
          />
          <TextInput
            ref={searchRef}
            placeholder="Buscar por nombre, clave o contacto..."
            placeholderTextColor={subtleText}
            style={[st.searchInput, { color: colors.text }]}
            value={searchText}
            onChangeText={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText("");
                setLoading(true);
                setClientes([]);
                fetchClientes("", 1);
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={subtleText} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ══ Content ═════════════════════════════════════════════════════ */}
      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[st.loadingText, { color: subtleText }]}>
            Cargando clientes...
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={(item, index) => `${item.CLIENTE_ID}-${index}`}
          renderItem={renderCliente}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={EmptyState}
          ListFooterComponent={
            loadingMore ? (
              <View style={st.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={[st.loadingText, { color: subtleText }]}>
                  Cargando más...
                </Text>
              </View>
            ) : !hasMore && clientes.length > 0 ? (
              <Text style={[st.footerEnd, { color: subtleText }]}>
                {totalClientes} clientes en total
              </Text>
            ) : null
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4F46E5"
              colors={["#4F46E5"]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  countText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4F46E5",
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Card */
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardClave: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(148,163,184,0.5)",
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Expanded Detail */
  divider: {
    height: 1,
    marginVertical: 12,
    borderRadius: 0.5,
  },
  detailSection: {
    marginBottom: 10,
    gap: 4,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  detailIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingLeft: 28,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 28,
    marginTop: 2,
  },
  emailText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    paddingLeft: 28,
  },
  locTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    gap: 4,
  },
  locTagText: {
    fontSize: 10,
    fontWeight: "600",
  },

  /* Loading */
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },

  /* Empty */
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 30,
  },

  /* Footer */
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  footerEnd: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 16,
  },

  /* Direction index */
  dirIndex: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingLeft: 28,
    marginBottom: 2,
  },
});
