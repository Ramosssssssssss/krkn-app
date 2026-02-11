import { Bone } from '@/components/Skeleton';
import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NuevoClasificadorModal } from './components';

interface Clasificador {
    id: number;
    nombre: string;
    codigo: string;
    count: number;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
}

const { width } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_SIZE = (width - 32 - GRID_GAP) / 2;

const MOCK_CLASIFICADORES: Clasificador[] = [
    { id: 1, nombre: 'Marca', codigo: 'MRC', count: 24, icon: 'pricetag', iconColor: '#8B5CF6' },
    { id: 2, nombre: 'Categoría', codigo: 'CAT', count: 105, icon: 'grid', iconColor: '#0D9488' },
    { id: 3, nombre: 'Zona de Almacén', codigo: 'ZNA', count: 8, icon: 'location', iconColor: '#F59E0B' },
    { id: 4, nombre: 'Proveedor', codigo: 'PRV', count: 312, icon: 'car', iconColor: '#64748B' },
    { id: 5, nombre: 'Unidades de Medida', codigo: 'UOM', count: 14, icon: 'analytics', iconColor: '#EC4899' },
];

export default function ClasificadoresScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 600);
        return () => clearTimeout(t);
    }, []);

    const filteredItems = MOCK_CLASIFICADORES.filter(item =>
        item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const handleNewClasificador = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowCreateModal(true);
    };

    /* ─── Skeleton ─── */
    const renderSkeleton = () => (
        <View style={s.grid}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[s.card, { backgroundColor: colors.surface }]}>
                    <Bone width={40} height={40} radius={12} />
                    <Bone width={CARD_SIZE * 0.65} height={12} radius={4} />
                    <Bone width={CARD_SIZE * 0.4} height={10} radius={3} />
                </View>
            ))}
        </View>
    );

    /* ─── Empty ─── */
    const renderEmpty = () => (
        <View style={s.empty}>
            <View style={[s.emptyCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="options-outline" size={32} color={colors.textTertiary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Sin clasificadores</Text>
            <Text style={[s.emptyDesc, { color: colors.textTertiary }]}>
                No se encontraron clasificadores
            </Text>
        </View>
    );

    /* ─── Grid ─── */
    const renderGrid = () => (
        <View style={s.grid}>
            {filteredItems.map((item) => (
                <TouchableOpacity
                    key={item.id.toString()}
                    style={[s.card, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    onPress={() => Haptics.selectionAsync()}
                >
                    <View style={[s.cardIcon, { backgroundColor: `${item.iconColor}18` }]}>
                        <Ionicons name={item.icon} size={20} color={item.iconColor} />
                    </View>
                    <View>
                        <Text style={[s.cardName, { color: colors.text }]} numberOfLines={2}>
                            {item.nombre}
                        </Text>
                        <Text style={[s.cardCode, { color: colors.textTertiary }]}>{item.codigo}</Text>
                    </View>
                    <View style={s.cardFooter}>
                        <Text style={[s.cardLabel, { color: item.iconColor }]}>
                            {item.count} items
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={[s.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.accent} />
                    <Text style={[s.backText, { color: colors.accent }]}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={[s.title, { color: colors.text }]}>Clasificadores</Text>

            {/* Count */}
            {!loading && (
                <Text style={[s.countBadge, { color: colors.textTertiary }]}>
                    {filteredItems.length} {filteredItems.length === 1 ? 'clasificador' : 'clasificadores'}
                    {searchQuery ? ' encontrados' : ''}
                </Text>
            )}

            {/* Search */}
            <View style={[s.searchBar, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                    style={[s.searchInput, { color: colors.text }]}
                    placeholder="Buscar clasificadores..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    s.scroll,
                    !loading && filteredItems.length === 0 && { flex: 1 },
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
            >
                {loading && !refreshing
                    ? renderSkeleton()
                    : filteredItems.length === 0
                        ? renderEmpty()
                        : renderGrid()}
            </ScrollView>

            {/* FAB */}
            <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[s.fab, { backgroundColor: colors.accent }]}
                    onPress={handleNewClasificador}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={s.fabText}>Nuevo Clasificador</Text>
                </TouchableOpacity>
            </View>

            {/* Modal */}
            <NuevoClasificadorModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={(data: ClasificadorFormData) => {
                    console.log('New clasificador:', data);
                    setShowCreateModal(false);
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backText: { fontSize: 17 },
    title: {
        fontSize: 32,
        fontWeight: '700',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 4,
        letterSpacing: -0.5,
    },
    countBadge: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 10,
        height: 36,
        borderRadius: 10,
        marginBottom: 12,
        gap: 6,
    },
    searchInput: { flex: 1, fontSize: 15 },
    scroll: {
        paddingHorizontal: 16,
        paddingBottom: 110,
    },
    // ─── Grid ───
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
    },
    card: {
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: 18,
        padding: 16,
        justifyContent: 'space-between',
    },
    cardIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardName: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    cardCode: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    // ─── Empty ───
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 10,
    },
    emptyCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700' },
    emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    // ─── Footer ───
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    fab: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    fabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
