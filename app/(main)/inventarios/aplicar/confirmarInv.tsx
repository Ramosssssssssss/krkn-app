import SignatureModal from '@/components/inventarios/SignatureModal';
import { useThemeColors } from '@/context/theme-context';
import { saveAuditData } from '@/services/auditStore';
import {
    aplicarInventarioFisico,
    CaratulaInvfis,
    DetalleArticulo,
    getDetalleInvfis
} from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ConfirmarInventarioScreen() {
  const colors = useThemeColors();
  const { folio } = useLocalSearchParams<{ folio: string }>();
  
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [caratula, setCaratula] = useState<CaratulaInvfis | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [hasFirma, setHasFirma] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const loadDetalle = useCallback(async () => {
    if (!folio) return;
    
    setLoading(true);
    try {
      const response = await getDetalleInvfis(folio);
      setCaratula(response.caratula);
      setDetalles(response.detalles);
    } catch (error) {
      console.error('Error cargando detalle:', error);
      Alert.alert('Error', 'No se pudo cargar el detalle del inventario');
    } finally {
      setLoading(false);
    }
  }, [folio]);

  useEffect(() => {
    loadDetalle();
  }, [loadDetalle]);

  const handleConfirmar = async () => {
    if (!hasFirma || applying) return;
    
    if (!folio) return;

    setApplying(true);
    try {
      const result = await aplicarInventarioFisico(folio);
      
      // Save data to store for PDF generation later
      saveAuditData({
        caratula,
        detalles,
        signature: signatureData
      });

      router.replace({
        pathname: '/(main)/inventarios/aplicar/exito',
        params: { 
          folio: result.folio,
          fecha: result.fecha
        }
      });
    } catch (error: any) {
      console.error('Error aplicando inventario:', error);
      Alert.alert('Error', error.message || 'No se pudo aplicar el inventario');
      setApplying(false);
    }
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
        }} 
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Cards */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>FOLIO AUDITORÍA</Text>
            <Text style={[styles.infoValue, { color: colors.accent, fontWeight: '800' }]}>
              #{formatFolio(folio)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>SUCURSAL / ALMACÉN</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {caratula?.ALMACEN || 'Sin asignar'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>AUDITOR RESPONSABLE</Text>
            <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
              {caratula?.USUARIO}
            </Text>
          </View>
        </View>

        {/* Legal Disclaimer with Checkmark */}
        <View style={[styles.disclaimerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.disclaimerContent}>
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              "Al aplicar este inventario, confirmo que las existencias físicas coinciden con el reporte y asumo la responsabilidad total de las discrepancias resultantes."
            </Text>
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureHeader}>
            <Text style={[styles.signatureLabel, { color: colors.textTertiary }]}>
              FIRMA DEL RESPONSABLE
            </Text>
            {hasFirma && (
              <TouchableOpacity onPress={handleLimpiarFirma} style={styles.clearBtn}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.clearBtnText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.signatureBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSignatureModal(true)}
          >
            {hasFirma && signatureData ? (
              <Image 
                source={{ uri: signatureData }} 
                style={styles.signatureImage} 
                resizeMode="contain"
              />
            ) : (
              <View style={styles.signPlaceholder}>
                <Ionicons name="pencil-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.signPlaceholderText, { color: colors.textTertiary }]}>
                  PULSA PARA FIRMAR
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Articles List */}
        <View style={styles.articlesSection}>
          <View style={styles.articlesHeader}>
            <Text style={[styles.articlesLabel, { color: colors.textTertiary }]}>
              RESUMEN DE CONTEO
            </Text>
            <Text style={[styles.articlesCount, { color: colors.text }]}>
              {detalles.length} ARTÍCULOS
            </Text>
          </View>

          {detalles.map((item, index) => (
            <View 
              key={item.DOCTO_INVFIS_DET_ID || index}
              style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.articleIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="cube" size={20} color={colors.accent} />
              </View>
              
              <View style={styles.articleInfo}>
                <Text style={[styles.articleName, { color: colors.text }]} numberOfLines={1}>
                  {item.NOMBRE_ARTICULO}
                </Text>
                <Text style={[styles.articleStatus, { color: '#10B981' }]}>
                  SIN DISCREPANCIAS
                </Text>
              </View>
              
              <View style={styles.articleQuantity}>
                <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>FÍSICO</Text>
                <Text style={[styles.quantityValue, { color: colors.text }]}>
                  {item.UNIDADES_FISICAS}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[
            styles.confirmBtn, 
            { backgroundColor: hasFirma ? (applying ? colors.buttonDisabled : colors.accent) : colors.buttonDisabled }
          ]}
          onPress={handleConfirmar}
          disabled={!hasFirma || applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.confirmBtnText}>
            {applying ? 'Aplicando...' : 'Confirmar y Aplicar'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelBtn}
          onPress={() => router.back()}
          disabled={applying}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
            Regresar
          </Text>
        </TouchableOpacity>
      </View>

      <SignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onOK={handleSignatureOK}
        title="Firma del Auditor"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  infoSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  disclaimerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  checkmarkContainer: {
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  signatureSection: {
    marginBottom: 24,
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  signatureBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  signPlaceholderText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },
  signedContent: {
    alignItems: 'center',
    gap: 8,
  },
  signedText: {
    fontSize: 15,
    fontWeight: '600',
  },
  articlesSection: {
    marginBottom: 20,
  },
  articlesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  articlesLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  articlesCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  articleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  articleStatus: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  articleQuantity: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  signatureImage: {
    width: '90%',
    height: '80%',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
