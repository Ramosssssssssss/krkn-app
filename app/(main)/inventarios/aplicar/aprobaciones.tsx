import { useThemeColors } from '@/context/theme-context';
import {
    CaratulaInvfis,
    DetalleArticulo,
    DoctoInvfis,
    getDetalleInvfis,
    getDoctosInvfisSemana,
    responderAprobacionInventario,
} from '@/services/inventarios';
import { formatFolio } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AprobacionesInventarioScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const { folio: folioDeepLink } = useLocalSearchParams<{ folio: string }>();
    
    // Estados
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [solicitudes, setSolicitudes] = useState<DoctoInvfis[]>([]);
    const [processedDeepLink, setProcessedDeepLink] = useState(false);
    
    // Detalle
    const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [caratula, setCaratula] = useState<CaratulaInvfis | null>(null);
    const [detalles, setDetalles] = useState<DetalleArticulo[]>([]);
    
    // Acciones
    const [processingAction, setProcessingAction] = useState(false);
    const [actionResult, setActionResult] = useState<'success' | 'error' | null>(null);

    const fetchSolicitudes = async (showRefresher = false) => {
        if (!showRefresher) setLoading(true);
        try {
            const pending = await getDoctosInvfisSemana(undefined, undefined, false, 'P');
            setSolicitudes(pending);
        } catch (error) {
            console.error('Error fetching approvals:', error);
            Alert.alert('Error', 'No se pudieron cargar las solicitudes pendientes');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    useEffect(() => {
        if (folioDeepLink && solicitudes.length > 0 && !processedDeepLink) {
            const item = solicitudes.find(s => s.FOLIO === folioDeepLink);
            if (item) {
                setProcessedDeepLink(true);
                handleOpenDetail(item.FOLIO);
            }
        }
    }, [folioDeepLink, solicitudes, processedDeepLink]);

    const handleOpenDetail = async (folio: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedFolio(folio);
        setShowDetailModal(true);
        setDetailLoading(true);
        setActionResult(null);
        try {
            const resp = await getDetalleInvfis(folio);
            setCaratula(resp.caratula);
            setDetalles(resp.detalles);
        } catch (error) {
            console.error('Error fetching detail:', error);
            Alert.alert('Error', 'No se pudieron cargar los detalles del inventario');
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleConfirmAction = async (action: 'APROBAR' | 'RECHAZAR') => {
        if (!selectedFolio) return;
        
        if (Platform.OS !== 'web') Haptics.notificationAsync(
            action === 'APROBAR' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        );

        setProcessingAction(true);
        try {
            await responderAprobacionInventario(selectedFolio, action);
            setActionResult('success');
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            setTimeout(() => {
                setShowDetailModal(false);
                setActionResult(null);
                fetchSolicitudes();
            }, 1800);
        } catch (error: any) {
            console.error('Action error:', error);
            setActionResult('error');
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => setActionResult(null), 3000);
        } finally {
            setProcessingAction(false);
        }
    };

    const renderItem = ({ item, index }: { item: DoctoInvfis, index: number }) => {
        const initial = item.USUARIO?.charAt(0).toUpperCase() || '?';
        const dateStr = item.FECHA ? new Date(item.FECHA).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '';

        return (
            <TouchableOpacity 
                style={[styles.premiumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleOpenDetail(item.FOLIO)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.avatarCircle, { backgroundColor: index % 2 === 0 ? colors.accent : '#5856D6' }]}>
                        <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.cardFolio, { color: colors.text }]}>#{formatFolio(item.FOLIO)}</Text>
                        <Text style={[styles.cardUser, { color: colors.textSecondary }]}>{item.USUARIO}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.accent + '15' }]}>
                        <Text style={[styles.tagText, { color: colors.accent }]}>PENDIENTE</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                        <Ionicons name="business-outline" size={14} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.ALMACEN}</Text>
                        <View style={styles.metaDivider} />
                        <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textTertiary }]}>{dateStr}</Text>
                    </View>
                    
                    {item.DESCRIPCION && (
                        <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                            {item.DESCRIPCION.startsWith('[P] ') ? item.DESCRIPCION.substring(4) : item.DESCRIPCION}
                        </Text>
                    )}
                </View>

                <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={18} color={colors.border} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle={colors.mode === 'dark' ? "light-content" : "dark-content"} />

            {/* Custom Header */}
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={[styles.headerSub, { color: colors.textTertiary }]}>SUPERVISIÓN</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Autorizaciones</Text>
                </View>
                <View style={styles.headerRight}>
                    {solicitudes.length > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                            <Text style={styles.countText}>{solicitudes.length}</Text>
                        </View>
                    )}
                </View>
            </View>

            {loading && solicitudes.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.loadingTextMain, { color: colors.textTertiary }]}>Buscando solicitudes...</Text>
                </View>
            ) : (
                <FlatList
                    data={solicitudes}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.FOLIO}
                    contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={() => { setRefreshing(true); fetchSolicitudes(true); }} 
                            tintColor={colors.accent}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                                <Ionicons name="shield-checkmark-outline" size={48} color={colors.border} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Todo en orden</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>No hay inventarios capturados esperando tu autorización por ahora.</Text>
                        </View>
                    }
                />
            )}

            {/* Detalle Modal */}
            <Modal
                visible={showDetailModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.modalHeaderApple}>
                        <View>
                            <Text style={[styles.modalTitleApple, { color: colors.text }]}>Revisión de Auditoría</Text>
                            <Text style={[styles.modalFolioApple, { color: colors.accent }]}>FOLIO #{formatFolio(selectedFolio || '')}</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.closeBtnApple, { backgroundColor: colors.surface }]}
                            onPress={() => setShowDetailModal(false)}
                        >
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {detailLoading ? (
                        <View style={styles.modalCenter}>
                            <ActivityIndicator size="large" color={colors.accent} />
                            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Recuperando artículos...</Text>
                        </View>
                    ) : (
                        <>
                            <ScrollView 
                                style={styles.modalScroll} 
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Auditor Info Card */}
                                <View style={[styles.auditorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.auditorRow}>
                                        <View style={[styles.auditorAvatar, { backgroundColor: colors.accent }]}>
                                            <Text style={styles.auditorInitial}>{caratula?.USUARIO?.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.auditorName, { color: colors.text }]}>{caratula?.USUARIO}</Text>
                                            <Text style={[styles.auditorRole, { color: colors.textTertiary }]}>Auditor Responsable</Text>
                                        </View>
                                        <View style={[styles.locBadge, { backgroundColor: colors.accent + '10' }]}>
                                            <Ionicons name="location" size={12} color={colors.accent} />
                                            <Text style={[styles.locText, { color: colors.accent }]}>{caratula?.ALMACEN}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Summary Stats */}
                                <View style={styles.statsContainer}>
                                    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Text style={[styles.statValue, { color: colors.text }]}>{detalles.length}</Text>
                                        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ARTÍCULOS</Text>
                                    </View>
                                    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Text style={[styles.statValue, { color: colors.accent }]}>
                                            {detalles.reduce((acc, curr) => acc + curr.UNIDADES_FISICAS, 0)}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>PIEZAS TOTAL</Text>
                                    </View>
                                </View>

                                {/* Items List */}
                                <Text style={[styles.listHeader, { color: colors.textTertiary }]}>DETALLE DE PRODUCTOS</Text>
                                <View style={[styles.itemsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    {detalles.map((item, idx) => (
                                        <View key={idx} style={[styles.itemRow, idx < detalles.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 0.5 }]}>
                                            <View style={styles.itemMain}>
                                                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.NOMBRE_ARTICULO}</Text>
                                                <Text style={[styles.itemClave, { color: colors.textTertiary }]}>{item.CLAVE_ARTICULO} • {item.UMED}</Text>
                                            </View>
                                            <View style={styles.itemQtyBox}>
                                                <Text style={[styles.itemQty, { color: colors.text }]}>{item.UNIDADES_FISICAS}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {caratula?.DESCRIPCION && (
                                    <View style={[styles.notesCard, { backgroundColor: colors.surface }]}>
                                        <Text style={[styles.notesHeader, { color: colors.textTertiary }]}>NOTAS DE AUDITORÍA</Text>
                                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                                            {caratula.DESCRIPCION.startsWith('[P] ') ? caratula.DESCRIPCION.substring(4) : caratula.DESCRIPCION}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Floating Action Bar */}
                            <View style={styles.actionFooter}>
                                <BlurView intensity={80} tint={colors.mode === 'dark' ? 'dark' : 'light'} style={styles.blurFooter}>
                                    {actionResult === 'success' ? (
                                        <View style={styles.successView}>
                                            <View style={styles.successIcon}>
                                                <Ionicons name="checkmark" size={32} color="#FFF" />
                                            </View>
                                            <Text style={[styles.successText, { color: colors.text }]}>¡Procesado con éxito!</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.buttonRow}>
                                            <TouchableOpacity 
                                                style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                                onPress={() => handleConfirmAction('RECHAZAR')}
                                                disabled={processingAction}
                                            >
                                                <Text style={[styles.rejectText, { color: '#FF3B30' }]}>Rechazar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.accent }]}
                                                onPress={() => handleConfirmAction('APROBAR')}
                                                disabled={processingAction}
                                            >
                                                {processingAction ? (
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                                                        <Text style={styles.approveText}>Autorizar Cambios</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </BlurView>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -10,
    },
    titleContainer: { flex: 1, marginLeft: 5 },
    headerSub: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
    headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
    headerRight: { width: 44, alignItems: 'flex-end' },
    countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
    countText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

    loadingTextMain: { marginTop: 15, fontSize: 14, fontWeight: '500' },

    // List
    list: { paddingHorizontal: 20, paddingTop: 10 },
    premiumCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
            android: { elevation: 2 },
        }),
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    headerInfo: { flex: 1 },
    cardFolio: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    cardUser: { fontSize: 14, fontWeight: '500', marginTop: 1 },
    tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    
    cardBody: { paddingLeft: 0 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    metaText: { fontSize: 13, fontWeight: '500' },
    metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', marginHorizontal: 4 },
    cardDesc: { fontSize: 13, fontWeight: '400', fontStyle: 'italic' },
    cardArrow: { position: 'absolute', right: 20, top: '50%', marginTop: -9 },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, letterSpacing: -0.5 },
    emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, opacity: 0.7 },

    // Modal
    modalHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 12 },
    modalHeaderApple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 25 },
    modalTitleApple: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
    modalFolioApple: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
    closeBtnApple: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    
    modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    loadingText: { marginTop: 15, fontSize: 14, fontWeight: '500' },
    
    modalScroll: { flex: 1 },
    auditorCard: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1 },
    auditorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    auditorAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    auditorInitial: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    auditorName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
    auditorRole: { fontSize: 13, fontWeight: '500', marginTop: 1 },
    locBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    locText: { fontSize: 11, fontWeight: '700' },

    statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    statBox: { flex: 1, paddingVertical: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
    statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -1 },
    statLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, opacity: 0.6 },

    listHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    itemsList: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    itemRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 15 },
    itemMain: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
    itemClave: { fontSize: 12, marginTop: 2, fontWeight: '500' },
    itemQtyBox: { minWidth: 40, alignItems: 'flex-end' },
    itemQty: { fontSize: 18, fontWeight: '800' },

    notesCard: { marginTop: 20, padding: 20, borderRadius: 20 },
    notesHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
    notesText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },

    actionFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
    blurFooter: { flex: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 40, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.05)' },
    buttonRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    rejectBtn: { flex: 1, borderWidth: 1 },
    approveBtn: { flex: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
    rejectText: { fontSize: 16, fontWeight: '700' },
    approveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    successView: { alignItems: 'center' },
    successIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    successText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
});

