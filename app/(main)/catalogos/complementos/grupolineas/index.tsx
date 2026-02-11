import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NuevoGrupoModal } from './components';

interface GrupoLinea {
    id: number;
    nombre: string;
    skuCount: number;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
}

const MOCK_GROUPS: GrupoLinea[] = [
    { id: 1, nombre: 'Construcción', skuCount: 145, icon: 'construct', iconColor: '#F59E0B' },
    { id: 2, nombre: 'Cerrajería', skuCount: 89, icon: 'key', iconColor: '#0D9488' },
    { id: 3, nombre: 'Soldaduras', skuCount: 210, icon: 'build', iconColor: '#64748B' },
    { id: 4, nombre: 'Plomería', skuCount: 342, icon: 'water', iconColor: '#3B82F6' },
    { id: 5, nombre: 'Electricidad', skuCount: 156, icon: 'flash', iconColor: '#EAB308' },
    { id: 6, nombre: 'Pinturas', skuCount: 67, icon: 'color-palette', iconColor: '#EC4899' },
];

const TOTAL_SKUS = 1009;

export default function GrupoLineasScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const filteredGroups = MOCK_GROUPS.filter(group => 
        group.nombre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const handleNewGroup = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowCreateModal(true);
    };

    const renderItem = ({ item, index }: { item: GrupoLinea; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === filteredGroups.length - 1;
        
        return (
            <TouchableOpacity 
                style={[
                    styles.listItem, 
                    { backgroundColor: colors.surface },
                    isFirst && styles.firstItem,
                    isLast && styles.lastItem,
                ]}
                activeOpacity={0.6}
                onPress={() => Haptics.selectionAsync()}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                </View>
                
                <View style={styles.itemContent}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{item.nombre}</Text>
                    <Text style={[styles.skuCount, { color: colors.textTertiary }]}>
                        {item.skuCount} SKUs
                    </Text>
                </View>
                
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                
                {!isLast && (
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header with Back */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity 
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={[styles.editBtn, { color: colors.accent }]}>Editar</Text>
                </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>Grupos de Líneas</Text>

            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar grupos..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            <FlatList
                data={filteredGroups}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                }
                ListFooterComponent={() => (
                    <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
                        Total de {filteredGroups.length} grupos y {TOTAL_SKUS.toLocaleString()} SKUs
                    </Text>
                )}
            />

            {/* New Group Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity 
                    style={[styles.newBtn, { backgroundColor: colors.accent }]}
                    onPress={handleNewGroup}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.newBtnText}>Nuevo Grupo</Text>
                </TouchableOpacity>
            </View>

            {/* Create Modal */}
            <NuevoGrupoModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={(data) => {
                    console.log('New group:', data);
                    setShowCreateModal(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    backBtn: {
        padding: 4,
    },
    editBtn: {
        fontSize: 17,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 16,
        letterSpacing: -0.5,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 10,
        height: 36,
        borderRadius: 10,
        marginBottom: 20,
        gap: 6,
    },
    searchInput: { flex: 1, fontSize: 15 },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        gap: 12,
        position: 'relative',
    },
    firstItem: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    lastItem: {
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    separator: {
        position: 'absolute',
        left: 60,
        right: 0,
        bottom: 0,
        height: StyleSheet.hairlineWidth,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemContent: {
        flex: 1,
        gap: 2,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '500',
    },
    skuCount: {
        fontSize: 13,
    },
    footerNote: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    newBtn: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    newBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
