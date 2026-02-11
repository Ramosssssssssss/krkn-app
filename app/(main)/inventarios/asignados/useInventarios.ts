import { API_CONFIG } from "@/config/api";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated } from "react-native";
import type { FilterType, InventarioAsignado, StatsData } from "./types";

const API_URL = API_CONFIG.BASE_URL;

export function useInventarios(
  databaseId: number | null,
  userId: number | undefined,
) {
  const [inventarios, setInventarios] = useState<InventarioAsignado[]>([]);
  const [stats, setStats] = useState<StatsData>({
    pendientes: 0,
    enProceso: 0,
    completados: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("TODOS");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadInventarios = useCallback(async () => {
    if (!databaseId || !userId) return;
    try {
      const url = `${API_URL}/api/mis-inventarios-pendientes.php?databaseId=${databaseId}&userId=${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setInventarios(data.inventarios || []);
        setStats(data.stats || { pendientes: 0, enProceso: 0, completados: 0 });
      }
    } catch (e) {
      console.error("Error cargando inventarios:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [databaseId, userId]);

  useFocusEffect(
    useCallback(() => {
      loadInventarios();
    }, [loadInventarios]),
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadInventarios();
  };

  const filteredInventarios = useMemo(() => {
    if (activeFilter === "TODOS") return inventarios;
    return inventarios.filter((i) => i.ESTATUS === activeFilter);
  }, [inventarios, activeFilter]);

  const handleUpdateStatus = async (
    inv: InventarioAsignado,
    newStatus: string,
  ) => {
    const labels: Record<string, string> = {
      TRABAJANDO: "Iniciar",
      EN_REVISION: "Enviar a revisión",
      COMPLETADO: "Completar",
    };
    Alert.alert(
      labels[newStatus] || "Actualizar",
      `¿Cambiar estatus a ${newStatus}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: "default",
          onPress: async () => {
            setUpdatingId(inv.INVENTARIO_ID);
            try {
              const res = await fetch(
                `${API_URL}/api/actualizar-estatus-inventario.php`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    databaseId,
                    inventarioId: inv.INVENTARIO_ID,
                    estatus: newStatus,
                  }),
                },
              );
              const data = await res.json();
              if (data.ok) {
                loadInventarios();
              } else {
                Alert.alert("Error", data.message || "No se pudo actualizar");
              }
            } catch (_e) {
              Alert.alert("Error", "Error de conexión");
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  return {
    inventarios,
    stats,
    loading,
    refreshing,
    activeFilter,
    setActiveFilter,
    updatingId,
    fadeAnim,
    filteredInventarios,
    onRefresh,
    handleUpdateStatus,
    loadInventarios,
  };
}
