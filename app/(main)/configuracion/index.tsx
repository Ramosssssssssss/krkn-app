import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type SettingItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  description?: string;
  badge?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
};

function SettingItem({
  icon,
  iconColor,
  label,
  description,
  badge,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View
        style={[
          styles.settingIconContainer,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor || colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <View style={styles.labelRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            {label}
          </Text>
          {badge && (
            <View
              style={[styles.badge, { backgroundColor: colors.accent + "20" }]}
            >
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {description && (
          <Text
            style={[styles.settingDescription, { color: colors.textSecondary }]}
          >
            {description}
          </Text>
        )}
      </View>
      {rightElement}
      {showChevron && onPress && !rightElement && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function ConfiguracionScreen() {
  const colors = useThemeColors();
  const { isDark, toggleTheme } = useTheme();
  const { companyCode, logout } = useAuth();
  const { t, language } = useLanguage();

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/company-code");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header del perfil */}
      <View
        style={[
          styles.profileHeader,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={require("@/assets/images/avatar.png")}
            style={styles.avatar}
          />
          <TouchableOpacity
            style={[
              styles.editAvatarButton,
              { backgroundColor: colors.accent },
            ]}
            onPress={() => router.push("/(main)/configuracion/perfil")}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          Usuario KRKN
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          usuario@{companyCode}.krkn.mx
        </Text>
        <TouchableOpacity
          style={[styles.editProfileButton, { borderColor: colors.border }]}
          onPress={() => router.push("/(main)/configuracion/perfil")}
        >
          <Text style={[styles.editProfileText, { color: colors.accent }]}>
            {t("settings.editProfile")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cuenta */}
      <SettingSection title={t("settings.section.account")}>
        <SettingItem
          icon="person-outline"
          label={t("settings.profile")}
          description={t("settings.profileDesc")}
          onPress={() => router.push("/(main)/configuracion/perfil")}
        />
        <SettingItem
          icon="business-outline"
          label={t("settings.account")}
          description={`${companyCode}.krkn.mx`}
          onPress={() => router.push("/(main)/configuracion/cuenta")}
        />
        <SettingItem
          icon="key-outline"
          label={t("settings.security")}
          description={t("settings.securityDesc")}
          onPress={() => router.push("/(main)/configuracion/seguridad")}
        />
      </SettingSection>

      {/* Preferencias */}
      <SettingSection title={t("settings.section.preferences")}>
        <SettingItem
          icon={isDark ? "moon" : "sunny"}
          iconColor={isDark ? "#9333EA" : "#F59E0B"}
          label={t("settings.darkMode")}
          description={t("settings.darkModeDesc")}
          showChevron={false}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E5E7EB", true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingItem
          icon="color-palette-outline"
          label={t("settings.appearance")}
          description={t("settings.appearanceDesc")}
          onPress={() => router.push("/(main)/configuracion/apariencia")}
        />
        <SettingItem
          icon="notifications-outline"
          label={t("settings.notifications")}
          description={t("settings.notificationsDesc")}
          onPress={() => router.push("/(main)/configuracion/notificaciones")}
        />
        <SettingItem
          icon="language-outline"
          label={t("settings.language")}
          description={
            language === "es"
              ? t("settings.languageDesc")
              : t("settings.languageDescEn")
          }
          onPress={() => router.push("/(main)/configuracion/idioma")}
        />
        <SettingItem
          icon="hand-left-outline"
          iconColor="#EF476F"
          label="Botón de asistencia"
          description="Activa un botón flotante de emergencia"
          badge="BETA"
          onPress={() => router.push("/(main)/configuracion/asistencia")}
        />
      </SettingSection>

      {/* Almacén */}
      <SettingSection title={t("settings.section.warehouse")}>
        <SettingItem
          icon="cube-outline"
          label={t("settings.warehouse")}
          description="Almacén Principal"
          onPress={() => {}}
        />
        <SettingItem
          icon="print-outline"
          label={t("settings.printer")}
          description={t("settings.printerDesc")}
          onPress={() => {}}
        />
        <SettingItem
          icon="scan-outline"
          label={t("settings.scanner")}
          description={t("settings.scannerDesc")}
          onPress={() => {}}
        />
      </SettingSection>

      {/* Información */}
      <SettingSection title={t("settings.section.info")}>
        <SettingItem
          icon="information-circle-outline"
          label={t("settings.about")}
          description={t("settings.aboutDesc")}
          onPress={() => router.push("/(main)/configuracion/acerca")}
        />
        <SettingItem
          icon="help-circle-outline"
          label="Ayuda y Soporte"
          description="FAQ, contacto, tutoriales"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          label="Términos y Condiciones"
          onPress={() => {}}
        />
      </SettingSection>

      {/* Cerrar sesión */}
      <TouchableOpacity
        style={[
          styles.logoutButton,
          { backgroundColor: "rgba(255, 69, 58, 0.1)" },
        ]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#FF453A" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      {/* Versión */}
      <Text style={[styles.versionText, { color: colors.textSecondary }]}>
        KRKN WMS v1.0.9 
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF453A",
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 20,
  },
});
