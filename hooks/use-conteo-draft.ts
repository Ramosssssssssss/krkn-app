/**
 * useConteoDraft — Persiste/restaura borradores de conteo cíclico con AsyncStorage.
 *
 * Auto-guarda cada vez que cambian los detalles, sucursal, almacen o ubicacion.
 * Al montar, verifica si hay un borrador pendiente y expone `pendingDraft`.
 */
import { ArticuloDetalle } from "@/types/inventarios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_KEY = "conteo_ciclico_draft";

export interface ConteoDraft {
  sucursalId: number | null;
  almacenId: number | null;
  ubicacion: string;
  detalles: ArticuloDetalle[];
  savedAt: string; // ISO timestamp
}

export function useConteoDraft() {
  const [pendingDraft, setPendingDraft] = useState<ConteoDraft | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar borrador al montar ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft: ConteoDraft = JSON.parse(raw);
          // Solo restaurar si tiene artículos
          if (draft.detalles && draft.detalles.length > 0) {
            setPendingDraft(draft);
          } else {
            // Borrador vacío, limpiarlo
            await AsyncStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (e) {
        console.warn("Error loading conteo draft:", e);
      } finally {
        setIsLoadingDraft(false);
      }
    })();
  }, []);

  // ── Guardar borrador (debounced 800ms) ───────────────────
  const saveDraft = useCallback((draft: Omit<ConteoDraft, "savedAt">) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        // Si no hay artículos, no guardar borrador
        if (!draft.detalles || draft.detalles.length === 0) {
          await AsyncStorage.removeItem(DRAFT_KEY);
          return;
        }

        const payload: ConteoDraft = {
          ...draft,
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("Error saving conteo draft:", e);
      }
    }, 800);
  }, []);

  // ── Limpiar borrador (al guardar exitosamente o descartar) ─
  const clearDraft = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setPendingDraft(null);
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      console.warn("Error clearing conteo draft:", e);
    }
  }, []);

  // ── Descartar el borrador pendiente (no restaurar) ────────
  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
    clearDraft();
  }, [clearDraft]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  return {
    /** Borrador pendiente encontrado al cargar (null si no hay) */
    pendingDraft,
    /** true mientras se lee de AsyncStorage */
    isLoadingDraft,
    /** Guardar borrador (llamar al cambiar estado) */
    saveDraft,
    /** Limpiar borrador (llamar al guardar exitosamente o nuevo conteo) */
    clearDraft,
    /** Descartar el borrador pendiente sin restaurar */
    dismissDraft,
  };
}
