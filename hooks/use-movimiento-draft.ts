/**
 * useMovimientoDraft — Hook genérico para persistir/restaurar borradores
 * de cualquier movimiento de inventario (entradas, salidas, conteo, solicitudes).
 *
 * Recibe un `storageKey` único para cada tipo de pantalla.
 * Auto-guarda con debounce de 800ms. Restaura al montar.
 */
import { ArticuloDetalle } from "@/types/inventarios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

export interface MovimientoDraft {
  sucursalId: number | null;
  almacenId: number | null;
  /** Campo extra libre (ubicación, origen, etc.) */
  extra: Record<string, any>;
  detalles: ArticuloDetalle[];
  savedAt: string;
}

export function useMovimientoDraft(storageKey: string) {
  const [pendingDraft, setPendingDraft] = useState<MovimientoDraft | null>(
    null,
  );
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar borrador al montar ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const draft: MovimientoDraft = JSON.parse(raw);
          if (draft.detalles && draft.detalles.length > 0) {
            setPendingDraft(draft);
          } else {
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn(`Error loading draft [${storageKey}]:`, e);
      } finally {
        setIsLoadingDraft(false);
      }
    })();
  }, [storageKey]);

  // ── Guardar borrador (debounced 800ms) ───────────────────
  const saveDraft = useCallback(
    (draft: Omit<MovimientoDraft, "savedAt">) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);

      saveTimeout.current = setTimeout(async () => {
        try {
          if (!draft.detalles || draft.detalles.length === 0) {
            await AsyncStorage.removeItem(storageKey);
            return;
          }
          const payload: MovimientoDraft = {
            ...draft,
            savedAt: new Date().toISOString(),
          };
          await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (e) {
          console.warn(`Error saving draft [${storageKey}]:`, e);
        }
      }, 800);
    },
    [storageKey],
  );

  // ── Limpiar borrador ─────────────────────────────────────
  const clearDraft = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setPendingDraft(null);
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(`Error clearing draft [${storageKey}]:`, e);
    }
  }, [storageKey]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
    clearDraft();
  }, [clearDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  return {
    pendingDraft,
    isLoadingDraft,
    saveDraft,
    clearDraft,
    dismissDraft,
  };
}
