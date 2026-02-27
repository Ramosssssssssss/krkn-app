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
  const lastSeenIdRef = useRef(0);
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
          lastSeenIdRef.current = id;
          console.log("[VENTANILLA] LastSeenId cargado:", id);
        }
      } catch (e) {
        console.warn("[VENTANILLA] Error cargando lastSeenId:", e);
      }
    };
    loadLastSeenId();
  }, []);

  // Función de polling (sin dependencias de estado para evitar re-creación)
  const poll = useCallback(async () => {
    try {
      const databaseId = getCurrentDatabaseId();
      if (!databaseId) return;

      const currentLastId = lastSeenIdRef.current;

      const response = await fetch(`${API_URL}/api/ventanilla-eventos.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId,
          afterId: currentLastId,
          limit: 5,
        }),
      });

      const data = await response.json();

      if (data.success && data.eventos && data.eventos.length > 0) {
        const nuevos = data.eventos.filter(
          (ev: VentanillaEvento) => !processedIds.current.has(ev.EVENTO_ID),
        );

        if (nuevos.length > 0) {
          const evento = nuevos[0];
          console.log("[VENTANILLA] ¡Nuevo traspaso!", evento.FOLIO);
          processedIds.current.add(evento.EVENTO_ID);
          setNuevoTraspaso(evento);
          if (onNewVentanilla) onNewVentanilla(evento);

          // Actualizar Ref y Storage (sin disparar re-render de poll)
          lastSeenIdRef.current = Math.max(lastSeenIdRef.current, evento.EVENTO_ID);
          AsyncStorage.setItem(STORAGE_LAST_SEEN, String(lastSeenIdRef.current));
        }

        if (data.lastId > lastSeenIdRef.current) {
          lastSeenIdRef.current = data.lastId;
          AsyncStorage.setItem(STORAGE_LAST_SEEN, String(data.lastId));
        }
      }
    } catch (error) {
      console.error("[VENTANILLA] Error en polling:", error);
    }
  }, [onNewVentanilla]);

  // Iniciar/detener polling (solo si cambia enabled)
  useEffect(() => {
    if (enabled) {
      setIsPolling(true);
      // Primera consulta inmediata
      poll();
      // Polling periódico
      intervalRef.current = setInterval(poll, POLLING_INTERVAL);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsPolling(false);
      };
    } else {
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
