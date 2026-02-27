import SignatureModal from '@/components/inventarios/SignatureModal';
import { useAuth } from '@/context/auth-context';
import { useThemeColors } from '@/context/theme-context';
import { saveAuditData } from '@/services/auditStore';
import {
    aplicarInventarioFisico,
    CaratulaInvfis,
    DetalleArticulo,
    getDetalleInvfis,
    getUsuariosKrkn,
    solicitarAprobacionInventario,
    UsuarioKrkn
} from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ConfirmarInventarioScreen() {
  const colors = useThemeColors();
  const { user, companyCode } = useAuth();
  const { folio } = useLocalSearchParams<{ folio: string }>();
  
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [supervisors, setSupervisors] = useState<UsuarioKrkn[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<UsuarioKrkn | null>(null);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [caratula, setCaratula] = useState<CaratulaInvfis | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [hasFirma, setHasFirma] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!folio) return;
    
    setLoading(true);
    try {
      const resp = await getDetalleInvfis(folio);
      setCaratula(resp.caratula);
      setDetalles(resp.detalles);

      if (user?.USUARIO_ID !== 4) {
        const users = await getUsuariosKrkn(companyCode || 'FYTTSA');
        setSupervisors(users);
        // Pre-seleccionar Demo si existe
        const demo = users.find(u => u.USER_ID === 4);
        if (demo) setSelectedSupervisor(demo);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar la información necesaria');
    } finally {
      setLoading(false);
    }
  }, [folio, user?.USUARIO_ID, companyCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmar = async () => {
    if (!hasFirma || applying) return;
    if (!folio) return;

    setApplying(true);
    try {
      if (user?.USUARIO_ID === 4) {
        const result = await aplicarInventarioFisico(folio);
        saveAuditData({ caratula, detalles, signature: signatureData });
        router.replace({
          pathname: '/(main)/inventarios/aplicar/exito',
          params: { folio: result.folio, fecha: result.fecha }
        });
      } else {
        if (!selectedSupervisor) {
          Alert.alert('Atención', 'Por favor selecciona a un supervisor para autorizar.');
          setShowSupervisorModal(true);
          setApplying(false);
          return;
        }

        await solicitarAprobacionInventario(
          folio, 
          user?.NOMBRE || user?.USERNAME || 'Desconocido',
          selectedSupervisor.USER_ID,
          companyCode ?? undefined
        );
        
        setIsWaitingForApproval(true);
        startPollingApproval();
      }
    } catch (error: any) {
      console.error('Error en proceso de inventario:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar la solicitud');
      setApplying(false);
    }
  };

  const startPollingApproval = () => {
    let attempts = 0;
    const maxAttempts = 100;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setApprovalStatus('rejected');
        setApplying(false);
        return;
      }

      try {
        const response = await getDetalleInvfis(folio!);
        const isApproved = response.caratula.APLICADO === 'S';
        const isStillWaiting = response.caratula.DESCRIPCION?.startsWith('[P]');

        if (isApproved) {
          clearInterval(interval);
          setApprovalStatus('approved');
          saveAuditData({ caratula, detalles, signature: signatureData });
          
          setTimeout(() => {
            router.replace({
              pathname: '/(main)/inventarios/aplicar/exito',
              params: { folio: folio, fecha: new Date().toLocaleDateString() }
            });
          }, 2000);
        } else if (!isStillWaiting && response.caratula.APLICADO === 'N') {
          clearInterval(interval);
          setApprovalStatus('rejected');
          setApplying(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const handleLimpiarFirma = () => {
    setHasFirma(false);
    setSignatureData(null);
  };

  const handleSignatureOK = (signature: string) => {
    setSignatureData(signature);
    setHasFirma(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Confirmar Auditoría' }} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando detalle...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Confirmar Auditoría',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.folioSection}>
          <Text style={[styles.folioLabel, { color: colors.textTertiary }]}>REGISTRO DE AUDITORÍA</Text>
          <Text style={[styles.folioNumber, { color: colors.text }]}>
            <Text style={{ color: colors.accent }}>#</Text>{formatFolio(folio)}
          </Text>
        </View>

        <View style={[styles.appleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.appleRow}>
            <View style={[styles.appleIcon, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="business" size={18} color="#FFF" />
            </View>
            <View style={styles.appleTextContent}>
              <Text style={[styles.appleLabel, { color: colors.textTertiary }]}>Sucursal / Almacén</Text>
              <Text style={[styles.appleValue, { color: colors.text }]}>{caratula?.ALMACEN || 'Sin asignar'}</Text>
            </View>
          </View>
          
          <View style={[styles.appleSeparator, { backgroundColor: colors.border }]} />
          
          <View style={styles.appleRow}>
            <View style={[styles.appleIcon, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="person" size={18} color="#FFF" />
            </View>
            <View style={styles.appleTextContent}>
              <Text style={[styles.appleLabel, { color: colors.textTertiary }]}>Auditor Responsable</Text>
              <Text style={[styles.appleValue, { color: colors.text }]}>{caratula?.USUARIO}</Text>
            </View>
          </View>

          {user?.USUARIO_ID !== 4 && (
            <>
              <View style={[styles.appleSeparator, { backgroundColor: colors.border }]} />
              <View style={styles.appleRow}>
                <View style={[styles.appleIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                </View>
                <TouchableOpacity 
                  style={styles.supervisorSelectorPremium}
                  onPress={() => setShowSupervisorModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.appleTextContent}>
                    <Text style={[styles.appleLabel, { color: colors.textTertiary }]}>Supervisor (Autoriza)</Text>
                    <Text style={[styles.appleValue, { color: selectedSupervisor ? colors.text : colors.accent }]}>
                      {selectedSupervisor ? selectedSupervisor.NOMBRE_COMPLETO : 'Seleccionar Supervisor...'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={[styles.disclaimerContainer, { backgroundColor: colors.accent + '08', borderColor: colors.accent + '20' }]}>
          <Ionicons name="information-circle" size={20} color={colors.accent} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Confirmo que las existencias físicas coinciden con el reporte y asumo responsabilidad por discrepancias.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>FIRMA DE RESPONSABILIDAD</Text>
            {hasFirma && (
              <TouchableOpacity onPress={handleLimpiarFirma} style={styles.clearLink}>
                <Text style={[styles.clearLinkText, { color: '#FF3B30' }]}>Reiniciar</Text>
              </TouchableOpacity>
            )}
        </View>
        
        <TouchableOpacity 
          style={[styles.signatureBoxApple, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowSignatureModal(true)}
          activeOpacity={0.8}
        >
          {hasFirma && signatureData ? (
            <Image 
              source={{ uri: signatureData }} 
              style={styles.signatureImageApple} 
              resizeMode="contain"
            />
          ) : (
            <View style={styles.signPlaceholderApple}>
              <View style={[styles.signCircle, { backgroundColor: colors.accent + '15' }]}>
                <Ionicons name="pencil" size={24} color={colors.accent} />
              </View>
              <Text style={[styles.signTextApple, { color: colors.textTertiary }]}>Pulsa para firmar documento</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>RESUMEN DE CONTEO ({detalles.length})</Text>
        </View>

        <View style={[styles.articlesListApple, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {detalles.map((item, index) => (
            <View key={item.DOCTO_INVFIS_DET_ID || index}>
              <View style={styles.articleRowApple}>
                <View style={[styles.articleIconApple, { backgroundColor: colors.accent + '10' }]}>
                  <Ionicons name="cube-outline" size={18} color={colors.accent} />
                </View>
                <View style={styles.articleInfoApple}>
                  <Text style={[styles.articleNameApple, { color: colors.text }]} numberOfLines={1}>
                    {item.NOMBRE_ARTICULO}
                  </Text>
                  <Text style={[styles.articleSubApple, { color: colors.textTertiary }]}>
                    ID: {item.ARTICULO_ID} • {item.UMED}
                  </Text>
                </View>
                <View style={styles.articleQtyApple}>
                  <Text style={[styles.qtyValueApple, { color: colors.text }]}>{item.UNIDADES_FISICAS}</Text>
                  <Text style={[styles.qtyLabelApple, { color: colors.textTertiary }]}>UDS</Text>
                </View>
              </View>
              {index < detalles.length - 1 && <View style={[styles.appleSeparator, { backgroundColor: colors.border, marginLeft: 56 }]} />}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBarContainer}>
        <BlurView intensity={80} tint={colors.mode === 'dark' ? 'dark' : 'light'} style={styles.bottomBlur}>
          <TouchableOpacity 
            style={[
              styles.mainActionBtn, 
              { backgroundColor: hasFirma ? colors.accent : colors.buttonDisabled }
            ]}
            onPress={handleConfirmar}
            disabled={!hasFirma || applying}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name={user?.USUARIO_ID === 4 ? "checkmark-circle" : "send"} size={20} color="#FFF" />
                <Text style={styles.mainActionText}>
                  {user?.USUARIO_ID === 4 ? 'Confirmar y Aplicar' : 'Solicitar Aprobación'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </BlurView>
      </View>

      <SignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onOK={handleSignatureOK}
        title="Firma del Auditor"
      />

      <Modal visible={isWaitingForApproval} transparent animationType="fade">
        <View style={styles.waitingOverlay}>
          <BlurView intensity={90} tint={colors.mode === 'dark' ? 'dark' : 'light'} style={styles.waitingBlur}>
            <View style={styles.waitingContent}>
              {approvalStatus === 'pending' ? (
                <>
                  <View style={styles.waitingAnimationBox}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                  <Text style={[styles.waitingTitle, { color: colors.text }]}>Esperando Autorización</Text>
                  <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
                    Se ha enviado una notificación a <Text style={{fontWeight: '700', color: colors.text}}>{selectedSupervisor?.NOMBRE_COMPLETO}</Text>.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.cancelWaitBtn, { backgroundColor: colors.border + '50' }]}
                    onPress={() => { setIsWaitingForApproval(false); setApplying(false); }}
                  >
                    <Text style={[styles.cancelWaitText, { color: colors.textSecondary }]}>Cancelar Solicitud</Text>
                  </TouchableOpacity>
                </>
              ) : approvalStatus === 'approved' ? (
                <>
                  <View style={[styles.statusIconBox, { backgroundColor: '#34C759' }]}>
                    <Ionicons name="checkmark" size={40} color="#FFF" />
                  </View>
                  <Text style={[styles.waitingTitle, { color: colors.text }]}>¡Autorizado!</Text>
                  <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
                    El supervisor ha aprobado el inventario. Aplicando cambios...
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.statusIconBox, { backgroundColor: '#FF3B30' }]}>
                    <Ionicons name="close" size={40} color="#FFF" />
                  </View>
                  <Text style={[styles.waitingTitle, { color: colors.text }]}>Solicitud Rechazada</Text>
                  <Text style={[styles.waitingDesc, { color: colors.textSecondary }]}>
                    El supervisor ha rechazado la solicitud de inventario.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.mainActionBtn, { backgroundColor: '#FF3B30', marginTop: 20 }]}
                    onPress={() => { setIsWaitingForApproval(false); setApprovalStatus('pending'); }}
                  >
                    <Text style={styles.mainActionText}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

      <Modal visible={showSupervisorModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalListContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeaderContent}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Supervisor</Text>
              <TouchableOpacity onPress={() => setShowSupervisorModal(false)} style={[styles.circleBtn, { backgroundColor: colors.border }]}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.textTertiary}
              value={userSearch}
              onChangeText={setUserSearch}
            />
          </View>

          <FlatList
            data={supervisors.filter(u => 
                u.NOMBRE_COMPLETO.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.USERNAME.toLowerCase().includes(userSearch.toLowerCase())
            )}
            keyExtractor={item => String(item.USER_ID)}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.userItemApple, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedSupervisor(item);
                  setShowSupervisorModal(false);
                }}
              >
                <View style={[styles.userBadge, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.userBadgeText, { color: colors.accent }]}>
                    {item.NOMBRE_COMPLETO.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userNameApple, { color: colors.text }]}>{item.NOMBRE_COMPLETO}</Text>
                  <Text style={[styles.userHandleApple, { color: colors.textTertiary }]}>@{item.USERNAME}</Text>
                </View>
                {selectedSupervisor?.USER_ID === item.USER_ID && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  headerBtn: { padding: 4, marginLeft: -8 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 140 },
  
  folioSection: { marginBottom: 24, paddingLeft: 4 },
  folioLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  folioNumber: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  
  appleCard: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 24, overflow: 'hidden' },
  appleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  appleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  appleTextContent: { flex: 1 },
  appleLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  appleValue: { fontSize: 16, fontWeight: '700', letterSpacing: -0.5 },
  appleSeparator: { height: 1, marginVertical: 16 },
  supervisorSelectorPremium: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  
  disclaimerContainer: { flexDirection: 'row', padding: 16, borderRadius: 18, borderWidth: 1, gap: 12, marginBottom: 32 },
  disclaimerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  clearLink: { paddingVertical: 4 },
  clearLinkText: { fontSize: 13, fontWeight: '600' },
  
  signatureBoxApple: { height: 180, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 32, overflow: 'hidden' },
  signatureImageApple: { width: '90%', height: '80%' },
  signPlaceholderApple: { alignItems: 'center', gap: 12 },
  signCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  signTextApple: { fontSize: 14, fontWeight: '600' },
  
  articlesListApple: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', padding: 8 },
  articleRowApple: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
  articleIconApple: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  articleInfoApple: { flex: 1 },
  articleNameApple: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3, marginBottom: 2 },
  articleSubApple: { fontSize: 12, fontWeight: '500' },
  articleQtyApple: { alignItems: 'flex-end' },
  qtyValueApple: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  qtyLabelApple: { fontSize: 9, fontWeight: '700', opacity: 0.5 },
  
  bottomBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, overflow: 'hidden' },
  bottomBlur: { flex: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 34, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
  mainActionBtn: { height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  mainActionText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  
  waitingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingBlur: { width: '85%', borderRadius: 32, overflow: 'hidden', padding: 32 },
  waitingContent: { alignItems: 'center' },
  waitingAnimationBox: { height: 80, justifyContent: 'center' },
  waitingTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  waitingDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  cancelWaitBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14 },
  cancelWaitText: { fontSize: 14, fontWeight: '600' },
  statusIconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  modalListContainer: { flex: 1 },
  modalHeader: { paddingTop: 12, paddingBottom: 20 },
  modalIndicator: { width: 36, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  circleBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  searchBarBox: { flexDirection: 'row', alignItems: 'center', margin: 20, paddingHorizontal: 16, height: 50, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  userItemApple: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16, borderBottomWidth: 0.5 },
  userBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  userBadgeText: { fontSize: 18, fontWeight: '800' },
  userNameApple: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  userHandleApple: { fontSize: 13, fontWeight: '500', marginTop: 1 },
});
