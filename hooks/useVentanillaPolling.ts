import { API_URL } from "@/config/api";
import { getCurrentDatabaseId } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_LAST_SEEN = "VENTANILLA_LAST_EVENTO_ID";
const POLLING_INTERVAL = 5000; // 5 segundos

export interface VentanillaEvento {
  EVENTO_ID: number;
  TRASPASO_IN_ID: number;
  FOLIO: string;
  ALMACEN: string;
  ESTATUS: string;
  FECHA?: string;
  HORA?: string;
}

interface UseVentanillaPollingOptions {
  enabled?: boolean;
  onNewVentanilla?: (ventanilla: VentanillaEvento) => void;
}

export function useVentanillaPolling(
  options: UseVentanillaPollingOptions = {},
) {
  const { enabled = true, onNewVentanilla } = options;

  const [nuevoTraspaso, setNuevoTraspaso] = useState<
    VentanillaEvento | undefined
  >();
  const [isPolling, setIsPolling] = useState(false);
  const [lastSeenId, setLastSeenId] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedIds = useRef<Set<number>>(new Set());

  // Cargar último ID visto desde storage
  useEffect(() => {
    const loadLastSeenId = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_LAST_SEEN);
        if (stored) {
          const id = parseInt(stored, 10);
          setLastSeenId(id);
          console.log("[VENTANILLA] LastSeenId cargado:", id);
        }
      } catch (e) {
        console.warn("[VENTANILLA] Error cargando lastSeenId:", e);
      }
    };
    loadLastSeenId();
  }, []);

  // Guardar último ID visto
  const saveLastSeenId = useCallback(
    async (id: number) => {
      if (id > lastSeenId) {
        setLastSeenId(id);
        try {
          await AsyncStorage.setItem(STORAGE_LAST_SEEN, String(id));
        } catch (e) {
          console.warn("[VENTANILLA] Error guardando lastSeenId:", e);
        }
      }
    },
    [lastSeenId],
  );

  // Función de polling
  const poll = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId) return;

      const response = await fetch(`${API_URL}/api/ventanilla-eventos.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          afterId: lastSeenId,
          limit: 5,
        }),
      });

      const data = await response.json();

      if (data.success && data.eventos && data.eventos.length > 0) {
        // Filtrar eventos ya procesados (por EVENTO_ID)
        const nuevos = data.eventos.filter(
          (ev: VentanillaEvento) => !processedIds.current.has(ev.EVENTO_ID),
        );

        if (nuevos.length > 0) {
          // Tomar el primero que no hayamos procesado
          const evento = nuevos[0];
          console.log(
            "[VENTANILLA] ¡Nuevo traspaso detectado!",
            evento.FOLIO,
            "EVENTO_ID:",
            evento.EVENTO_ID,
          );

          // Marcar como procesado por EVENTO_ID
          processedIds.current.add(evento.EVENTO_ID);

          // Notificar
          setNuevoTraspaso(evento);
          if (onNewVentanilla) {
            onNewVentanilla(evento);
          }

          // Actualizar lastSeenId con el EVENTO_ID
          saveLastSeenId(evento.EVENTO_ID);
        }

        // Actualizar el lastId general
        if (data.lastId > lastSeenId) {
          saveLastSeenId(data.lastId);
        }
      }
    } catch (error) {
      console.error("[VENTANILLA] Error en polling:", error);
    }
  }, [lastSeenId, onNewVentanilla, saveLastSeenId]);

  // Iniciar/detener polling
  useEffect(() => {
    if (enabled) {
      console.log(
        "[VENTANILLA] Iniciando polling cada",
        POLLING_INTERVAL / 1000,
        "segundos",
      );
      setIsPolling(true);

      // Primera consulta inmediata
      poll();

      // Polling periódico
      intervalRef.current = setInterval(poll, POLLING_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPolling(false);
    }
  }, [enabled, poll]);

  // Limpiar notificación actual
  const clearNuevoTraspaso = useCallback(() => {
    setNuevoTraspaso(undefined);
  }, []);

  // Marcar un evento como tomado (para que no vuelva a aparecer)
  const marcarComoTomado = useCallback(
    (eventoId: number) => {
      processedIds.current.add(eventoId);
      if (nuevoTraspaso?.EVENTO_ID === eventoId) {
        setNuevoTraspaso(undefined);
      }
    },
    [nuevoTraspaso],
  );

  return {
    nuevoTraspaso,
    setNuevoTraspaso,
    clearNuevoTraspaso,
    marcarComoTomado,
    isPolling,
    lastSeenId,
  };
}
