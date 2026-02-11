import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ─── Avatar presets (synced with avatar-dropdown) ─── */
const AVATARS = [
  { id: "a1", source: require("@/assets/images/a1.png") },
  { id: "a2", source: require("@/assets/images/a2.png") },
  { id: "a3", source: require("@/assets/images/a3.png") },
  { id: "a4", source: require("@/assets/images/a4.png") },
  { id: "a5", source: require("@/assets/images/a5.png") },
  { id: "a6", source: require("@/assets/images/a6.png") },
];

/* ─── Types ─── */
type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  label: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
};

/* ─── Setting Item (KRKN style) ─── */
function SettingItem({
  icon,
  iconTint,
  label,
  value,
  badge,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) {
  const colors = useThemeColors();
  const tint = iconTint || colors.accent;

  return (
    <TouchableOpacity
      style={[
        s.settingItem,
        { backgroundColor: colors.surface },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[s.settingIconCircle, { backgroundColor: tint + "18" }]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <View style={s.settingBody}>
        <Text
          style={[s.settingLabel, { color: colors.text }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {badge && (
          <View
            style={[s.badge, { backgroundColor: colors.accent + "18" }]}
          >
            <Text style={[s.badgeText, { color: colors.accent }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      {value && !rightElement && (
        <Text
          style={[s.settingValue, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
      {rightElement}
      {showChevron && onPress && !rightElement && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
          style={{ marginLeft: 2 }}
        />
      )}
    </TouchableOpacity>
  );
}

/* ─── Setting Section (KRKN grouped) ─── */
function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: colors.accent }]} />
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
      </View>
      <View style={s.sectionItems}>{children}</View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function ConfiguracionScreen() {
  const colors = useThemeColors();
  const { isDark, toggleTheme } = useTheme();
  const { companyCode, user, logout } = useAuth();
  const { t, language } = useLanguage();

  /* ── Resolve avatar source ── */
  const avatarSource = useMemo(() => {
    if (!user?.AVATAR_URL) return require("@/assets/images/avatar.png");
    if (user.AVATAR_URL.startsWith("avatar:")) {
      const id = user.AVATAR_URL.replace("avatar:", "");
      return AVATARS.find((a) => a.id === id)?.source || require("@/assets/images/avatar.png");
    }
    return { uri: user.AVATAR_URL };
  }, [user?.AVATAR_URL]);

  const fullName = user
    ? `${user.NOMBRE || ""} ${user.APELLIDO_PATERNO || ""}`.trim() || user.USERNAME
    : "Usuario";

  const initials = user
    ? `${(user.NOMBRE || "").charAt(0)}${(user.APELLIDO_PATERNO || "").charAt(0)}`.toUpperCase()
    : "U";

  const email = user?.EMAIL || `usuario@${companyCode}.krkn.mx`;

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/company-code");
  };

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Card ── */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push("/(main)/configuracion/perfil")}
        style={[
          s.profileCard,
          {
            backgroundColor: colors.surface,
            shadowColor: isDark ? "rgba(0,0,0,0.5)" : colors.cardShadow,
          },
        ]}
      >
        <View style={s.profileRow}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            {user?.AVATAR_URL ? (
              <Image source={avatarSource} style={s.avatar} />
            ) : (
              <View
                style={[
                  s.avatar,
                  s.avatarInitials,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={s.avatarInitialsText}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={s.profileInfo}>
            <Text
              style={[s.profileName, { color: colors.text }]}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            <Text
              style={[s.profileEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {email}
            </Text>
            {user?.USERNAME && (
              <Text
                style={[s.profileUsername, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                @{user.USERNAME}
              </Text>
            )}
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </View>
      </TouchableOpacity>

      {/* ── Cuenta ── */}
      <SettingSection title={t("settings.section.account")}>
        <SettingItem
          icon="person-outline"
          label={t("settings.profile")}
          value={t("settings.profileDesc")}
          onPress={() => router.push("/(main)/configuracion/perfil")}
        />
        <SettingItem
          icon="business-outline"
          iconTint="#5856D6"
          label={t("settings.account")}
          value={`${companyCode}.krkn.mx`}
          onPress={() => router.push("/(main)/configuracion/cuenta")}
        />
        <SettingItem
          icon="key-outline"
          iconTint="#FF9500"
          label={t("settings.security")}
          value={t("settings.securityDesc")}
          onPress={() => router.push("/(main)/configuracion/seguridad")}
        />
      </SettingSection>

      {/* ── Preferencias ── */}
      <SettingSection title={t("settings.section.preferences")}>
        <SettingItem
          icon={isDark ? "moon" : "sunny"}
          iconTint={isDark ? "#AF52DE" : "#FF9500"}
          label={t("settings.darkMode")}
          showChevron={false}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E5E7EB", true: colors.accent }}
              thumbColor="#FFFFFF"
              style={Platform.OS === "ios" ? { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] } : undefined}
            />
          }
        />
        <SettingItem
          icon="color-palette-outline"
          iconTint="#AF52DE"
          label={t("settings.appearance")}
          value={t("settings.appearanceDesc")}
          onPress={() => router.push("/(main)/configuracion/apariencia")}
        />
        <SettingItem
          icon="notifications-outline"
          iconTint="#FF3B30"
          label={t("settings.notifications")}
          onPress={() => router.push("/(main)/configuracion/notificaciones")}
        />
        <SettingItem
          icon="language-outline"
          label={t("settings.language")}
          value={language === "es" ? "Español" : "English"}
          onPress={() => router.push("/(main)/configuracion/idioma")}
        />
        <SettingItem
          icon="hand-left-outline"
          iconTint="#FF2D55"
          label="Botón de asistencia"
          badge="BETA"
          onPress={() => router.push("/(main)/configuracion/asistencia")}
        />
      </SettingSection>

      {/* ── Almacén ── */}
      <SettingSection title={t("settings.section.warehouse")}>
        <SettingItem
          icon="cube-outline"
          iconTint="#34C759"
          label={t("settings.warehouse")}
          value="Principal"
          onPress={() => {}}
        />
        <SettingItem
          icon="print-outline"
          iconTint="#5AC8FA"
          label={t("settings.printer")}
          value={t("settings.printerDesc")}
          onPress={() => {}}
        />
        <SettingItem
          icon="scan-outline"
          iconTint="#FF9500"
          label={t("settings.scanner")}
          value={t("settings.scannerDesc")}
          onPress={() => {}}
        />
      </SettingSection>

      {/* ── Información ── */}
      <SettingSection title={t("settings.section.info")}>
        <SettingItem
          icon="information-circle-outline"
          iconTint="#8E8E93"
          label={t("settings.about")}
          value="v1.0.9"
          onPress={() => router.push("/(main)/configuracion/acerca")}
        />
        <SettingItem
          icon="help-circle-outline"
          label="Ayuda y Soporte"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          iconTint="#8E8E93"
          label="Términos y Condiciones"
          onPress={() => {}}
        />
      </SettingSection>

      {/* ── Cerrar sesión ── */}
      <View style={s.logoutSection}>
        <SettingItem
          icon="log-out-outline"
          iconTint="#FF3B30"
          label="Cerrar sesión"
          showChevron={false}
          onPress={handleLogout}
        />
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={[s.footerVersion, { color: colors.textTertiary }]}>
          KRKN WMS v1.0.9
        </Text>
        <Text style={[s.footerCopy, { color: colors.textTertiary }]}>
          © 2025 KRKN Systems
        </Text>
      </View>
    </ScrollView>
  );
}

/* ─── Styles ─── */
const RADIUS = 14;

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 50,
  },

  /* ── Profile ── */
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  avatarWrap: {},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitials: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitialsText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  profileUsername: {
    fontSize: 12,
    marginTop: 1,
    letterSpacing: -0.1,
  },

  /* ── Sections ── */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginLeft: 4,
    gap: 8,
  },
  sectionDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  sectionItems: {
    gap: 6,
  },

  /* ── Setting Item ── */
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  settingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  settingBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  settingValue: {
    fontSize: 13,
    letterSpacing: -0.1,
    maxWidth: 120,
    textAlign: "right",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  /* ── Logout ── */
  logoutSection: {
    marginTop: 28,
    paddingHorizontal: 16,
  },

  /* ── Footer ── */
  footer: {
    alignItems: "center",
    marginTop: 24,
    gap: 4,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  footerCopy: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
