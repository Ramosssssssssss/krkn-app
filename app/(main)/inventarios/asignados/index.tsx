import { SkeletonInventoryList } from "@/components/Skeleton";
import { useAuth } from "@/context/auth-context";
import { useThemeColors } from "@/context/theme-context";
import { getCurrentDatabaseId } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { CalendarPicker } from "./CalendarPicker";
import { ConfirmRow } from "./ConfirmRow";
import { tipoLabel } from "./helpers";
import { InventarioCard } from "./InventarioCard";
import { s } from "./styles";
import type { FilterType, InventarioAsignado, WizardStep } from "./types";
import { useInventarios } from "./useInventarios";
import { useWizard } from "./useWizard";

// ─────────────────────────────────────────────────────────────────────────────
export default function AsignadosScreen() {
  const colors = useThemeColors();
  const { user, companyCode } = useAuth();
  const databaseId = getCurrentDatabaseId();

  // ── Hooks ──
  const {
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
  } = useInventarios(databaseId, user?.USUARIO_ID);

  const wiz = useWizard(
    databaseId,
    companyCode ?? undefined,
    user?.USERNAME,
    loadInventarios,
  );

  // ─── RENDER CARD ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: InventarioAsignado }) => (
    <InventarioCard
      item={item}
      colors={colors}
      updatingId={updatingId}
      onUpdateStatus={handleUpdateStatus}
    />
  );

  // ─── RENDER WIZARD STEP ────────────────────────────────────────────────────
  const renderWizardContent = () => {
    switch (wiz.wizardStep) {
      // ── Step 1: Seleccionar usuario ──
      case "usuario":
        return (
          <View style={s.wizContent}>
            <Text style={[s.wizStepTitle, { color: colors.text }]}>
              Selecciona el usuario
            </Text>
            <Text style={[s.wizStepSub, { color: colors.textSecondary }]}>
              ¿A quién se le asignará el inventario?
            </Text>
            <View style={[s.searchBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Buscar usuario..."
                placeholderTextColor={colors.textTertiary}
                value={wiz.userSearch}
                onChangeText={wiz.setUserSearch}
              />
            </View>
            {wiz.wizardLoading ? (
              <ActivityIndicator
                style={{ marginTop: 30 }}
                color={colors.textSecondary}
              />
            ) : (
              <ScrollView
                style={s.wizList}
                showsVerticalScrollIndicator={false}
              >
                {wiz.filteredUsers.map((u) => (
                  <TouchableOpacity
                    key={u.USER_ID}
                    style={[
                      s.wizOption,
                      {
                        backgroundColor: colors.surface,
                        borderColor:
                          wiz.selectedUser?.USER_ID === u.USER_ID
                            ? "#3B82F6"
                            : colors.border,
                      },
                      wiz.selectedUser?.USER_ID === u.USER_ID && {
                        borderColor: "#3B82F6",
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => wiz.setSelectedUser(u)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[s.wizAvatar, { backgroundColor: "#3B82F620" }]}
                    >
                      <Ionicons name="person" size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wizOptionTitle, { color: colors.text }]}>
                        {u.NOMBRE_COMPLETO || u.USERNAME}
                      </Text>
                      <Text
                        style={[s.wizOptionSub, { color: colors.textTertiary }]}
                      >
                        @{u.USERNAME}
                      </Text>
                    </View>
                    {wiz.selectedUser?.USER_ID === u.USER_ID && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#3B82F6"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      // ── Step 2: Seleccionar sucursal/almacén ──
      case "sucursal":
        return (
          <View style={s.wizContent}>
            <Text style={[s.wizStepTitle, { color: colors.text }]}>
              Sucursal y Almacén
            </Text>
            <Text style={[s.wizStepSub, { color: colors.textSecondary }]}>
              Donde se realizará el conteo
            </Text>
            {wiz.wizardLoading ? (
              <ActivityIndicator
                style={{ marginTop: 30 }}
                color={colors.textSecondary}
              />
            ) : (
              <ScrollView
                style={s.wizList}
                showsVerticalScrollIndicator={false}
              >
                {wiz.sucursalesAlmacenes.map((sa, idx) => (
                  <TouchableOpacity
                    key={`${sa.SUCURSAL_ID}-${sa.ALMACEN_ID}-${idx}`}
                    style={[
                      s.wizOption,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      wiz.selectedSucAlm?.ALMACEN_ID === sa.ALMACEN_ID &&
                        wiz.selectedSucAlm?.SUCURSAL_ID === sa.SUCURSAL_ID && {
                          borderColor: "#22C55E",
                          borderWidth: 2,
                        },
                    ]}
                    onPress={() => wiz.setSelectedSucAlm(sa)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[s.wizAvatar, { backgroundColor: "#22C55E20" }]}
                    >
                      <Ionicons name="storefront" size={20} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wizOptionTitle, { color: colors.text }]}>
                        {sa.SUCURSAL_NOMBRE}
                      </Text>
                      <Text
                        style={[s.wizOptionSub, { color: colors.textTertiary }]}
                      >
                        {sa.ALMACEN_NOMBRE}
                      </Text>
                    </View>
                    {wiz.selectedSucAlm?.ALMACEN_ID === sa.ALMACEN_ID &&
                      wiz.selectedSucAlm?.SUCURSAL_ID === sa.SUCURSAL_ID && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#22C55E"
                        />
                      )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      // ── Step 3: Fecha + Tipo ──
      case "fecha":
        return (
          <View style={s.wizContent}>
            <Text style={[s.wizStepTitle, { color: colors.text }]}>
              Fecha y Tipo
            </Text>
            <Text style={[s.wizStepSub, { color: colors.textSecondary }]}>
              Configura los detalles del conteo
            </Text>

            {/* ── iOS Calendar Picker ── */}
            <CalendarPicker
              colors={colors}
              selectedDate={wiz.selectedDate}
              calendarViewDate={wiz.calendarViewDate}
              onSelectDay={wiz.handleSelectDay}
              onChangeMonth={wiz.setCalendarViewDate}
            />

            {/* Tipo */}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              Tipo de conteo
            </Text>
            <View
              style={[s.tipoGroupCard, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[
                  s.tipoOption,
                  wiz.tipoConteo === "ciclico" && s.tipoOptionActive,
                  wiz.tipoConteo === "ciclico" && { borderColor: "#F59E0B" },
                ]}
                onPress={() => wiz.setTipoConteo("ciclico")}
                activeOpacity={0.7}
              >
                <View
                  style={[s.tipoOptionIcon, { backgroundColor: "#F59E0B15" }]}
                >
                  <Ionicons name="repeat-outline" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tipoOptionTitle, { color: colors.text }]}>
                    Cíclico
                  </Text>
                  <Text
                    style={[s.tipoOptionDesc, { color: colors.textTertiary }]}
                  >
                    Conteo general de artículos
                  </Text>
                </View>
                <View
                  style={[
                    s.tipoRadio,
                    {
                      borderColor:
                        wiz.tipoConteo === "ciclico"
                          ? "#F59E0B"
                          : colors.border,
                    },
                  ]}
                >
                  {wiz.tipoConteo === "ciclico" && (
                    <View
                      style={[s.tipoRadioFill, { backgroundColor: "#F59E0B" }]}
                    />
                  )}
                </View>
              </TouchableOpacity>

              <View
                style={[s.tipoSeparator, { backgroundColor: colors.border }]}
              />

              <TouchableOpacity
                style={[
                  s.tipoOption,
                  wiz.tipoConteo === "ubicacion" && s.tipoOptionActive,
                  wiz.tipoConteo === "ubicacion" && { borderColor: "#EC4899" },
                ]}
                onPress={() => wiz.setTipoConteo("ubicacion")}
                activeOpacity={0.7}
              >
                <View
                  style={[s.tipoOptionIcon, { backgroundColor: "#EC489915" }]}
                >
                  <Ionicons name="location-outline" size={20} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tipoOptionTitle, { color: colors.text }]}>
                    Por Ubicación
                  </Text>
                  <Text
                    style={[s.tipoOptionDesc, { color: colors.textTertiary }]}
                  >
                    Zonas y pasillos específicos
                  </Text>
                </View>
                <View
                  style={[
                    s.tipoRadio,
                    {
                      borderColor:
                        wiz.tipoConteo === "ubicacion"
                          ? "#EC4899"
                          : colors.border,
                    },
                  ]}
                >
                  {wiz.tipoConteo === "ubicacion" && (
                    <View
                      style={[s.tipoRadioFill, { backgroundColor: "#EC4899" }]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Observaciones */}
            <View
              style={[
                s.iosGroupedCard,
                { backgroundColor: colors.surface, marginTop: 16 },
              ]}
            >
              <Text style={[s.iosGroupedLabel, { color: colors.textTertiary }]}>
                OBSERVACIONES
              </Text>
              <TextInput
                style={[s.iosGroupedInput, { color: colors.text }]}
                value={wiz.observaciones}
                onChangeText={wiz.setObservaciones}
                placeholder="Notas adicionales..."
                placeholderTextColor={colors.textTertiary}
                multiline
              />
            </View>
          </View>
        );

      // ── Step 4: Ubicaciones (solo si tipo = ubicacion) ──
      case "ubicaciones":
        return (
          <View style={s.wizContent}>
            <Text style={[s.wizStepTitle, { color: colors.text }]}>
              Agregar Ubicaciones
            </Text>
            <Text style={[s.wizStepSub, { color: colors.textSecondary }]}>
              Busca y agrega las zonas a contar
            </Text>

            <View style={[s.searchBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Buscar ubicación (ej. A01)..."
                placeholderTextColor={colors.textTertiary}
                value={wiz.ubicacionSearch}
                onChangeText={(t) => {
                  wiz.setUbicacionSearch(t);
                  if (t.length >= 1) wiz.searchUbicaciones(t);
                  else wiz.searchUbicaciones("");
                }}
                autoCapitalize="characters"
              />
              {wiz.searchingUbic && (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              )}
            </View>

            {/* Search results */}
            {wiz.ubicacionResults.length > 0 && (
              <View
                style={[
                  s.resultsBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {wiz.ubicacionResults.slice(0, 10).map((r, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => wiz.addUbicacion(r)}
                  >
                    <Ionicons name="location" size={16} color="#EC4899" />
                    <Text style={[s.resultText, { color: colors.text }]}>
                      {r.localizacion}
                    </Text>
                    <Text
                      style={[s.resultCount, { color: colors.textTertiary }]}
                    >
                      {r.cantidadArticulos} arts.
                    </Text>
                    <Ionicons name="add-circle" size={20} color="#22C55E" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected chips */}
            <Text
              style={[
                s.sectionLabel,
                { color: colors.textSecondary, marginTop: 16 },
              ]}
            >
              Seleccionadas ({wiz.ubicaciones.length})
            </Text>
            <ScrollView
              style={{ maxHeight: 180 }}
              showsVerticalScrollIndicator={false}
            >
              {wiz.ubicaciones.map((u, i) => (
                <View
                  key={i}
                  style={[
                    s.selectedUbic,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="location" size={16} color="#EC4899" />
                  <Text style={[s.selectedUbicText, { color: colors.text }]}>
                    {u.localizacion}
                  </Text>
                  <Text
                    style={[
                      s.selectedUbicCount,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {u.cantidadArticulos} arts.
                  </Text>
                  <TouchableOpacity
                    onPress={() => wiz.removeUbicacion(u.localizacion)}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        );

      // ── Step 5: Confirmar ──
      case "confirmar":
        return (
          <View style={s.wizContent}>
            <Text style={[s.wizStepTitle, { color: colors.text }]}>
              Confirmar Asignación
            </Text>
            <Text style={[s.wizStepSub, { color: colors.textSecondary }]}>
              Revisa los detalles antes de crear
            </Text>

            <View style={[s.confirmCard, { backgroundColor: colors.surface }]}>
              <ConfirmRow
                icon="person"
                label="Usuario"
                value={
                  wiz.selectedUser?.NOMBRE_COMPLETO ||
                  wiz.selectedUser?.USERNAME ||
                  "—"
                }
                colors={colors}
              />
              <ConfirmRow
                icon="storefront"
                label="Sucursal"
                value={wiz.selectedSucAlm?.SUCURSAL_NOMBRE || "—"}
                colors={colors}
              />
              <ConfirmRow
                icon="cube"
                label="Almacén"
                value={wiz.selectedSucAlm?.ALMACEN_NOMBRE || "—"}
                colors={colors}
              />
              <ConfirmRow
                icon="calendar"
                label="Fecha"
                value={wiz.fechaProgramada}
                colors={colors}
              />
              <ConfirmRow
                icon="repeat"
                label="Tipo"
                value={tipoLabel(wiz.tipoConteo)}
                colors={colors}
              />
              {wiz.tipoConteo === "ubicacion" && (
                <ConfirmRow
                  icon="location"
                  label="Ubicaciones"
                  value={`${wiz.ubicaciones.length} zonas`}
                  colors={colors}
                />
              )}
              {wiz.observaciones ? (
                <ConfirmRow
                  icon="document-text"
                  label="Notas"
                  value={wiz.observaciones}
                  colors={colors}
                />
              ) : null}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Wizard navigation
  const wizardSteps: WizardStep[] =
    wiz.tipoConteo === "ubicacion"
      ? ["usuario", "sucursal", "fecha", "ubicaciones", "confirmar"]
      : ["usuario", "sucursal", "fecha", "confirmar"];

  const currentStepIdx = wizardSteps.indexOf(wiz.wizardStep);
  const isLastStep = currentStepIdx === wizardSteps.length - 1;

  const canAdvance = () => {
    switch (wiz.wizardStep) {
      case "usuario":
        return !!wiz.selectedUser;
      case "sucursal":
        return !!wiz.selectedSucAlm;
      case "fecha":
        return !!wiz.fechaProgramada;
      case "ubicaciones":
        return wiz.ubicaciones.length > 0;
      case "confirmar":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (wiz.wizardStep === "usuario" && wiz.selectedUser) {
      wiz.loadSucursalesAlmacenes();
    }
    if (isLastStep) {
      wiz.handleCreate();
      return;
    }
    const next = wizardSteps[currentStepIdx + 1];
    if (next) wiz.setWizardStep(next);
  };

  const handleBack = () => {
    if (currentStepIdx === 0) {
      wiz.resetWizard();
      return;
    }
    wiz.setWizardStep(wizardSteps[currentStepIdx - 1]);
  };

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        s.container,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Mis Inventarios
          </Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>
            Asignaciones pendientes
          </Text>
        </View>
        <TouchableOpacity
          onPress={wiz.openWizard}
          style={[s.addBtn, { backgroundColor: "#3B82F6" }]}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        <View
          style={[
            s.statCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[s.statIconBox, { backgroundColor: "#F59E0B18" }]}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>
            {stats.pendientes}
          </Text>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>
            Pendientes
          </Text>
        </View>
        <View
          style={[
            s.statCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[s.statIconBox, { backgroundColor: "#3B82F618" }]}>
            <Ionicons name="construct-outline" size={18} color="#3B82F6" />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>
            {stats.enProceso}
          </Text>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>
            En proceso
          </Text>
        </View>
        <View
          style={[
            s.statCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[s.statIconBox, { backgroundColor: "#10B98118" }]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#10B981"
            />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>
            {stats.completados}
          </Text>
          <Text style={[s.statLabel, { color: colors.textTertiary }]}>
            Completados
          </Text>
        </View>
      </View>

      {/* ── Filters ── */}
      <View style={s.filterRow}>
        {(["TODOS", "PENDIENTE", "TRABAJANDO"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={[
              s.filterChip,
              activeFilter === f
                ? {
                    backgroundColor:
                      f === "PENDIENTE"
                        ? "#F59E0B"
                        : f === "TRABAJANDO"
                          ? "#3B82F6"
                          : colors.text,
                  }
                : {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <Text
              style={[
                s.filterChipText,
                { color: activeFilter === f ? "#FFF" : colors.textSecondary },
              ]}
            >
              {f === "TODOS"
                ? "Todos"
                : f === "PENDIENTE"
                  ? "Pendientes"
                  : "En proceso"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      {loading ? (
        <SkeletonInventoryList count={4} />
      ) : filteredInventarios.length === 0 ? (
        <View style={s.centerBox}>
          <View style={[s.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons
              name="clipboard-outline"
              size={48}
              color={colors.textTertiary}
            />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            Sin inventarios
          </Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            No tienes inventarios pendientes.{"\n"}Crea uno nuevo con el botón +
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventarios}
          keyExtractor={(i) => String(i.INVENTARIO_ID)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSecondary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* ━━━ WIZARD MODAL — Apple iOS Style ━━━ */}
      <Modal
        visible={wiz.showWizard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={wiz.resetWizard}
      >
        <View style={[s.wizContainer, { backgroundColor: colors.background }]}>
          {/* ── iOS Navigation Bar ── */}
          <View
            style={[
              s.iosNavBar,
              {
                backgroundColor: colors.surface + "F2",
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleBack}
              style={s.iosNavBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {currentStepIdx === 0 ? (
                <Text style={[s.iosNavBtnText, { color: "#3B82F6" }]}>
                  Cancelar
                </Text>
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                >
                  <Ionicons name="chevron-back" size={20} color="#3B82F6" />
                  <Text style={[s.iosNavBtnText, { color: "#3B82F6" }]}>
                    Atrás
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.iosNavCenter}>
              <Text style={[s.iosNavTitle, { color: colors.text }]}>
                Nueva Asignación
              </Text>
              <Text style={[s.iosNavSubtitle, { color: colors.textTertiary }]}>
                Paso {currentStepIdx + 1} de {wizardSteps.length}
              </Text>
            </View>
            <View style={s.iosNavBtn}>
              <Text style={{ color: "transparent", fontSize: 17 }}>Cancel</Text>
            </View>
          </View>

          {/* ── iOS Progress Dots ── */}
          <View style={s.iosDotsRow}>
            {wizardSteps.map((_, i) => (
              <View
                key={i}
                style={[
                  s.iosDot,
                  i <= currentStepIdx
                    ? { backgroundColor: "#3B82F6" }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderWizardContent()}
          </ScrollView>

          {/* ── iOS Footer ── */}
          <View
            style={[
              s.iosFooter,
              {
                backgroundColor: colors.surface + "F2",
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.iosMainBtn,
                canAdvance()
                  ? { backgroundColor: "#3B82F6" }
                  : { backgroundColor: colors.border },
              ]}
              onPress={handleNext}
              disabled={!canAdvance() || wiz.creating}
              activeOpacity={0.8}
            >
              {wiz.creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text
                  style={[
                    s.iosMainBtnText,
                    { color: canAdvance() ? "#FFF" : colors.textTertiary },
                  ]}
                >
                  {isLastStep ? "Crear Asignación" : "Continuar"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}
