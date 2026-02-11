import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ArticleData {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unit: string;
    lot: string;
    image: string;
}

// Mock article data
const MOCK_ARTICLE: ArticleData = {
    id: '1',
    name: 'Tornillo Hexagonal 1/2 × 3',
    sku: '10293-AX',
    quantity: 1,
    unit: 'Unidad',
    lot: 'B-99201',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
};

export default function ConfirmarArticuloScreen() {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ code?: string }>();

    // In real app, fetch article by code
    const article = MOCK_ARTICLE;

    const handleAssignLocation = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Navigate to location assignment screen
        router.push('/procesos/acomodo/ubicacion');
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Identified Section */}
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>IDENTIFICADO</Text>

            {/* Article Card */}
            <View style={[styles.articleCard, { backgroundColor: colors.surface }]}>
                <Image 
                    source={{ uri: article.image }} 
                    style={styles.articleImage}
                />
                <View style={styles.articleInfo}>
                    <Text style={[styles.articleName, { color: colors.text }]}>{article.name}</Text>
                    <View style={styles.articleMeta}>
                        <Text style={[styles.skuText, { color: colors.textTertiary }]}>SKU: {article.sku}</Text>
                        <View style={styles.quantityBadge}>
                            <Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.quantityText, { color: colors.textSecondary }]}>
                                {article.quantity} {article.unit}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Lot Row */}
            <View style={[styles.lotRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.lotLabel, { color: colors.textTertiary }]}>Lote</Text>
                <Text style={[styles.lotValue, { color: colors.text }]}>{article.lot}</Text>
            </View>

            {/* Assignment Prompt */}
            <View style={[styles.promptCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.promptIcon, { backgroundColor: `${colors.accent}15` }]}>
                    <Ionicons name="location" size={24} color={colors.accent} />
                    <View style={[styles.plusBadge, { backgroundColor: colors.success }]}>
                        <Ionicons name="add" size={10} color="#fff" />
                    </View>
                </View>
                
                <Text style={[styles.promptTitle, { color: colors.text }]}>
                    ¿Deseas asignarlo a una ubicación?
                </Text>
                <Text style={[styles.promptSubtitle, { color: colors.textTertiary }]}>
                    Confirma para proceder al mapa de almacén.
                </Text>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Action Buttons */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity 
                    style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                    onPress={handleAssignLocation}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryBtnText}>Sí, asignar ubicación</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>No, cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginTop: 16,
        marginBottom: 12,
        marginLeft: 4,
    },
    articleCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 14,
        gap: 14,
    },
    articleImage: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
    },
    articleInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    articleName: {
        fontSize: 17,
        fontWeight: '700',
    },
    articleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skuText: {
        fontSize: 13,
        fontWeight: '500',
    },
    quantityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    quantityText: {
        fontSize: 13,
        fontWeight: '500',
    },
    lotRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    lotLabel: {
        fontSize: 14,
    },
    lotValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    promptCard: {
        alignItems: 'center',
        padding: 28,
        borderRadius: 16,
        marginTop: 24,
    },
    promptIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    plusBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    promptTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    promptSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        paddingTop: 16,
    },
    primaryBtn: {
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    cancelBtn: {
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
