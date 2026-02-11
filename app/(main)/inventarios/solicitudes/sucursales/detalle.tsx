import ProductDetailModal from '@/components/inventarios/ProductDetailModal';
import { API_CONFIG } from '@/config/api';
import { useThemeColors } from '@/context/theme-context';
import { getCurrentDatabaseId, getSolicitudDetalle, SolicitudDetalleArticulo } from '@/services/api';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const getEstatusDisplay = (estatus: string) => {
  switch (estatus) {
    case 'P': return { label: 'PENDIENTE', color: '#F59E0B', bg: '#FFF3E0' };
    case 'S': return { label: 'SURTIDA', color: '#10B981', bg: '#E8F5E9' };
    case 'C': return { label: 'CANCELADA', color: '#EF4444', bg: '#FFEBEE' };
    default: return { label: estatus, color: '#6B7280', bg: '#F5F5F5' };
  }
};

export default function SolicitudDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<any>(null);
  const [articulos, setArticulos] = useState<SolicitudDetalleArticulo[]>([]);
  const [totales, setTotales] = useState({ articulos: 0, unidades: 0, surtidas: 0 });
  const [selectedArticleForDetail, setSelectedArticleForDetail] = useState<any | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  
  const databaseId = getCurrentDatabaseId();

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  async function loadDetail() {
    try {
      setLoading(true);
      setError(null);
      const result = await getSolicitudDetalle(parseInt(id || '0'));
      if (result.ok) {
        setHeader(result.header);
        setArticulos(result.articulos || []);
        setTotales(result.totales || { articulos: 0, unidades: 0, surtidas: 0 });
      } else {
        setError(result.message || 'Error al cargar el detalle');
      }
    } catch (err: any) {
      console.error('Error loading detail:', err);
      setError(err.message || 'Error al cargar el detalle');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FB923C" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando detalle...</Text>
      </View>
    );
  }

  if (error || !header) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 20 }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>¡Oops!</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: '#FB923C' }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estatusInfo = getEstatusDisplay(header.estatus);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={{ backgroundColor: colors.surface }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color="#FB923C" />
            <Text style={[styles.headerBackText, { color: '#FB923C' }]}>Solicitudes</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Folio #{formatFolio(header.folio)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: estatusInfo.bg, marginTop: 2 }]}>
              <Text style={[styles.statusBadgeText, { color: estatusInfo.color }]}>
                {estatusInfo.label}
              </Text>
            </View>
          </View>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitleLabel, { color: colors.textTertiary }]}>INFORMACIÓN GENERAL</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <InfoRow 
            label="Fecha" 
            value={new Date(header.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} 
            colors={colors} 
          />
          <InfoRow label="Origen" value={header.sucursal_origen} colors={colors} />
          <InfoRow label="Destino" value={header.sucursal_destino} colors={colors} />
          <InfoRow label="Almacén Destino" value={header.almacen_destino} colors={colors} />
          <InfoRow label="Usuario" value={header.usuario} colors={colors} last />
        </View>

        {header.descripcion ? (
           <View style={[styles.infoCard, { backgroundColor: colors.surface, marginTop: 12 }]}>
              <InfoRow label="Descripción" value={header.descripcion} colors={colors} last />
           </View>
        ) : null}

        <Text style={[styles.sectionTitleLabel, { color: colors.textTertiary, marginTop: 24 }]}>ARTÍCULOS</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          {articulos.map((art, index) => (
            <View key={art.det_id}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedArticleForDetail({ clave: art.clave, descripcion: art.nombre });
                  setShowProductDetail(true);
                }}
                style={styles.articleRowContainer}
              >
                <View style={[styles.articleRow, { opacity: 1 }]}>
                  <View style={[styles.imageWrapper, { backgroundColor: colors.background }]}>
                    <Image 
                      source={{ uri: art.articulo_id ? `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${art.articulo_id}&thumb=1` : `https://api.dicebear.com/7.x/identicon/png?seed=${art.clave}` }} 
                      style={styles.thumbnail}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.skuText, { color: colors.textTertiary }]}>SKU: {art.clave}</Text>
                    <Text style={[styles.articleName, { color: colors.text }]} numberOfLines={2}>{art.nombre}</Text>
                  </View>
                  <View style={styles.qtyContainer}>
                    <Text style={[styles.qtyValue, { color: '#FB923C' }]}>{art.unidades}</Text>
                    <Text style={[styles.unitText, { color: colors.textTertiary }]}>Uds</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {index < articulos.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
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
            <Text style={[styles.footerLabel, { color: colors.textTertiary }]}>Total SKUs</Text>
            <Text style={[styles.footerValue, { color: colors.text }]}>{totales.articulos} Artículos</Text>
          </View>
          <View style={[styles.footerRow, { marginTop: 8 }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Unidades</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {totales.unidades}
            </Text>
          </View>
          {totales.surtidas > 0 && (
            <View style={[styles.footerRow, { marginTop: 4 }]}>
              <Text style={[styles.footerLabel, { color: '#10B981' }]}>Surtidas</Text>
              <Text style={[styles.footerValue, { color: '#10B981' }]}>{totales.surtidas}</Text>
            </View>
          )}
        </View>
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
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#FFF', fontWeight: '700' },
  
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 100,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
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
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
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
  infoLabelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoValueText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    width: '100%',
  },

  articleRowContainer: {
    width: '100%',
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  imageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  thumbnail: {
    width: 40,
    height: 40,
  },
  skuText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 16,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    paddingBottom: 2,
  },

  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    gap: 12,
  },
  summaryContainer: {
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  headerRightPlaceholder: {
    minWidth: 100,
  },
});
