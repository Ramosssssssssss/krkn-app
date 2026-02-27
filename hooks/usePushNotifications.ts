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
import { router } from "expo-router";
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
      description: "Notificaciones de inventarios asignados y operaciones",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#3B82F6",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
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

// ── Navegar segun la data de la notificacion ──
function handleNotificationNavigation(data: Record<string, any>) {
  console.log(
    "[PUSH] handleNotificationNavigation llamada, data:",
    JSON.stringify(data),
  );

  if (data?.type === "inventario_asignado") {
    setTimeout(() => {
      // Params de ubicacion para pre-seleccionar
      const params: Record<string, string> = {};
      if (data.sucursalId) params.sucursalId = String(data.sucursalId);
      if (data.almacenId) params.almacenId = String(data.almacenId);

      if (data.esHoy === true || data.esHoy === "true") {
        const ruta =
          data.tipoConteo === "ubicacion"
            ? "/(main)/inventarios/conteo/conteo-ubicacion"
            : "/(main)/inventarios/conteo/crear-conteo";
        console.log("[PUSH] Navegando a:", ruta, "params:", params);
        router.push({ pathname: ruta as any, params });
      } else {
        console.log("[PUSH] Navegando a mis-inventarios");
        router.push("/(main)/inventarios/mis-inventarios" as any);
      }
    }, 800);
  }

  if (data?.type === "solicitud_aprobacion") {
    setTimeout(() => {
      console.log("[PUSH] Navegando a aprobaciones de inventario, folio:", data.folio);
      router.push({
        pathname: "/(main)/inventarios/aplicar/aprobaciones" as any,
        params: { folio: data.folio }
      });
    }, 800);
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
  const lastResponseId = useRef<string | null>(null);

  // ── SIEMPRE: Listeners de notificacion (independiente del auth) ──
  useEffect(() => {
    // Foreground: notificacion recibida
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
        console.log("[PUSH] Notificacion recibida en foreground");
      });

    // Tap: usuario toco la notificacion
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const id = response.notification.request.identifier;
        console.log("[PUSH] Tap detectado, id:", id);
        if (lastResponseId.current === id) return;
        lastResponseId.current = id;

        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    // Cold start: app abierta por notificacion
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      console.log("[PUSH] Cold start response, id:", id);
      if (lastResponseId.current === id) return;
      lastResponseId.current = id;

      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // ── Registro de token (requiere auth) ──
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
        console.log("Push token registrado:", token.substring(0, 30) + "...");
      } catch (e) {
        console.error("Error registrando push token:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.USUARIO_ID, companyCode]);

  return {
    expoPushToken,
    notification,
  };
}
