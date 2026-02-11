import { AvatarDropdown } from "@/components/avatar-dropdown";
import { useLanguage } from "@/context/language-context";
import { useThemeColors } from "@/context/theme-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useDrawer } from "../_layout";

export default function InventariosLayout() {
  const colors = useThemeColors();
  const { toggleDrawer } = useDrawer();
  const { t } = useLanguage();

  const MenuButton = () => (
    <TouchableOpacity
      onPress={toggleDrawer}
      style={[
        styles.menuButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name="menu-outline" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("inventory.title"),
          headerLeft: () => <MenuButton />,
          headerRight: () => <AvatarDropdown />,
        }}
      />
      <Stack.Screen
        name="entradas/crear"
        options={{
          title: t("inventory.newEntry"),
        }}
      />
      <Stack.Screen
        name="entradas/index"
        options={{
          title: t("inventory.entries"),
        }}
      />
      <Stack.Screen
        name="salidas/crear"
        options={{
          title: t("inventory.newExit"),
        }}
      />
      <Stack.Screen
        name="salidas/index"
        options={{
          title: t("inventory.exits"),
        }}
      />
      <Stack.Screen
        name="recepcion/crear"
        options={{
          title: t("inventory.reception"),
        }}
      />

      <Stack.Screen
        name="recepcion/index"
        options={{
          title: t("inventory.receptions"),
        }}
      />
      <Stack.Screen
        name="recepcion/xml"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="conteo/total"
        options={{
          title: "Conteo Cíclico",
        }}
      />

      <Stack.Screen
        name="conteo/crear-conteo"
        options={{
          title: "Nuevo Conteo",
        }}
      />
      <Stack.Screen
        name="aplicar/index"
        options={{
          title: "Aplicar Inventario",
        }}
      />
      <Stack.Screen
        name="aplicar/confirmarInv"
        options={{
          title: "Resumen de Auditoría",
        }}
      />
      <Stack.Screen
        name="aplicar/exito"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="detalle"
        options={{
          title: "Detalle de Documento",
        }}
      />
      <Stack.Screen
        name="conteo/detalle-conteo"
        options={{
          title: "Detalle de Conteo",
        }}
      />
      <Stack.Screen
        name="asignados/index"
        options={{
          title: "Inventarios Asignados",
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
