/**
 * usePushNotifications.ts
 *
 * Hook para registrar Expo Push Notifications,
 * guardar el token en el backend y escuchar notificaciones entrantes.
 */

import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/context/auth-context";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const API_URL = API_CONFIG.BASE_URL;

// ── Configurar cómo se muestran las notificaciones en foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Registrar canal de Android ──
async function setupAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("inventarios", {
      name: "Inventarios",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3B82F6",
      sound: "default",
    });

    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }
}

// ── Obtener el Expo Push Token ──
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications solo funcionan en dispositivos físicos");
    return null;
  }

  // Verificar/pedir permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permisos de notificación denegados");
    return null;
  }

  // Obtener projectId del EAS config
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.log("No se encontró projectId de EAS");
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.error("Error obteniendo push token:", e);
    return null;
  }
}

// ── Hook principal ──
export function usePushNotifications() {
  const { user, companyCode, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.USUARIO_ID || !companyCode) return;

    let mounted = true;

    (async () => {
      await setupAndroidChannel();
      const token = await registerForPushNotificationsAsync();

      if (!token || !mounted) return;
      setExpoPushToken(token);

      // Guardar token en backend
      try {
        await fetch(`${API_URL}/api/registrar-push-token.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyCode,
            usuarioId: user.USUARIO_ID,
            pushToken: token,
          }),
        });
        console.log(
          "✅ Push token registrado:",
          token.substring(0, 30) + "...",
        );
      } catch (e) {
        console.error("Error registrando push token:", e);
      }
    })();

    // Listener: notificación recibida en foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        if (mounted) setNotification(notif);
      });

    // Listener: usuario tocó la notificación
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("📱 Notificación tocada, data:", data);

        // Aquí se puede navegar según el tipo
        if (data?.type === "inventario_asignado") {
          // La navegación se maneja desde el layout que use este hook
        }
      });

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, user?.USUARIO_ID, companyCode]);

  return {
    expoPushToken,
    notification,
  };
}
