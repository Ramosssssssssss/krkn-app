import ProductDetailModal from '@/components/inventarios/ProductDetailModal';
import { API_CONFIG } from '@/config/api';
import { useThemeColors } from '@/context/theme-context';
import { getCurrentDatabaseId } from '@/services/api';
import {
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
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function DetalleConteoScreen() {
  const colors = useThemeColors();
  const { folio } = useLocalSearchParams<{ folio: string }>();
  
  const [loading, setLoading] = useState(true);
  const [caratula, setCaratula] = useState<CaratulaInvfis | null>(null);
  const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState<any | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const loadDetalle = useCallback(async () => {
    if (!folio) return;
    
    setLoading(true);
    try {
      const response = await getDetalleInvfis(folio);
      setCaratula(response.caratula);
      setDetalles(response.detalles);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    } finally {
      setLoading(false);
    }
  }, [folio]);

  const navigateToPreview = () => {
    if (!caratula) return;
    const previewData = {
      title: 'COMPROBANTE DE CONTEO FÍSICO',
      subtitle: 'REVISIÓN DE INVENTARIO',
      folio: formatFolio(caratula.FOLIO),
      fecha: new Date(caratula.FECHA).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
      sucursal: caratula.ALMACEN,
      almacen: caratula.ALMACEN,
      usuario: caratula.USUARIO,
      concepto: 'CONTEO CÍCLICO',
      descripcion: caratula.DESCRIPCION,
      accentColor: '#F59E0B',
      articulos: detalles.map(item => ({
        clave: item.CLAVE_ARTICULO,
        nombre: item.NOMBRE_ARTICULO,
        cantidad: item.UNIDADES_FISICAS,
        unidad: 'UNI'
      })),
      totales: {
        partidas: detalles.length,
        unidades: detalles.reduce((acc, curr) => acc + curr.UNIDADES_FISICAS, 0)
      }
    };

    router.push({
      pathname: '/(main)/inventarios/preview-pdf',
      params: { data: JSON.stringify(previewData) }
    });
  };

  useEffect(() => {
    loadDetalle();
  }, [loadDetalle]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando detalle...</Text>
      </View>
    );
  }

  if (!caratula) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>¡Oops!</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>No se encontró la información del conteo.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#F59E0B', fontWeight: '700' }}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isApplied = caratula.APLICADO === 'S';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <SafeAreaView style={{ backgroundColor: colors.surface }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color="#F59E0B" />
            <Text style={[styles.headerBackText, { color: '#F59E0B' }]}>Historial</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Folio #{formatFolio(caratula.FOLIO)}</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: isApplied ? '#ECFDF5' : '#FFF7ED', marginTop: 2 }
            ]}>
              <Text style={[
                styles.statusTextBadge, 
                { color: isApplied ? '#059669' : '#EA580C' }
              ]}>
                {isApplied ? 'APLICADO' : 'PENDIENTE'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitleLabel, { color: colors.textTertiary }]}>INFORMACIÓN GENERAL</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <InfoRow 
            label="Fecha" 
            value={new Date(caratula.FECHA).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} 
            colors={colors} 
          />
          <InfoRow label="Almacén" value={caratula.ALMACEN} colors={colors} />
          <InfoRow label="Usuario" value={caratula.USUARIO} colors={colors} last />
        </View>

        {caratula.DESCRIPCION ? (
          <View style={[styles.infoCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
            <InfoRow label="Descripción" value={caratula.DESCRIPCION} colors={colors} last />
          </View>
        ) : null}

        <Text style={[styles.sectionTitleLabel, { color: colors.textTertiary, marginTop: 24 }]}>RESUMEN DE CONTEO</Text>
        <View style={styles.articlesContainer}>
          {detalles.map((item, index) => (
            <View 
              key={item.DOCTO_INVFIS_DET_ID || index}
              style={[styles.articleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
               <View style={[styles.articleIcon, { backgroundColor: colors.background }]}>
                 <Image 
                   source={{ uri: item.CLAVE_ARTICULO ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${getCurrentDatabaseId()}&articuloId=${item.ARTICULO_ID}&thumb=1` : `https://api.dicebear.com/7.x/identicon/png?seed=${item.CLAVE_ARTICULO}` }} 
                   style={styles.thumbnail}
                   resizeMode="contain"
                 />
               </View>
              
              <View style={styles.articleInfo}>
                <Text style={[styles.articleName, { color: colors.text }]} numberOfLines={1}>
                  {item.NOMBRE_ARTICULO}
                </Text>
                <Text style={[styles.articleClave, { color: colors.textTertiary }]}>
                  SKU: {item.CLAVE_ARTICULO}
                </Text>
              </View>
              
              <View style={styles.articleQuantity}>
                <Text style={[styles.quantityLabel, { color: colors.textTertiary }]}>FÍSICO</Text>
                <Text style={[styles.quantityValue, { color: colors.text }]}>
                  {item.UNIDADES_FISICAS}
                </Text>
              </View>
              <TouchableOpacity 
                style={StyleSheet.absoluteFill} 
                onPress={() => {
                  setSelectedArticleForDetail({ clave: item.CLAVE_ARTICULO, descripcion: item.NOMBRE_ARTICULO });
                  setShowProductDetail(true);
                }} 
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <ProductDetailModal 
        visible={showProductDetail}
        articulo={selectedArticleForDetail}
        onClose={() => setShowProductDetail(false)}
      />

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.summaryContainer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Total de Artículos</Text>
            <Text style={[styles.footerValue, { color: colors.text }]}>{detalles.length} partidas</Text>
          </View>
          <View style={[styles.footerRow, { marginTop: 8 }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Unidades</Text>
            <Text style={[styles.totalValue, { color: '#F59E0B' }]}>
              {detalles.reduce((acc, curr) => acc + curr.UNIDADES_FISICAS, 0)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.pdfButton, { backgroundColor: '#F59E0B' }]}
          onPress={navigateToPreview}
        >
          <Ionicons name="eye-outline" size={22} color="#FFF" />
          <Text style={styles.pdfButtonText}>Previsualizar Comprobante</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value, colors, last = false }: any) {
  return (
    <View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabelText, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValueText, { color: colors.textTertiary }]} numberOfLines={1}>{value}</Text>
      </View>
      {!last && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: '500' },
  errorTitle: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 24, paddingHorizontal: 40 },
  backBtn: { padding: 12 },
  
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  headerBackText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  statusTextBadge: { fontSize: 10, fontWeight: '800' },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitleLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  infoLabelText: { fontSize: 15, fontWeight: '600' },
  infoValueText: { fontSize: 15, fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  divider: { height: 1, width: '100%' },

  articlesContainer: { gap: 8 },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  articleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  thumbnail: {
    width: 36,
    height: 36,
  },
  articleInfo: { flex: 1 },
  articleName: { fontSize: 15, fontWeight: '700' },
  articleClave: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  articleQuantity: { alignItems: 'flex-end' },
  quantityLabel: { fontSize: 10, fontWeight: '500', marginBottom: 2 },
  quantityValue: { fontSize: 18, fontWeight: '800' },

  footer: {
    padding: 24,
    paddingBottom: 60,
    borderTopWidth: 1,
    gap: 20,
  },
  summaryContainer: {
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLabel: { fontSize: 15, fontWeight: '600' },
  footerValue: { fontSize: 16, fontWeight: '700' },
  totalLabel: { fontSize: 18, fontWeight: '800' },
  totalValue: { fontSize: 24, fontWeight: '900' },
  headerRightPlaceholder: {
    minWidth: 90,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pdfButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  }
});
