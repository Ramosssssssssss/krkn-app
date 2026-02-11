import { API_CONFIG } from '@/config/api';
import { useThemeColors } from '@/context/theme-context';
import { getCurrentDatabaseId } from '@/services/api';
import { ArticuloDetalle } from '@/types/inventarios';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ProductDetailModalProps {
    visible: boolean;
    articulo: ArticuloDetalle | null;
    onClose: () => void;
}

interface FullArticuloInfo {
    id: number;
    nombre: string;
    sku: string;
    categoria: string;
    marca?: string;
    proveedor?: string;
    precio?: number;
    precioIva?: number;
    imagen: string;
    linea?: string;
    umed?: string;
    fullImagen?: string;
}

interface StockInfo {
    sucursal: string;
    almacen: string;
    stock: number;
}

export default function ProductDetailModal({ visible, articulo, onClose }: ProductDetailModalProps) {
    const colors = useThemeColors();
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState<FullArticuloInfo | null>(null);
    const [existencias, setExistencias] = useState<StockInfo[]>([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullImageVisible, setFullImageVisible] = useState(false);

    useEffect(() => {
        if (visible && articulo) {
            fetchFullInfo();
            fetchStock();
        } else {
            setInfo(null);
            setExistencias([]);
            setError(null);
            setFullImageVisible(false);
        }
    }, [visible, articulo]);

    const fetchFullInfo = async () => {
        if (!articulo) return;
        setLoading(true);
        setError(null);

        const databaseId = getCurrentDatabaseId();
        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ARTICULOS}?databaseId=${databaseId}&busqueda=${encodeURIComponent(articulo.clave)}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.ok && Array.isArray(data.articulos) && data.articulos.length > 0) {
                const a = data.articulos.find((x: any) => x.CLAVE === articulo.clave) || data.articulos[0];
                const thumbUri = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${a.ARTICULO_ID}&thumb=1`;
                const fullUri = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMAGEN_ARTICULO}?databaseId=${databaseId}&articuloId=${a.ARTICULO_ID}&thumb=0`;
                
                setInfo({
                    id: a.ARTICULO_ID,
                    nombre: a.NOMBRE,
                    sku: a.CLAVE,
                    categoria: a.CATEGORIA || 'General',
                    marca: a.MARCA,
                    proveedor: a.PROVEEDOR,
                    precio: a.PRECIO,
                    precioIva: a.PRECIO_IVA,
                    imagen: a.IMAGEN === 'NONE' ? `https://api.dicebear.com/7.x/identicon/png?seed=${a.CLAVE}` : thumbUri,
                    linea: a.LINEA,
                    umed: a.UNIDAD_VENTA,
                    fullImagen: a.IMAGEN === 'NONE' ? `https://api.dicebear.com/7.x/identicon/png?seed=${a.CLAVE}` : fullUri
                });
            } else {
                setError('No se encontró información detallada en el catálogo.');
            }
        } catch (err) {
            console.error('Error fetching full article info:', err);
            setError('Error al conectar con el catálogo.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStock = async () => {
        if (!articulo || !articulo.articuloId) return;
        setLoadingStock(true);
        const databaseId = getCurrentDatabaseId();
        const url = `${API_CONFIG.BASE_URL}/api/existencias-articulo.php?databaseId=${databaseId}&articuloId=${articulo.articuloId}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.ok) {
                setExistencias(data.detalles || []);
            }
        } catch (err) {
            console.error('Error fetching stock:', err);
        } finally {
            setLoadingStock(false);
        }
    };

    if (!articulo) return null;

    const DetailRow = ({ label, value, icon }: { label: string; value?: string | number; icon: string }) => {
        if (value === undefined || value === null || value === '') return null;
        return (
            <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <View style={styles.detailLabelRow}>
                    <Ionicons name={icon as any} size={16} color={colors.accent} style={styles.detailIcon} />
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
            </View>
        );
    };

    return (
        <>
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalles del Producto</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {loading ? (
                            <View style={styles.center}>
                                <ActivityIndicator size="large" color={colors.accent} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Consultando catálogo...</Text>
                            </View>
                        ) : error ? (
                            <View style={styles.center}>
                                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                            </View>
                        ) : info ? (
                            <>
                                <View style={styles.imageSection}>
                                    <TouchableOpacity 
                                        activeOpacity={0.9}
                                        onPress={() => setFullImageVisible(true)}
                                        style={[styles.imageContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    >
                                        <Image source={{ uri: info.imagen }} style={styles.productImage} resizeMode="contain" />
                                        <View style={[styles.zoomIndicator, { backgroundColor: colors.accent }]}>
                                            <Ionicons name="search" size={12} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                    <View style={styles.titleInfo}>
                                        <Text style={[styles.productSku, { color: colors.accent }]}>SKU: {info.sku}</Text>
                                        <Text style={[styles.productName, { color: colors.text }]}>{info.nombre}</Text>
                                    </View>
                                </View>

                                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <DetailRow label="Categoría" value={info.categoria} icon="grid-outline" />
                                    <DetailRow label="Línea" value={info.linea} icon="list-outline" />
                                    <DetailRow label="Marca" value={info.marca} icon="pricetag-outline" />
                                    <DetailRow label="Unidad" value={info.umed} icon="cube-outline" />
                                    <DetailRow label="Proveedor" value={info.proveedor} icon="business-outline" />
                                </View>

                                <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <DetailRow 
                                        label="Precio Base" 
                                        value={info.precio ? `$${Number(info.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : undefined} 
                                        icon="cash-outline" 
                                    />
                                    <DetailRow 
                                        label="Precio con IVA" 
                                        value={info.precioIva ? `$${Number(info.precioIva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : undefined} 
                                        icon="receipt-outline" 
                                    />
                                </View>

                                {/* Sección de Existencias */}
                                <View style={styles.stockSection}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="cube" size={18} color={colors.accent} />
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Existencias por Almacén</Text>
                                    </View>
                                    
                                    {loadingStock ? (
                                        <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 10 }} />
                                    ) : existencias.length > 0 ? (
                                        <View style={[styles.stockList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            {existencias.map((item, idx) => (
                                                <View key={idx} style={[styles.stockItem, idx < existencias.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                                                    <View style={styles.stockPlaceInfo}>
                                                        <Text style={[styles.stockSucursal, { color: colors.textSecondary }]}>{item.sucursal}</Text>
                                                        <Text style={[styles.stockAlmacen, { color: colors.text }]}>{item.almacen}</Text>
                                                    </View>
                                                    <View style={[styles.stockBadge, { backgroundColor: item.stock > 0 ? `${colors.accent}15` : '#ff000015' }]}>
                                                        <Text style={[styles.stockValue, { color: item.stock > 0 ? colors.accent : colors.error }]}>
                                                            {item.stock % 1 === 0 ? item.stock : item.stock.toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={[styles.noStockText, { color: colors.textTertiary }]}>No hay existencias registradas.</Text>
                                    )}
                                </View>
                            </>
                        ) : (
                            <View style={styles.center}>
                                <Text style={{ color: colors.textTertiary }}>Cargando info básica...</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <TouchableOpacity 
                            style={[styles.doneBtn, { backgroundColor: colors.accent }]} 
                            onPress={onClose}
                        >
                            <Text style={styles.doneBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Full Image Overlay (outside container to occupy 100% screen height) */}
                {fullImageVisible && (
                    <View style={[StyleSheet.absoluteFill, styles.fullImageOverlay, { zIndex: 999 }]}>
                        <TouchableOpacity 
                            style={styles.fullImageContainer}
                            activeOpacity={1}
                            onPress={() => setFullImageVisible(false)}
                        >
                            <TouchableOpacity 
                                style={styles.fullImageClose}
                                onPress={() => setFullImageVisible(false)}
                            >
                                <Ionicons name="close" size={32} color="#fff" />
                            </TouchableOpacity>
                            {info?.fullImagen && (
                                <View style={styles.fullImageWrapper}>
                                    <Image 
                                        source={{ uri: info.fullImagen }} 
                                        style={styles.fullImage} 
                                        resizeMode="contain" 
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    errorText: {
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 16,
    },
    productImage: {
        width: 100,
        height: 100,
    },
    titleInfo: {
        alignItems: 'center',
    },
    productSku: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    zoomIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    section: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 20,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
    },
    doneBtn: {
        height: 54,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    fullImageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImageClose: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImageWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    stockSection: {
        marginTop: 8,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    stockList: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    stockItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
    },
    stockPlaceInfo: {
        flex: 1,
        marginRight: 10,
    },
    stockSucursal: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    stockAlmacen: {
        fontSize: 13,
        fontWeight: '600',
    },
    stockBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 50,
        alignItems: 'center',
    },
    stockValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    noStockText: {
        fontSize: 13,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 10,
    },
});


