/**
 * mis-inventarios.tsx
 *
 * Pantalla "Mis Inventarios" — Apple-style design.
 * Custom header, 2 pager KPI cards, segmented tabs, bottom-sheet calendar
 * with day-tap detail. All colors from useThemeColors().
 */

import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
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
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const API_URL = API_CONFIG.BASE_URL;
const { width: SCREEN_W } = Dimensions.get("window");
const PAGER_W = SCREEN_W - 32; // full-width card inside padding

// ─── Types ───────────────────────────────────────────────────────────────────
interface Inventario {
  INVENTARIO_ID: number;
  USER_ID: number;
  SUCURSAL_ID: number;
  SUCURSAL_NOMBRE: string;
  ALMACEN_ID: number;
  ALMACEN_NOMBRE: string;
  FECHA_PROGRAMADA: string;
  FECHA_ASIGNACION: string;
  FECHA_INICIO: string | null;
  TIPO_CONTEO: string;
  ESTATUS: string;
  ASIGNADO_POR: string;
  OBSERVACIONES: string;
  FOLIO: string;
  UBICACIONES: { LOCALIZACION: string; CANTIDAD_ARTICULOS: number }[];
}

type TabKey = "hoy" | "atrasados" | "proximos" | "todos";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const esHoy = (dateStr: string) => {
  const t = new Date(),
    d = new Date(dateStr);
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
};
const esPasado = (dateStr: string) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d < t;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DIAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MESES_CORTO = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
const fmtCorta = (s: string) => {
  const d = new Date(s);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
};

const statusMeta = (
  e: string,
  c: { warning: string; accent: string; success: string; textTertiary: string },
) => {
  switch (e) {
    case "PENDIENTE":
      return { color: c.warning, icon: "time" as const, label: "Pendiente" };
    case "TRABAJANDO":
      return { color: c.accent, icon: "hammer" as const, label: "En progreso" };
    case "EN_REVISION":
      return { color: "#BF5AF2", icon: "eye" as const, label: "En revisión" };
    case "COMPLETADO":
      return {
        color: c.success,
        icon: "checkmark-circle" as const,
        label: "Completado",
      };
    default:
      return { color: c.textTertiary, icon: "help-circle" as const, label: e };
  }
};

