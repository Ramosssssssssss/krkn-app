import { API_CONFIG } from "@/config/api";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import type {
    SucursalAlmacen,
    UbicacionItem,
    UserKrkn,
    WizardStep,
} from "./types";

const API_URL = API_CONFIG.BASE_URL;

export function useWizard(
  databaseId: number | null,
  companyCode: string | null | undefined,
  username: string | undefined,
  onCreated: () => void,
) {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("usuario");
  const [wizardLoading, setWizardLoading] = useState(false);

  // Step data
  const [users, setUsers] = useState<UserKrkn[]>([]);
  const [sucursalesAlmacenes, setSucursalesAlmacenes] = useState<
    SucursalAlmacen[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<UserKrkn | null>(null);
  const [selectedSucAlm, setSelectedSucAlm] = useState<SucursalAlmacen | null>(
    null,
  );
  const [fechaProgramada, setFechaProgramada] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [tipoConteo, setTipoConteo] = useState<"ciclico" | "ubicacion">(
    "ciclico",
  );
  const [ubicaciones, setUbicaciones] = useState<UbicacionItem[]>([]);
  const [ubicacionSearch, setUbicacionSearch] = useState("");
  const [ubicacionResults, setUbicacionResults] = useState<any[]>([]);
  const [searchingUbic, setSearchingUbic] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [creating, setCreating] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // ─── Load users ────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    if (!companyCode) return;
    setWizardLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/usuarios-krkn.php?companyCode=${encodeURIComponent(companyCode)}`,
      );
      const data = await res.json();
      if (data.ok) setUsers(data.users || []);
    } catch (_e) {
      console.error("Error cargando usuarios:", _e);
    } finally {
      setWizardLoading(false);
    }
  };

  const loadSucursalesAlmacenes = async () => {
    if (!databaseId) return;
    setWizardLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/sucursales-almacenes.php?databaseId=${databaseId}`,
      );
      const data = await res.json();
      if (data.success) {
        const items: SucursalAlmacen[] = (data.data || []).map((d: any) => ({
          SUCURSAL_ID: d.SUCURSAL_ID,
          SUCURSAL_NOMBRE: d.NOMBRE_SUCURSAL || "",
          ALMACEN_ID: d.ALMACEN_ID,
          ALMACEN_NOMBRE: d.NOMBRE_ALMACEN || "",
        }));
        setSucursalesAlmacenes(items);
      }
    } catch (e) {
      console.error("Error cargando sucursales:", e);
    } finally {
      setWizardLoading(false);
    }
  };

  // ─── Ubicaciones ───────────────────────────────────────────────────────────
  const searchUbicaciones = async (prefix: string) => {
    if (!databaseId || !selectedSucAlm || prefix.length < 1) {
      setUbicacionResults([]);
      return;
    }
    setSearchingUbic(true);
    try {
      const res = await fetch(
        `${API_URL}/api/buscar-articulos-ubicacion.php?databaseId=${databaseId}&localizacion=${encodeURIComponent(prefix)}&almacenId=${selectedSucAlm.ALMACEN_ID}`,
      );
      const data = await res.json();
      if (data.ok) {
        const grouped: Record<string, number> = {};
        (data.articulos || []).forEach((a: any) => {
          const loc = a.LOCALIZACION || a.localizacion || "";
          grouped[loc] = (grouped[loc] || 0) + 1;
        });
        setUbicacionResults(
          Object.entries(grouped).map(([loc, cant]) => ({
            localizacion: loc,
            cantidadArticulos: cant,
          })),
        );
      }
    } catch (e) {
      console.error("Error buscando ubicaciones:", e);
    } finally {
      setSearchingUbic(false);
    }
  };

  const addUbicacion = (ubic: UbicacionItem) => {
    if (!ubicaciones.find((u) => u.localizacion === ubic.localizacion)) {
      setUbicaciones((prev) => [...prev, ubic]);
    }
    setUbicacionSearch("");
    setUbicacionResults([]);
  };

  const removeUbicacion = (loc: string) => {
    setUbicaciones((prev) => prev.filter((u) => u.localizacion !== loc));
  };

  // ─── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!selectedUser || !selectedSucAlm) return;
    setCreating(true);
    try {
      const body = {
        databaseId,
        userId: selectedUser.USER_ID,
        sucursalId: selectedSucAlm.SUCURSAL_ID,
        almacenId: selectedSucAlm.ALMACEN_ID,
        fechaProgramada,
        tipoConteo,
        ubicaciones: tipoConteo === "ubicacion" ? ubicaciones : [],
        asignadoPor: username || "MOVIL",
        observaciones: observaciones || null,
        companyCode: companyCode || "",
        sucursalNombre: selectedSucAlm.SUCURSAL_NOMBRE || "",
        almacenNombre: selectedSucAlm.ALMACEN_NOMBRE || "",
      };

      const res = await fetch(`${API_URL}/api/inventarios-asignados.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        Alert.alert("Listo", "Inventario asignado exitosamente");
        resetWizard();
        onCreated();
      } else {
        Alert.alert("Error", data.message || "No se pudo crear la asignación");
      }
    } catch (_e) {
      Alert.alert("Error", "Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep("usuario");
    setSelectedUser(null);
    setSelectedSucAlm(null);
    setFechaProgramada(new Date().toISOString().split("T")[0]);
    setSelectedDate(new Date());
    setCalendarViewDate(new Date());
    setTipoConteo("ciclico");
    setUbicaciones([]);
    setUbicacionSearch("");
    setUbicacionResults([]);
    setObservaciones("");
    setUserSearch("");
  };

  const openWizard = () => {
    resetWizard();
    setShowWizard(true);
    loadUsers();
  };

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    setFechaProgramada(`${y}-${m}-${d}`);
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.NOMBRE_COMPLETO || "").toLowerCase().includes(q) ||
        (u.USERNAME || "").toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  return {
    // Wizard visibility
    showWizard,
    setShowWizard,
    wizardStep,
    setWizardStep,
    wizardLoading,

    // Users
    users,
    filteredUsers,
    userSearch,
    setUserSearch,
    selectedUser,
    setSelectedUser,

    // Sucursales
    sucursalesAlmacenes,
    selectedSucAlm,
    setSelectedSucAlm,
    loadSucursalesAlmacenes,

    // Calendar / Date
    fechaProgramada,
    selectedDate,
    calendarViewDate,
    setCalendarViewDate,
    handleSelectDay,

    // Tipo conteo
    tipoConteo,
    setTipoConteo,

    // Ubicaciones
    ubicaciones,
    ubicacionSearch,
    setUbicacionSearch,
    ubicacionResults,
    searchingUbic,
    searchUbicaciones,
    addUbicacion,
    removeUbicacion,

    // Observaciones
    observaciones,
    setObservaciones,

    // Create
    creating,
    handleCreate,
    openWizard,
    resetWizard,
  };
}
