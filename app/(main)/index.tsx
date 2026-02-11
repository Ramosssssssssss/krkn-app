import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Database, getDatabases, setCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const { companyCode, selectedDatabase, selectDatabase, user } = useAuth();
  const { t, language } = useLanguage();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState<Database | null>(
    selectedDatabase,
  );
  const [showDbModal, setShowDbModal] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [stats, setStats] = useState({
    articulos: 0,
    categorias: 0,
    almacenes: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Cargar bases de datos de la empresa
  useEffect(() => {
    if (companyCode) {
      loadDatabases();
    }
  }, [companyCode]);

  useEffect(() => {
    if (selectedDb) {
      loadStats();
    }
  }, [selectedDb]);

  const loadStats = async () => {
    if (!selectedDb) return;
    setLoadingStats(true);
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DASHBOARD_STATS}?databaseId=${selectedDb.id}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok) {
        setStats({
          articulos: data.articulos || 0,
          categorias: data.categorias || 0,
          almacenes: data.almacenes || 0,
        });
      }
    } catch (e) {
      console.error("Error loading stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadDatabases = async () => {
    if (!companyCode) return;

    setLoadingDatabases(true);
    try {
      const response = await getDatabases(companyCode);
      // console.log("getDatabases response:", response);

      if (response.ok && response.databases) {
        // console.log("Databases loaded:", response.databases);
        setDatabases(response.databases);

        // Si ya hay una BD seleccionada en el contexto, usarla
        if (selectedDatabase) {
          setSelectedDb(selectedDatabase);
          setCurrentDatabaseId(selectedDatabase.id);
        } else {
          // Seleccionar la primera base de datos por defecto
          const dbToSelect = response.databases[0];
          console.log("Selected DB:", dbToSelect);
          setSelectedDb(dbToSelect);
          selectDatabase(dbToSelect); // Guardar en contexto
          setCurrentDatabaseId(dbToSelect.id); // Establecer para las peticiones
        }
      } else {
        console.log("No databases found or error:", response.message);
      }
    } catch (error) {
      console.error("Error loading databases:", error);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const today = new Date().toLocaleDateString(
    language === "en" ? "en-US" : "es-MX",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.initialBadge, { borderColor: colors.border }]}>
              <Text style={[styles.initialText, { color: colors.accent }]}>
                {companyCode?.charAt(0).toUpperCase() || "K"}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.company, { color: colors.text }]}>
                {companyCode?.toUpperCase() || "EMPRESA"}
              </Text>
              <Text style={[styles.date, { color: colors.textTertiary }]}>
                {today}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <LinearGradient
              colors={["transparent", `${colors.accent}50`, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGlow}
            />
            <View style={styles.statsGrid}>
              <StatItem
                key="products"
                value={formatNumber(stats.articulos)}
                isLoading={loadingStats}
                label={t("inventory.products")}
                colors={colors}
              />
              <View
                key="div1"
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <StatItem
                key="categories"
                value={formatNumber(stats.categorias)}
                isLoading={loadingStats}
                label={t("inventory.categories")}
                colors={colors}
              />
              <View
                key="div2"
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <StatItem
                key="warehouses"
                value={formatNumber(stats.almacenes)}
                isLoading={loadingStats}
                label={t("inventory.warehouses")}
                colors={colors}
              />
            </View>
          </View>

          {/* Session Info - Expanded */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            {t("home.activeSession")}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <InfoRow
              icon="person-outline"
              label={t("home.user")}
              value={
                user
                  ? `${user.NOMBRE} ${user.APELLIDO_PATERNO || ""} ${user.APELLIDO_MATERNO || ""}`.trim()
                  : "Usuario"
              }
              colors={colors}
            />
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <InfoRow
              icon="at-outline"
              label="Username"
              value={user?.USERNAME || "N/A"}
              colors={colors}
            />
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={user?.EMAIL || "Sin correo"}
              colors={colors}
            />
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <InfoRow
              icon="call-outline"
              label="Teléfono"
              value={user?.TELEFONO || "Sin teléfono"}
              colors={colors}
            />
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <InfoRow
              icon="business-outline"
              label={t("home.company")}
              value={companyCode?.toUpperCase() || "EMPRESA"}
              colors={colors}
            />
            <View
              style={[styles.rowDivider, { backgroundColor: colors.border }]}
            />
            <InfoRow
              icon="shield-checkmark-outline"
              label={t("home.role")}
              value={t("home.administrator")}
              colors={colors}
            />
          </View>

          {/* Database - At bottom */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            {t("home.configuration")}
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {loadingDatabases ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[styles.loadingText, { color: colors.textTertiary }]}
                >
                  Cargando bases de datos...
                </Text>
              </View>
            ) : selectedDb ? (
              <>
                <View style={styles.dbRow}>
                  <View
                    style={[
                      styles.dbIcon,
                      { backgroundColor: colors.accentLight },
                    ]}
                  >
                    <Ionicons
                      name="server-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.dbInfo}>
                    <Text style={[styles.dbName, { color: colors.text }]}>
                      {selectedDb.nombre}
                    </Text>
                    <Text
                      style={[styles.dbServer, { color: colors.textTertiary }]}
                    >
                      {selectedDb.ip_servidor}:{selectedDb.puerto_bd}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${colors.success}15` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: colors.success },
                      ]}
                    />
                    <Text
                      style={[styles.statusText, { color: colors.success }]}
                    >
                      Online
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.rowDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => setShowDbModal(true)}
                  activeOpacity={0.6}
                  disabled={databases.length === 0}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={16}
                    color={colors.accent}
                  />
                  <Text
                    style={[styles.changeBtnText, { color: colors.accent }]}
                  >
                    {t("home.changeDatabase")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.loadingText, { color: colors.textTertiary }]}
                >
                  No hay bases de datos disponibles
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer - Always at bottom */}
      <View style={[styles.footerContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footer, { color: colors.textTertiary }]}>
          KRKN WMS v1.0.0
        </Text>
      </View>

      {/* Modal */}
      <Modal
        visible={showDbModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDbModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={styles.modalBlur}
          >
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t("home.database")}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    { backgroundColor: colors.accentLight },
                  ]}
                  onPress={() => setShowDbModal(false)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {databases.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <Text
                    style={[styles.loadingText, { color: colors.textTertiary }]}
                  >
                    No hay bases de datos disponibles
                  </Text>
                </View>
              ) : (
                databases.map((db) => (
                  <TouchableOpacity
                    key={db.id}
                    style={[
                      styles.dbOption,
                      {
                        borderColor:
                          selectedDb?.id === db.id
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedDb(db);
                      selectDatabase(db); // Guardar en contexto
                      setCurrentDatabaseId(db.id); // Establecer para las peticiones
                      setShowDbModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dbOptionIcon,
                        { backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Ionicons
                        name="server-outline"
                        size={16}
                        color={
                          selectedDb?.id === db.id
                            ? colors.accent
                            : colors.textTertiary
                        }
                      />
                    </View>
                    <View style={styles.dbOptionInfo}>
                      <Text
                        style={[
                          styles.dbOptionName,
                          {
                            color:
                              selectedDb?.id === db.id
                                ? colors.accent
                                : colors.text,
                          },
                        ]}
                      >
                        {db.nombre}
                      </Text>
                      <Text
                        style={[
                          styles.dbOptionServer,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {db.ip_servidor}:{db.puerto_bd}
                      </Text>
                    </View>
                    {selectedDb?.id === db.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

function AnimatedPulse({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: pulseAnim,
        transform: [{ scale: pulseAnim }],
        flexDirection: "row",
        gap: 3,
        alignItems: "center",
        height: 24,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: colors.textTertiary,
          }}
        />
      ))}
    </Animated.View>
  );
}

function StatItem({
  value,
  label,
  colors,
  isLoading,
}: {
  value: string;
  label: string;
  colors: any;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.statItem}>
      {isLoading ? (
        <AnimatedPulse colors={colors} />
      ) : (
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      )}
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textTertiary} />
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  initialBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerInfo: {
    marginLeft: 14,
  },
  company: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  // Stats
  statsGrid: {
    flexDirection: "row",
    paddingVertical: 18,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    alignSelf: "center",
  },
  // Info Row
  rowDivider: {
    height: 1,
    marginLeft: 40,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Database
  dbRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  dbIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dbInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dbName: {
    fontSize: 14,
    fontWeight: "600",
  },
  dbServer: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Footer
  footerContainer: {
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    alignItems: "center",
    borderTopWidth: 1,
  },
  footer: {
    fontSize: 11,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBlur: {
    borderRadius: 18,
    overflow: "hidden",
    marginHorizontal: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dbOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dbOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dbOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dbOptionName: {
    fontSize: 13,
    fontWeight: "600",
  },
  dbOptionServer: {
    fontSize: 10,
    marginTop: 2,
  },
});
