// Hook reutilizable para cargar sucursales y almacenes

import { getSucursalesAlmacenes } from "@/services/inventarios";
import { Almacen, Sucursal, SucursalAlmacenRaw } from "@/types/inventarios";
import { useCallback, useEffect, useState } from "react";

interface UseSucursalesAlmacenesReturn {
  // Data
  sucursales: Sucursal[];
  almacenes: Almacen[];
  almacenesFiltrados: Almacen[];

  // Selection
  selectedSucursal: number | null;
  selectedAlmacen: number | null;
  setSelectedSucursal: (id: number | null) => void;
  setSelectedAlmacen: (id: number | null) => void;

  // State
  isLoading: boolean;
  error: string | null;
  retryCount: number;

  // Actions
  refresh: () => void;
}

const MAX_RETRIES = 3;

export function useSucursalesAlmacenes(): UseSucursalesAlmacenesReturn {
  const [rawData, setRawData] = useState<SucursalAlmacenRaw[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      const data = await getSucursalesAlmacenes((attempt) => {
        setRetryCount(attempt);
      });

      setRawData(data);

      // Si solo hay una sucursal, seleccionarla automáticamente
      const uniqueSucursales = Array.from(
        new Map(data.map((r) => [r.SUCURSAL_ID, r.NOMBRE_SUCURSAL])),
      );
      if (uniqueSucursales.length === 1) {
        setSelectedSucursal(Number(uniqueSucursales[0][0]));
      }
    } catch (e: any) {
      setError(e?.message || "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extraer sucursales únicas
  const sucursales: Sucursal[] = Array.from(
    new Map(rawData.map((r) => [r.SUCURSAL_ID, r.NOMBRE_SUCURSAL])),
  ).map(([id, nombre]) => ({ id: Number(id), nombre: String(nombre) }));

  // Extraer todos los almacenes
  const almacenes: Almacen[] = rawData.map((r) => ({
    id: r.ALMACEN_ID,
    nombre: r.NOMBRE_ALMACEN,
    sucursalId: r.SUCURSAL_ID,
  }));

  // Filtrar almacenes por sucursal seleccionada
  const almacenesFiltrados = selectedSucursal
    ? almacenes.filter((a) => a.sucursalId === selectedSucursal)
    : [];

  // Limpiar almacén seleccionado si cambia la sucursal
  const handleSetSucursal = useCallback((id: number | null) => {
    setSelectedSucursal(id);
    setSelectedAlmacen(null);
  }, []);

  // Si solo hay un almacén, seleccionarlo automáticamente
  useEffect(() => {
    if (almacenesFiltrados.length === 1 && !selectedAlmacen) {
      setSelectedAlmacen(almacenesFiltrados[0].id);
    }
  }, [almacenesFiltrados, selectedAlmacen]);

  return {
    sucursales,
    almacenes,
    almacenesFiltrados,
    selectedSucursal,
    selectedAlmacen,
    setSelectedSucursal: handleSetSucursal,
    setSelectedAlmacen,
    isLoading,
    error,
    retryCount,
    refresh: fetchData,
  };
}