const getWeekDays = () => {
  const t = new Date(),
    dow = t.getDay();
  const mon = new Date(t);
  mon.setDate(t.getDate() - ((dow + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
};

const getMonthGrid = (y: number, m: number) => {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0).getDate();
  const start = (first.getDay() + 6) % 7; // Monday-based offset
  const cells: Date[] = [];
  // Previous month days
  for (let i = start - 1; i >= 0; i--) {
    const d = new Date(y, m, 1);
    d.setDate(d.getDate() - i - 1);
    cells.push(d);
  }
  // Current month
  for (let d = 1; d <= last; d++) cells.push(new Date(y, m, d));
  // Next month days — ALWAYS pad to 42 cells (6 rows) for fixed height
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push(new Date(y, m + 1, nextDay++));
  }
  return cells;
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function MisInventariosScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const dbId = getCurrentDatabaseId();

  const [data, setData] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("hoy");
  const [showCal, setShowCal] = useState(false);
  const [calM, setCalM] = useState(new Date().getMonth());
  const [calY, setCalY] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [kpiPage, setKpiPage] = useState(0);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch ──
  const load = useCallback(async () => {
    if (!dbId || !user?.USUARIO_ID) return;
    try {
      const r = await fetch(
        `${API_URL}/api/mis-inventarios-pendientes.php?databaseId=${dbId}&userId=${user.USUARIO_ID}`,
      );
      const j = await r.json();
      if (j.ok) setData(j.inventarios || []);
    } catch (e) {
      console.error("Error cargando inventarios:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dbId, user?.USUARIO_ID]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // ── Counts ──
  const counts = useMemo(() => {
    let hoy = 0,
      atrasados = 0,
      proximos = 0,
      trabajando = 0;
    data.forEach((i) => {
      if (esHoy(i.FECHA_PROGRAMADA)) hoy++;
      else if (esPasado(i.FECHA_PROGRAMADA)) atrasados++;
      else proximos++;
      if (i.ESTATUS === "TRABAJANDO") trabajando++;
    });
    return {
      hoy,
      atrasados,
      proximos,
      trabajando,
      total: data.length,
      pendientes: hoy + atrasados + proximos - trabajando,
    };
  }, [data]);

  // Dates set
  const invDates = useMemo(() => {
    const s = new Set<string>();
    data.forEach((i) => {
      const d = new Date(i.FECHA_PROGRAMADA);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [data]);
  const hasDot = (d: Date) =>
    invDates.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);

  // Filter
  const filtered = useMemo(() => {
    switch (tab) {
      case "hoy":
        return data.filter((i) => esHoy(i.FECHA_PROGRAMADA));
      case "atrasados":
        return data.filter((i) => esPasado(i.FECHA_PROGRAMADA));
      case "proximos":
        return data.filter(
          (i) => !esHoy(i.FECHA_PROGRAMADA) && !esPasado(i.FECHA_PROGRAMADA),
        );
      default:
        return data;
    }
  }, [data, tab]);

  // Auto-tab
  useEffect(() => {
    if (!loading && data.length > 0) {
      if (counts.hoy > 0) setTab("hoy");
      else if (counts.atrasados > 0) setTab("atrasados");
      else if (counts.proximos > 0) setTab("proximos");
      else setTab("todos");
    }
  }, [loading, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekDays = useMemo(getWeekDays, []);
  const today = new Date();

  const navigate = (inv: Inventario) => {
    const params = {
      sucursalId: String(inv.SUCURSAL_ID),
      almacenId: String(inv.ALMACEN_ID),
    };
    const route =
      inv.TIPO_CONTEO?.toLowerCase() === "ubicacion"
        ? "/(main)/inventarios/conteo/conteo-ubicacion"
        : "/(main)/inventarios/conteo/crear-conteo";
    router.push({ pathname: route as any, params });
  };

  // Inventarios for selected calendar day
  const selectedDayInvs = useMemo(() => {
    if (!selectedDay) return [];
    return data.filter((i) =>
      isSameDay(new Date(i.FECHA_PROGRAMADA), selectedDay),
    );
  }, [data, selectedDay]);

  // ── Tabs config ──
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "hoy", label: "Hoy", count: counts.hoy },
    { key: "atrasados", label: "Atrasados", count: counts.atrasados },
    { key: "proximos", label: "Próximos", count: counts.proximos },
    { key: "todos", label: "Todo", count: counts.total },
  ];

  // ─── Render Card ───
  const renderCard = ({ item }: { item: Inventario }) => {
    const meta = statusMeta(item.ESTATUS, colors);
    const hoy = esHoy(item.FECHA_PROGRAMADA);
    const atrasado = esPasado(item.FECHA_PROGRAMADA);
    const isUbi = item.TIPO_CONTEO?.toLowerCase() === "ubicacion";
    const accent = atrasado
      ? colors.error
      : hoy
        ? colors.warning
        : colors.accent;

    return (
      <TouchableOpacity
        activeOpacity={0.65}
        onPress={() => navigate(item)}
        style={[st.card, { backgroundColor: colors.surface }]}
      >
        <View style={[st.cardAccent, { backgroundColor: accent }]} />
        <View style={st.cardBody}>
          {/* Location header */}
          <View style={st.cardTop}>
            <View style={[st.cardIconW, { backgroundColor: accent + "15" }]}>
              <Ionicons name="storefront" size={16} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[st.cardTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.SUCURSAL_NOMBRE}
              </Text>
              <Text
                style={[st.cardSub, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {item.ALMACEN_NOMBRE}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={[
                  st.cardDate,
                  { color: hoy ? accent : colors.textSecondary },
                ]}
              >
                {hoy ? "Hoy" : fmtCorta(item.FECHA_PROGRAMADA)}
              </Text>
              {atrasado && (
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: colors.error,
                    marginTop: 1,
                  }}
                >
                  Vencido
                </Text>
              )}
            </View>
          </View>

          {/* Pills */}
          <View style={st.pillRow}>
            <View style={[st.pill, { backgroundColor: meta.color + "15" }]}>
              <View style={[st.pillDot, { backgroundColor: meta.color }]} />
              <Text style={[st.pillTxt, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <View style={[st.pill, { backgroundColor: colors.background }]}>
              <Ionicons
                name={isUbi ? "location" : "repeat"}
                size={10}
                color={colors.textTertiary}
              />
              <Text style={[st.pillTxt, { color: colors.textTertiary }]}>
                {isUbi ? "Ubicación" : "Cíclico"}
              </Text>
            </View>
            {item.ASIGNADO_POR ? (
              <View style={[st.pill, { backgroundColor: colors.background }]}>
                <Ionicons name="person" size={10} color={colors.textTertiary} />
                <Text style={[st.pillTxt, { color: colors.textTertiary }]}>
                  {item.ASIGNADO_POR}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Ubicaciones */}
          {item.UBICACIONES && item.UBICACIONES.length > 0 && (
            <View style={st.chipRow}>
              {item.UBICACIONES.slice(0, 3).map((u, i) => (
                <View
                  key={i}
                  style={[st.chip, { backgroundColor: colors.background }]}
                >
                  <Text style={[st.chipTxt, { color: colors.textSecondary }]}>
                    {u.LOCALIZACION}
                  </Text>
                </View>
              ))}
              {item.UBICACIONES.length > 3 && (
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: colors.textTertiary,
                    alignSelf: "center",
                  }}
                >
                  +{item.UBICACIONES.length - 3}
                </Text>
              )}
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[st.cta, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={() => navigate(item)}
          >
            <Text style={st.ctaTxt}>
              {item.ESTATUS === "TRABAJANDO" ? "Continuar" : "Iniciar conteo"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Empty ───
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={st.empty}>
        <View style={[st.emptyCircle, { backgroundColor: colors.surface }]}>
          <Ionicons
            name={tab !== "todos" ? "funnel-outline" : "checkmark-done"}
            size={36}
            color={colors.textTertiary}
          />
        </View>
        <Text style={[st.emptyTitle, { color: colors.text }]}>
          {tab !== "todos" ? "Sin resultados" : "Todo al dia"}
        </Text>
        <Text style={[st.emptySub, { color: colors.textTertiary }]}>
          {tab !== "todos"
            ? "No hay inventarios en esta categoria"
            : "No tienes conteos pendientes"}
        </Text>
        {tab !== "todos" && (
          <TouchableOpacity
            style={[st.emptyBtn, { backgroundColor: colors.accentLight }]}
            onPress={() => setTab("todos")}
          >
            <Text
              style={{ color: colors.accent, fontWeight: "600", fontSize: 14 }}
            >
              Ver todos
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Calendar Bottom Sheet ───
  const calGrid = useMemo(() => getMonthGrid(calY, calM), [calY, calM]);
  const calRows = useMemo(() => {
    const rows: Date[][] = [];
    for (let i = 0; i < calGrid.length; i += 7)
      rows.push(calGrid.slice(i, i + 7));
    return rows;
  }, [calGrid]);
  const CAL_DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
  const CAL_W = SCREEN_W - 48;
  const CAL_CELL = Math.floor(CAL_W / 7);

  const calSlideAnim = useRef(new Animated.Value(0)).current;

  const openCal = () => {
    setSelectedDay(null);
    setShowCal(true);
    calSlideAnim.setValue(0);
    Animated.spring(calSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };
  const closeCal = () => {
    Animated.timing(calSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowCal(false));
  };

  const prevMonth = () => {
    setSelectedDay(null);
    if (calM === 0) {
      setCalM(11);
      setCalY(calY - 1);
    } else setCalM(calM - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (calM === 11) {
      setCalM(0);
      setCalY(calY + 1);
    } else setCalM(calM + 1);
  };

  // CalendarSheet — inline JSX, stored in a variable (NOT a component function)
  // This avoids React seeing a new component type on every render which causes unmount/remount flicker
  const calendarSheet = (
    <Modal
      visible={showCal}
      transparent
      animationType="none"
      onRequestClose={closeCal}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={st.sheetOverlay}
        activeOpacity={1}
        onPress={closeCal}
      >
        <Animated.View
          style={[
            st.sheetWrap,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
              transform: [
                {
                  translateY: calSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [700, 0],
                  }),
                },
              ],
            },
          ]}
          // @ts-ignore
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={st.sheetHandle}>
            <View
              style={[
                st.sheetBar,
                { backgroundColor: colors.textTertiary + "40" },
              ]}
            />
          </View>

          {/* Month nav */}
          <View style={st.calNav}>
            <TouchableOpacity
              style={[st.calNavBtn, { backgroundColor: colors.background }]}
              onPress={prevMonth}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[st.calNavTitle, { color: colors.text }]}>
              {MESES[calM]} {calY}
            </Text>
            <TouchableOpacity
              style={[st.calNavBtn, { backgroundColor: colors.background }]}
              onPress={nextMonth}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day names */}
          <View style={st.calDayNamesRow}>
            {CAL_DAY_NAMES.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={[st.calDayNameTxt, { color: colors.textTertiary }]}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          <View>
            {calRows.map((row, ri) => (
              <View key={ri} style={st.calRow}>
                {row.map((cell, ci) => {
                  const inMonth =
                    cell.getMonth() === calM && cell.getFullYear() === calY;
                  const isT = isSameDay(cell, today);
                  const has = hasDot(cell);
                  const past = cell < today && !isT;
                  const selected = selectedDay
                    ? isSameDay(cell, selectedDay)
                    : false;
                  const cnt = has
                    ? data.filter((inv) =>
                        isSameDay(new Date(inv.FECHA_PROGRAMADA), cell),
                      ).length
                    : 0;

                  return (
                    <TouchableOpacity
                      key={ci}
                      activeOpacity={0.6}
                      onPress={() => {
                        if (!inMonth) {
                          setCalM(cell.getMonth());
                          setCalY(cell.getFullYear());
                          setSelectedDay(null);
                        } else if (has) {
                          setSelectedDay(selected ? null : cell);
                        }
                      }}
                      style={{
                        flex: 1,
                        height: CAL_CELL,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={[
                          st.calCircle,
                          isT && { backgroundColor: colors.accent },
                          selected &&
                            !isT &&
                            inMonth && {
                              backgroundColor: colors.accentLight,
                              borderWidth: 1.5,
                              borderColor: colors.accent,
                            },
                          has &&
                            !isT &&
                            !selected &&
                            inMonth && {
                              backgroundColor: colors.warning + "12",
                            },
                        ]}
                      >
                        <Text
                          style={[
                            st.calDayTxt,
                            {
                              color: isT
                                ? "#FFF"
                                : !inMonth
                                  ? colors.textTertiary + "50"
                                  : selected
                                    ? colors.accent
                                    : past
                                      ? colors.textTertiary
                                      : colors.text,
                            },
                          ]}
                        >
                          {cell.getDate()}
                        </Text>
                      </View>
                      {has && inMonth && (
                        <View style={st.calDotArea}>
                          <View
                            style={[
                              st.calSmallDot,
                              {
                                backgroundColor: isT
                                  ? "#FFF"
                                  : past
                                    ? colors.error
                                    : colors.warning,
                              },
                            ]}
                          />
                          {cnt > 1 && (
                            <Text
                              style={[
                                st.calDotCnt,
                                {
                                  color: isT
                                    ? "#FFF"
                                    : past
                                      ? colors.error
                                      : colors.warning,
                                },
                              ]}
                            >
                              {cnt}
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Selected day detail */}
          {selectedDay && selectedDayInvs.length > 0 && (
            <View
              style={[
                st.calDetail,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[st.calDetailTitle, { color: colors.text }]}>
                {DIAS_CORTO[selectedDay.getDay()]} {selectedDay.getDate()}{" "}
                {MESES_CORTO[selectedDay.getMonth()]}
              </Text>
              <Text
                style={[st.calDetailCount, { color: colors.textSecondary }]}
              >
                {selectedDayInvs.length} inventario
                {selectedDayInvs.length > 1 ? "s" : ""}
              </Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {selectedDayInvs.map((inv) => {
                  const meta = statusMeta(inv.ESTATUS, colors);
                  const isUbi = inv.TIPO_CONTEO?.toLowerCase() === "ubicacion";
                  return (
                    <TouchableOpacity
                      key={inv.INVENTARIO_ID}
                      activeOpacity={0.7}
                      onPress={() => {
                        closeCal();
                        setTimeout(() => navigate(inv), 300);
                      }}
                      style={[
                        st.calDetailCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={[st.calDetailName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {inv.SUCURSAL_NOMBRE}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: colors.textTertiary }}
                        >
                          {inv.ALMACEN_NOMBRE}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <View
                            style={[
                              st.calDetailPill,
                              { backgroundColor: meta.color + "15" },
                            ]}
                          >
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: meta.color,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "600",
                                color: meta.color,
                              }}
                            >
                              {meta.label}
                            </Text>
                          </View>
                          <Text
                            style={{ fontSize: 10, color: colors.textTertiary }}
                          >
                            {isUbi ? "Ubicacion" : "Ciclico"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          st.calDetailGo,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#FFF"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Legend */}
          <View style={st.calLegend}>
            <View style={st.calLegendItem}>
              <View
                style={[st.calLegendDot, { backgroundColor: colors.accent }]}
              />
              <Text style={[st.calLegendTxt, { color: colors.textSecondary }]}>
                Hoy
              </Text>
            </View>
            <View style={st.calLegendItem}>
              <View
                style={[st.calLegendDot, { backgroundColor: colors.warning }]}
              />
              <Text style={[st.calLegendTxt, { color: colors.textSecondary }]}>
                Programado
              </Text>
            </View>
            <View style={st.calLegendItem}>
              <View
                style={[st.calLegendDot, { backgroundColor: colors.error }]}
              />
              <Text style={[st.calLegendTxt, { color: colors.textSecondary }]}>
                Vencido
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Pager KPI cards ───
  const kpiPages = useMemo(
    () => [
      {
        title: "Resumen",
        badge: `${counts.total} total`,
        badgeBg: colors.accentLight,
        badgeColor: colors.accent,
        stats: [
          {
            label: "Hoy",
            value: counts.hoy,
            icon: "today" as const,
            color: colors.warning,
          },
          {
            label: "Atrasados",
            value: counts.atrasados,
            icon: "alert-circle" as const,
            color: colors.error,
          },
          {
            label: "Próximos",
            value: counts.proximos,
            icon: "calendar" as const,
            color: colors.accent,
          },
        ],
      },
      {
        title: "Progreso",
        badge: `${counts.total > 0 ? Math.round((counts.trabajando / counts.total) * 100) : 0}% activo`,
        badgeBg: colors.success + "15",
        badgeColor: colors.success,
        stats: [
          {
            label: "En progreso",
            value: counts.trabajando,
            icon: "hammer" as const,
            color: colors.accent,
          },
          {
            label: "Pendientes",
            value: counts.pendientes,
            icon: "time" as const,
            color: colors.warning,
          },
          {
            label: "Asignados",
            value: counts.total,
            icon: "layers" as const,
            color: colors.success,
          },
        ],
      },
    ],
    [counts, colors],
  );

  const KpiPager = () => (
    <View style={{ marginTop: 6, marginBottom: 6 }}>
      <FlatList
        data={kpiPages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / PAGER_W);
          setKpiPage(page);
        }}
        getItemLayout={(_, index) => ({
          length: PAGER_W,
          offset: PAGER_W * index,
          index,
        })}
        snapToAlignment="start"
        decelerationRate="fast"
        renderItem={({ item: page }) => (
          <View
            style={[
              st.pagerCard,
              { width: PAGER_W, backgroundColor: colors.surface },
            ]}
          >
            <View style={st.pagerRow}>
              <Text style={[st.pagerLabel, { color: colors.textSecondary }]}>
                {page.title}
              </Text>
              <View style={[st.pagerBadge, { backgroundColor: page.badgeBg }]}>
                <Text style={[st.pagerBadgeTxt, { color: page.badgeColor }]}>
                  {page.badge}
                </Text>
              </View>
            </View>
            <View style={st.pagerStats}>
              {page.stats.map((s, si) => (
                <React.Fragment key={si}>
                  {si > 0 && (
                    <View
                      style={[
                        st.pagerDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                  <View style={st.pagerStat}>
                    <View
                      style={[
                        st.pagerStatIcon,
                        { backgroundColor: s.color + "15" },
                      ]}
                    >
                      <Ionicons name={s.icon} size={18} color={s.color} />
                    </View>
                    <Text style={[st.pagerStatVal, { color: colors.text }]}>
                      {s.value}
                    </Text>
                    <Text
                      style={[st.pagerStatLbl, { color: colors.textTertiary }]}
                    >
                      {s.label}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={st.dots}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[
              st.dot,
              {
                backgroundColor:
                  kpiPage === i ? colors.accent : colors.textTertiary + "30",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // ─── List Header ───
  const Header = () => (
    <>
      <KpiPager />

      {/* Week strip */}
      <View style={st.weekBlock}>
        <View style={st.weekTopRow}>
          <Text style={[st.weekTitle, { color: colors.textSecondary }]}>
            Esta semana
          </Text>
          <TouchableOpacity onPress={openCal} hitSlop={8}>
            <Text style={[st.weekLink, { color: colors.accent }]}>
              Ver calendario
            </Text>
          </TouchableOpacity>
        </View>
        <View style={st.weekStrip}>
          {weekDays.map((day, i) => {
            const isT = isSameDay(day, today);
            const has = hasDot(day);
            return (
              <View
                key={i}
                style={[
                  st.wDay,
                  isT && { backgroundColor: colors.accent, borderRadius: 14 },
                ]}
              >
                <Text
                  style={[
                    st.wDayL,
                    { color: isT ? "#FFFFFF90" : colors.textTertiary },
                  ]}
                >
                  {DIAS[day.getDay()]}
                </Text>
                <Text style={[st.wDayN, { color: isT ? "#FFF" : colors.text }]}>
                  {day.getDate()}
                </Text>
                {has && (
                  <View
                    style={[
                      st.wDot,
                      { backgroundColor: isT ? "#FFF" : colors.warning },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Segmented control */}
      <View style={[st.seg, { backgroundColor: colors.surface }]}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.7}
              onPress={() => setTab(t.key)}
              style={[
                st.segBtn,
                active && [
                  st.segBtnActive,
                  {
                    backgroundColor: colors.background,
                    shadowColor: colors.cardShadow,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  st.segTxt,
                  { color: active ? colors.text : colors.textTertiary },
                ]}
              >
                {t.label}
              </Text>
              {t.count > 0 && (
                <View
                  style={[
                    st.segBadge,
                    {
                      backgroundColor: active
                        ? colors.accent
                        : colors.textTertiary + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      st.segBadgeTxt,
                      { color: active ? "#FFF" : colors.textSecondary },
                    ]}
                  >
                    {t.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section label */}
      {filtered.length > 0 && (
        <Text style={[st.secLabel, { color: colors.textTertiary }]}>
          {tab === "hoy"
            ? "PARA HOY"
            : tab === "atrasados"
              ? "VENCIDOS"
              : tab === "proximos"
                ? "PROGRAMADOS"
                : "TODOS"}
          {"  "}
          <Text style={{ fontWeight: "800" }}>{filtered.length}</Text>
        </Text>
      )}
    </>
  );

  // ─── Main ───
  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={st.hdrInner}>
          <TouchableOpacity
            style={[st.hdrBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[st.hdrTitle, { color: colors.text }]}>
              Mis Inventarios
            </Text>
            <Text style={[st.hdrSub, { color: colors.textTertiary }]}>
              {DIAS_CORTO[today.getDay()]} {today.getDate()} de{" "}
              {MESES[today.getMonth()]}
            </Text>
          </View>
          <TouchableOpacity
            style={[st.hdrBtn, { backgroundColor: colors.surface }]}
            onPress={openCal}
            hitSlop={8}
          >
            <Ionicons name="calendar" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={st.loadW}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[st.loadTxt, { color: colors.textTertiary }]}>
            Cargando...
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeIn }}>
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.INVENTARIO_ID)}
            renderItem={renderCard}
            ListHeaderComponent={<Header />}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              st.list,
              { paddingBottom: insets.bottom + 24 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {calendarSheet}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 16 },
  loadW: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadTxt: { fontSize: 14, fontWeight: "500" },

  // Header
  hdr: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10 },
  hdrInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    height: 52,
  },
  hdrBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hdrTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  hdrSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },

  // Pager KPI
  pagerCard: { borderRadius: 18, padding: 18, marginHorizontal: 0 },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pagerLabel: { fontSize: 14, fontWeight: "600" },
  pagerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pagerBadgeTxt: { fontSize: 11, fontWeight: "700" },
  pagerStats: { flexDirection: "row", alignItems: "center" },
  pagerStat: { flex: 1, alignItems: "center", gap: 4 },
  pagerStatIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerStatVal: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  pagerStatLbl: { fontSize: 11, fontWeight: "600" },
  pagerDivider: { width: 1, height: 36, alignSelf: "center" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Week
  weekBlock: { marginBottom: 14 },
  weekTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  weekTitle: { fontSize: 13, fontWeight: "600" },
  weekLink: { fontSize: 13, fontWeight: "600" },
  weekStrip: { flexDirection: "row", justifyContent: "space-between" },
  wDay: { flex: 1, alignItems: "center", paddingVertical: 8, gap: 3 },
  wDayL: { fontSize: 11, fontWeight: "600" },
  wDayN: { fontSize: 17, fontWeight: "700" },
  wDot: { width: 5, height: 5, borderRadius: 3 },

  // Segmented
  seg: { flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 14 },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segBtnActive: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  segTxt: { fontSize: 13, fontWeight: "600" },
  segBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  segBadgeTxt: { fontSize: 10, fontWeight: "800" },

  // Section
  secLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconW: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  cardSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  cardDate: { fontSize: 13, fontWeight: "700" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillTxt: { fontSize: 11, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipTxt: { fontSize: 10, fontWeight: "600" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  ctaTxt: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // Empty
  empty: {
    alignItems: "center",
    paddingTop: 50,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },

  // Calendar sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "#00000050",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
  },
  sheetHandle: { alignItems: "center", paddingVertical: 10 },
  sheetBar: { width: 36, height: 5, borderRadius: 3 },
  calNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calNavTitle: { fontSize: 18, fontWeight: "700" },
  calDayNamesRow: { flexDirection: "row", marginBottom: 4 },
  calDayNameTxt: { textAlign: "center", fontSize: 12, fontWeight: "700" },
  calRow: { flexDirection: "row" },
  calCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayTxt: { fontSize: 15, fontWeight: "600" },
  calDotArea: {
    position: "absolute",
    bottom: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  calSmallDot: { width: 4, height: 4, borderRadius: 2 },
  calDotCnt: { fontSize: 8, fontWeight: "800" },

  // Calendar detail
  calDetail: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  calDetailTitle: { fontSize: 16, fontWeight: "700" },
  calDetailCount: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  calDetailCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  calDetailName: { fontSize: 14, fontWeight: "600" },
  calDetailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  calDetailGo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  calLegend: {
    flexDirection: "row",
    gap: 18,
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  calLegendDot: { width: 8, height: 8, borderRadius: 4 },
  calLegendTxt: { fontSize: 12, fontWeight: "500" },
});
