import { useThemeColors } from '@/context/theme-context';
import { createLineaArticulo, getLineasArticulos, LineaArticulo } from '@/services/inventarios';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NuevaLineaModal from './components/NuevaLineaModal';

export default function LineasScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    // Data State
    const [lineas, setLineas] = useState<LineaArticulo[]>([]);
    const [filteredLineas, setFilteredLineas] = useState<LineaArticulo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredLineas(lineas);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = lineas.filter(l => 
                l.nombre.toLowerCase().includes(query)
            );
            setFilteredLineas(filtered);
        }
    }, [searchQuery, lineas]);

    const loadData = async () => {
        try {
            if (!refreshing) setIsLoading(true);
            const data = await getLineasArticulos('');
            setLineas(data);
            setFilteredLineas(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudieron cargar las líneas');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        loadData();
    }, []);

    const handleNewGroup = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowCreateModal(true);
    };

    const handleSaveLinea = async (data: any) => {
        try {
            // Validar
            if (!data.nombre || !data.grupoId) {
                Alert.alert('Error', 'Faltan datos requeridos');
                return;
            }

            const grupoIdInt = parseInt(data.grupoId, 10);
            if (isNaN(grupoIdInt)) {
                 Alert.alert('Error', 'ID de grupo inválido');
                 return;
            }

            // Llamar API
            // Nota: La API PHP createLineaArticulo ya espera nombre y grupoLineaId
            const result = await createLineaArticulo(data.nombre, grupoIdInt);
            
            if (result.success) {
                Alert.alert('Éxito', 'Línea creada correctamente');
                setShowCreateModal(false);
                loadData(); // Recargar lista
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo crear la línea');
        }
    };

    const renderItem = ({ item, index }: { item: LineaArticulo; index: number }) => {
        const isFirst = index === 0;
        const isLast = index === filteredLineas.length - 1;
        
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
                <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name="list" size={18} color={colors.accent} />
                </View>
                
                <View style={styles.itemContent}>
                    <Text style={[styles.groupName, { color: colors.text }]}>{item.nombre}</Text>
                    <Text style={[styles.skuCount, { color: colors.textTertiary }]}>
                        ID: {item.id}
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
            <Text style={[styles.title, { color: colors.text }]}>Líneas de Artículos</Text>

            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="search" size={16} color={colors.textTertiary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar líneas..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            {isLoading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={filteredLineas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
                    }
                    ListFooterComponent={() => (
                        <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
                            Total de {filteredLineas.length} líneas
                        </Text>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No se encontraron líneas
                            </Text>
                        </View>
                    }
                />
            )}

            {/* New Group Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity 
                    style={[styles.newBtn, { backgroundColor: colors.accent }]}
                    onPress={handleNewGroup}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.newBtnText}>Nueva Línea</Text>
                </TouchableOpacity>
            </View>

            {/* Create Modal */}
            <NuevaLineaModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleSaveLinea}
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
        backgroundColor: 'transparent', 
    },
    newBtn: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    newBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
