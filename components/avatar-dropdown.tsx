import { useAuth } from "@/context/auth-context";
import { useTheme, useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Avatares disponibles (mismo que en perfil.tsx)
const AVATARS: { id: string; source: ImageSourcePropType }[] = [
  { id: "a1", source: require("@/assets/images/a1.png") },
  { id: "a2", source: require("@/assets/images/a2.png") },
  { id: "a3", source: require("@/assets/images/a3.png") },
  { id: "a4", source: require("@/assets/images/a4.png") },
  { id: "a5", source: require("@/assets/images/a5.png") },
  { id: "a6", source: require("@/assets/images/a6.png") },
];

export function AvatarDropdown() {
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Determinar la fuente del avatar
  const avatarSource = useMemo(() => {
    if (!user?.AVATAR_URL) {
      return require("@/assets/images/avatar.png");
    }

    if (user.AVATAR_URL.startsWith("avatar:")) {
      const avatarId = user.AVATAR_URL.replace("avatar:", "");
      const avatar = AVATARS.find((a) => a.id === avatarId);
      return avatar?.source || require("@/assets/images/avatar.png");
    }

    // Es una URL de imagen
    return { uri: user.AVATAR_URL };
  }, [user?.AVATAR_URL]);

  // Obtener iniciales si no hay avatar
  const getInitials = () => {
    if (!user) return "U";
    const nombre = user.NOMBRE || "";
    const apellido = user.APELLIDO_PATERNO || "";
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const menuOptions = [
    {
      icon: "person-outline",
      label: "Perfil",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/configuracion/perfil");
      },
    },
    {
      icon: "chatbubble-outline",
      label: "Chat",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/chats");
      },
    },
    {
      icon: "flash-outline",
      label: "Acción Rápida",
      onPress: () => {
        setIsOpen(false);
        // TODO: Quick action
      },
    },
    {
      icon: "settings-outline",
      label: "Configuración",
      onPress: () => {
        setIsOpen(false);
        router.push("/(main)/configuracion");
      },
    },
    {
      icon: "log-out-outline",
      label: "Cerrar Sesión",
      color: "#EF4444",
      onPress: () => {
        setIsOpen(false);
        Alert.alert(
          "Cerrar Sesión",
          "¿Estás seguro que deseas cerrar sesión?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Salir",
              style: "destructive",
              onPress: () => {
                logout();
                router.replace("/(auth)/company-code");
              },
            },
          ],
        );
      },
    },
  ];

  return (
    <>
      {/* Botón de Notificaciones */}
      <TouchableOpacity
        onPress={() => {
          // TODO: Navigate to notifications
        }}
        style={[
          styles.iconButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={18}
          color={colors.accent}
        />
      </TouchableOpacity>

      {/* Botón de Tema */}
      <TouchableOpacity
        onPress={toggleTheme}
        style={[
          styles.iconButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name={isDark ? "sunny-outline" : "moon-outline"}
          size={18}
          color={colors.accent}
        />
      </TouchableOpacity>

      {/* Avatar con Menú */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={[
          styles.avatarButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Image source={avatarSource} style={styles.avatarImage} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  index < menuOptions.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dropdownIconContainer,
                    {
                      backgroundColor: option.color
                        ? `${option.color}15`
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={option.color || colors.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.dropdownLabel,
                    { color: option.color || colors.text },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Platform.OS === "ios" ? 0 : 8,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 60,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
