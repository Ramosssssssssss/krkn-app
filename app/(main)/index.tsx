import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Bases de datos disponibles
const databases = [
  { id: 1, name: 'KRKN_PROD_DB', server: 'db.krkn.mx', type: 'Producción' },
  { id: 2, name: 'KRKN_DEV_DB', server: 'dev.krkn.mx', type: 'Desarrollo' },
  { id: 3, name: 'KRKN_TEST_DB', server: 'test.krkn.mx', type: 'Pruebas' },
];

export default function HomeScreen() {
  const { isDark } = useTheme();
  const { companyCode } = useAuth();
  const [selectedDb, setSelectedDb] = useState(databases[0]);
  const [showDbModal, setShowDbModal] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E8E8E8',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
    accentBg: isDark ? 'rgba(157,78,221,0.12)' : 'rgba(157,78,221,0.08)',
    success: '#34C759',
  };

  const today = new Date().toLocaleDateString('es-MX', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.initialBadge, { borderColor: theme.border }]}>
            <Text style={[styles.initialText, { color: theme.accent }]}>
              {companyCode?.charAt(0).toUpperCase() || 'K'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.company, { color: theme.text }]}>
              {companyCode?.toUpperCase() || 'EMPRESA'}
            </Text>
            <Text style={[styles.date, { color: theme.textMuted }]}>{today}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <LinearGradient
            colors={['transparent', `${theme.accent}50`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardGlow}
          />
          <View style={styles.statsGrid}>
            <StatItem value="12,458" label="Productos" theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <StatItem value="847" label="Categorías" theme={theme} />
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <StatItem value="32" label="Almacenes" theme={theme} />
          </View>
        </View>

        {/* Session Info - Expanded */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>SESIÓN ACTIVA</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow 
            icon="person-outline" 
            label="Usuario" 
            value={`admin@${companyCode}.krkn.mx`} 
            theme={theme} 
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="business-outline" 
            label="Empresa" 
            value={companyCode?.toUpperCase() || 'EMPRESA'} 
            theme={theme} 
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="globe-outline" 
            label="Instancia" 
            value={`${companyCode}.krkn.mx`} 
            theme={theme} 
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="calendar-outline" 
            label="Fecha" 
            value={new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} 
            theme={theme} 
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="time-outline" 
            label="Hora" 
            value={new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} 
            theme={theme} 
          />
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="shield-checkmark-outline" 
            label="Rol" 
            value="Administrador" 
            theme={theme} 
          />
        </View>

        {/* Database - At bottom */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CONFIGURACIÓN</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dbRow}>
            <View style={[styles.dbIcon, { backgroundColor: theme.accentBg }]}>
              <Ionicons name="server-outline" size={18} color={theme.accent} />
            </View>
            <View style={styles.dbInfo}>
              <Text style={[styles.dbName, { color: theme.text }]}>{selectedDb.name}</Text>
              <Text style={[styles.dbServer, { color: theme.textMuted }]}>
                {selectedDb.server} · {selectedDb.type}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${theme.success}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.statusText, { color: theme.success }]}>Online</Text>
            </View>
          </View>
          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity 
            style={styles.changeBtn}
            onPress={() => setShowDbModal(true)}
            activeOpacity={0.6}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color={theme.accent} />
            <Text style={[styles.changeBtnText, { color: theme.accent }]}>Cambiar Base de Datos</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>

    {/* Footer - Always at bottom */}
    <View style={[styles.footerContainer, { borderTopColor: theme.border }]}>
      <Text style={[styles.footer, { color: theme.textMuted }]}>KRKN WMS v1.0.0</Text>
    </View>

    {/* Modal */}
      <Modal 
        visible={showDbModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowDbModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView 
            intensity={isDark ? 40 : 60} 
            tint={isDark ? 'dark' : 'light'} 
            style={styles.modalBlur}
          >
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Base de Datos</Text>
                <TouchableOpacity 
                  style={[styles.modalClose, { backgroundColor: theme.accentBg }]}
                  onPress={() => setShowDbModal(false)}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {databases.map((db, index) => (
                <TouchableOpacity
                  key={db.id}
                  style={[
                    styles.dbOption, 
                    { borderColor: selectedDb.id === db.id ? theme.accent : theme.border }
                  ]}
                  onPress={() => { setSelectedDb(db); setShowDbModal(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dbOptionIcon, { backgroundColor: theme.accentBg }]}>
                    <Ionicons 
                      name="server-outline" 
                      size={16} 
                      color={selectedDb.id === db.id ? theme.accent : theme.textMuted} 
                    />
                  </View>
                  <View style={styles.dbOptionInfo}>
                    <Text style={[
                      styles.dbOptionName, 
                      { color: selectedDb.id === db.id ? theme.accent : theme.text }
                    ]}>
                      {db.name}
                    </Text>
                    <Text style={[styles.dbOptionServer, { color: theme.textMuted }]}>
                      {db.server} · {db.type}
                    </Text>
                  </View>
                  {selectedDb.id === db.id && (
                    <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

function StatItem({ value, label, theme }: { value: string; label: string; theme: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, theme }: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  value: string; 
  theme: any;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.textMuted} />
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: { 
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  initialBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 14,
  },
  company: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    paddingVertical: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    alignSelf: 'center',
  },
  // Info Row
  rowDivider: {
    height: 1,
    marginLeft: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Database
  dbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  dbIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dbInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dbName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dbServer: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Footer
  footerContainer: {
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footer: {
    fontSize: 11,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBlur: {
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dbOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dbOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dbOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dbOptionName: {
    fontSize: 13,
    fontWeight: '600',
  },
  dbOptionServer: {
    fontSize: 10,
    marginTop: 2,
  },
});
