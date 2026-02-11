import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { formatDate, statusColor, statusIcon, tipoLabel } from "./helpers";
import { s } from "./styles";
import type { InventarioAsignado } from "./types";

interface InventarioCardProps {
  item: InventarioAsignado;
  colors: any;
  updatingId: number | null;
  onUpdateStatus: (item: InventarioAsignado, newStatus: string) => void;
}

export function InventarioCard({
  item,
  colors,
  updatingId,
  onUpdateStatus,
}: InventarioCardProps) {
  const color = statusColor(item.ESTATUS);
  const isUpdating = updatingId === item.INVENTARIO_ID;

  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={[s.statusBadge, { backgroundColor: color + "18" }]}>
          <Ionicons name={statusIcon(item.ESTATUS)} size={14} color={color} />
          <Text style={[s.statusText, { color }]}>{item.ESTATUS}</Text>
        </View>
        <View style={[s.tipoBadge, { backgroundColor: colors.background }]}>
          <Ionicons
            name={
              item.TIPO_CONTEO?.toLowerCase() === "ubicacion"
                ? "location-outline"
                : "repeat-outline"
            }
            size={12}
            color={colors.textSecondary}
          />
          <Text style={[s.tipoText, { color: colors.textSecondary }]}>
            {tipoLabel(item.TIPO_CONTEO)}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <View style={s.infoRow}>
          <Ionicons
            name="storefront-outline"
            size={16}
            color={colors.textTertiary}
          />
          <Text
            style={[s.infoLabel, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.SUCURSAL_NOMBRE} — {item.ALMACEN_NOMBRE}
          </Text>
        </View>
        <View style={s.infoRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.textTertiary}
          />
          <Text style={[s.infoLabel, { color: colors.textSecondary }]}>
            Programado: {formatDate(item.FECHA_PROGRAMADA)}
          </Text>
        </View>
        {item.FECHA_INICIO && (
          <View style={s.infoRow}>
            <Ionicons
              name="play-circle-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text style={[s.infoLabel, { color: colors.textSecondary }]}>
              Iniciado: {formatDate(item.FECHA_INICIO)}
            </Text>
          </View>
        )}
        {item.OBSERVACIONES ? (
          <View style={s.infoRow}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text
              style={[s.infoLabel, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.OBSERVACIONES}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Ubicaciones chips */}
      {item.UBICACIONES && item.UBICACIONES.length > 0 && (
        <View style={s.ubicChipRow}>
          {item.UBICACIONES.slice(0, 4).map((u, i) => (
            <View
              key={i}
              style={[s.ubicChip, { backgroundColor: colors.background }]}
            >
              <Ionicons name="location" size={10} color="#EC4899" />
              <Text style={[s.ubicChipText, { color: colors.textSecondary }]}>
                {u.LOCALIZACION}
              </Text>
            </View>
          ))}
          {item.UBICACIONES.length > 4 && (
            <View style={[s.ubicChip, { backgroundColor: colors.background }]}>
              <Text style={[s.ubicChipText, { color: colors.textTertiary }]}>
                +{item.UBICACIONES.length - 4}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action button */}
      {item.ESTATUS === "PENDIENTE" && (
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: "#3B82F6" }]}
          onPress={() => onUpdateStatus(item, "TRABAJANDO")}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={s.actionBtnText}>Iniciar Inventario</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {item.ESTATUS === "TRABAJANDO" && (
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: "#8B5CF6" }]}
          onPress={() => onUpdateStatus(item, "EN_REVISION")}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="eye-outline" size={16} color="#FFF" />
              <Text style={s.actionBtnText}>Enviar a Revisión</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
