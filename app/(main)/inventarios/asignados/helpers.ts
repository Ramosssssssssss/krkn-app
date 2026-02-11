/** Pure helper functions used by the InventarioCard and elsewhere */

export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const statusColor = (estatus: string) => {
  switch (estatus) {
    case "PENDIENTE":
      return "#F59E0B";
    case "TRABAJANDO":
      return "#3B82F6";
    case "EN_REVISION":
      return "#8B5CF6";
    case "COMPLETADO":
      return "#10B981";
    default:
      return "#6B7280";
  }
};

export const statusIcon = (estatus: string): any => {
  switch (estatus) {
    case "PENDIENTE":
      return "time-outline";
    case "TRABAJANDO":
      return "construct-outline";
    case "EN_REVISION":
      return "eye-outline";
    case "COMPLETADO":
      return "checkmark-circle-outline";
    default:
      return "help-outline";
  }
};

export const tipoLabel = (tipo: string) => {
  switch (tipo?.toLowerCase()) {
    case "ciclico":
      return "Cíclico";
    case "ubicacion":
      return "Por Ubicación";
    default:
      return tipo;
  }
};
