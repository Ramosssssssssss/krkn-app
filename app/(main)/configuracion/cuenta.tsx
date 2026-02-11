import { useAuth } from '@/context/auth-context';
import { useThemeColors } from '@/context/theme-context';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CuentaScreen() {
  const colors = useThemeColors();
  const { companyCode } = useAuth();

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo empresa */}
      <View style={[styles.companyHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.companyLogo, { backgroundColor: colors.accent }]}>
          <Text style={styles.companyLogoText}>K</Text>
        </View>
        <Text style={[styles.companyName, { color: colors.text }]}>KRKN WMS</Text>
        <Text style={[styles.companyDomain, { color: colors.textSecondary }]}>{companyCode}.krkn.mx</Text>
      </View>

      {/* Información de la cuenta */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>INFORMACIÓN DE LA CUENTA</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <InfoRow label="Código de empresa" value={companyCode || 'demo'} />
          <InfoRow label="Plan" value="Enterprise" />
          <InfoRow label="Estado" value="Activo" />
          <InfoRow label="Usuarios" value="15 / 50" />
          <InfoRow label="Almacenes" value="3" />
        </View>
      </View>

      {/* Suscripción */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUSCRIPCIÓN</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <InfoRow label="Tipo de plan" value="Anual" />
          <InfoRow label="Próxima facturación" value="15 Feb 2026" />
          <InfoRow label="Método de pago" value="•••• 4242" />
        </View>
      </View>

      {/* Límites */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>USO Y LÍMITES</Text>
        <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
          <View style={styles.usageRow}>
            <View style={styles.usageInfo}>
              <Text style={[styles.usageLabel, { color: colors.text }]}>Almacenamiento</Text>
              <Text style={[styles.usageValue, { color: colors.textSecondary }]}>2.4 GB / 10 GB</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '24%' }]} />
            </View>
          </View>
          <View style={styles.usageRow}>
            <View style={styles.usageInfo}>
              <Text style={[styles.usageLabel, { color: colors.text }]}>API Requests</Text>
              <Text style={[styles.usageValue, { color: colors.textSecondary }]}>45,230 / 100,000</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '45%' }]} />
            </View>
          </View>
        </View>
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
  companyHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  companyLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  companyDomain: {
    fontSize: 14,
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
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  usageValue: {
    fontSize: 13,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
