import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function NotificacionesScreen() {
  const colors = useThemeColors();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [badgeEnabled, setBadgeEnabled] = useState(true);
  const [recepcionEnabled, setRecepcionEnabled] = useState(true);
  const [inventarioEnabled, setInventarioEnabled] = useState(true);
  const [pedidosEnabled, setPedidosEnabled] = useState(true);
  const [alertasEnabled, setAlertasEnabled] = useState(true);

  const ToggleRow = ({ 
    icon, 
    label, 
    description, 
    value, 
    onValueChange 
  }: { 
    icon: keyof typeof Ionicons.glyphMap; 
    label: string; 
    description?: string;
    value: boolean; 
    onValueChange: (val: boolean) => void;
  }) => (
    <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* General */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GENERAL</Text>
        <View style={styles.sectionContent}>
          <ToggleRow
            icon="notifications"
            label="Notificaciones Push"
            description="Recibir notificaciones en tu dispositivo"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <ToggleRow
            icon="volume-high"
            label="Sonido"
            description="Reproducir sonido con las notificaciones"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
          <ToggleRow
            icon="phone-portrait"
            label="Vibración"
            description="Vibrar al recibir notificaciones"
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
          />
          <ToggleRow
            icon="ellipse"
            label="Badge"
            description="Mostrar contador en el ícono de la app"
            value={badgeEnabled}
            onValueChange={setBadgeEnabled}
          />
        </View>
      </View>

      {/* Categorías */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CATEGORÍAS</Text>
        <View style={styles.sectionContent}>
          <ToggleRow
            icon="archive"
            label="Recepción"
            description="Nuevas recepciones y entregas"
            value={recepcionEnabled}
            onValueChange={setRecepcionEnabled}
          />
          <ToggleRow
            icon="cube"
            label="Inventario"
            description="Alertas de stock y movimientos"
            value={inventarioEnabled}
            onValueChange={setInventarioEnabled}
          />
          <ToggleRow
            icon="cart"
            label="Pedidos"
            description="Nuevos pedidos y actualizaciones"
            value={pedidosEnabled}
            onValueChange={setPedidosEnabled}
          />
          <ToggleRow
            icon="warning"
            label="Alertas"
            description="Alertas críticas del sistema"
            value={alertasEnabled}
            onValueChange={setAlertasEnabled}
          />
        </View>
      </View>

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Las notificaciones te ayudan a estar al tanto de las actividades importantes en tu almacén.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
