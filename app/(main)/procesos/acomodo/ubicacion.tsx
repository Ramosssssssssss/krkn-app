import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ArticleData {
    id: string;
    name: string;
    sku: string;
    batch: string;
    image: string;
}

interface AssignedLocation {
    id: string;
    code: string;
    zone: string;
    quantity: number;
    completed: boolean;
}

// Mock data
const MOCK_ARTICLE: ArticleData = {
    id: '1',
    name: 'Válvula Hidráulica Premium',
    sku: 'SKU-9821-X',
    batch: '#9821-A',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
};

const MOCK_LOCATIONS: AssignedLocation[] = [
    { id: '1', code: 'B-12-04', zone: 'Zona de Alta Rotación', quantity: 10, completed: true },
    { id: '2', code: 'C-05-01', zone: 'Zona de Picking', quantity: 5, completed: true },
];

// SwipeButton Component
interface SwipeButtonProps {
    onConfirm: () => void;
    colors: ReturnType<typeof useThemeColors>;
    paddingBottom: number;
}

function SwipeButton({ onConfirm, colors, paddingBottom }: SwipeButtonProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = useState(300); // Default initial width
    const thumbSize = 52;
    const padding = 4;
    const maxSwipe = Math.max(containerWidth - thumbSize - padding * 2, 100); // Ensure positive
    const maxSwipeRef = useRef(maxSwipe);
    maxSwipeRef.current = maxSwipe;
    
    const opacity = translateX.interpolate({
        inputRange: [0, maxSwipe * 0.5, maxSwipe],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    const panResponder = React.useMemo(() =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
            onPanResponderMove: (_, gesture) => {
                const newValue = Math.max(0, Math.min(gesture.dx, maxSwipeRef.current));
                translateX.setValue(newValue);
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx >= maxSwipeRef.current * 0.7) {
                    Animated.spring(translateX, {
                        toValue: maxSwipeRef.current,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 8,
                    }).start(() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onConfirm();
                    });
                } else {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 60,
                        friction: 10,
                    }).start();
                }
            },
        }),
    [translateX, onConfirm]);

    return (
        <View style={[swipeStyles.container, { paddingBottom }]}>
            <View 
                style={[swipeStyles.track, { backgroundColor: colors.accent }]}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                <Animated.Text style={[swipeStyles.text, { opacity }]}>
                    Confirmar Acomodo →
                </Animated.Text>
                <Animated.View
                    style={[
                        swipeStyles.thumb,
                        { transform: [{ translateX }] }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={[swipeStyles.thumbInner, { backgroundColor: colors.accent }]}>
                        <Ionicons name="arrow-forward" size={22} color="#fff" />
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const swipeStyles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    track: {
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    thumb: {
        position: 'absolute',
        left: 4,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    thumbInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default function UbicacionScreen() {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [showManualInput, setShowManualInput] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleScanLocation = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Open camera scanner
    };

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
        
        setTimeout(() => {
            setShowSuccess(false);
            router.replace('/procesos');
        }, 2000);
    };

    const totalPlaced = MOCK_LOCATIONS.reduce((sum, loc) => sum + loc.quantity, 0);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity 
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.accent} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Acomodo de Material</Text>
                <TouchableOpacity>
                    <Text style={[styles.headerAction, { color: colors.accent }]}>Ayuda</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Product Card */}
                <View style={[styles.productCard, { backgroundColor: colors.surface }]}>
                    <Image 
                        source={{ uri: MOCK_ARTICLE.image }} 
                        style={styles.productImage}
                    />
                    <View style={styles.productInfo}>
                        <View style={[styles.batchBadge, { backgroundColor: `${colors.accent}15` }]}>
                            <Text style={[styles.batchText, { color: colors.accent }]}>BATCH {MOCK_ARTICLE.batch}</Text>
                        </View>
                        <Text style={[styles.productSku, { color: colors.text }]}>{MOCK_ARTICLE.sku}</Text>
                        <Text style={[styles.productName, { color: colors.textTertiary }]}>{MOCK_ARTICLE.name}</Text>
                    </View>
                </View>

                {/* Scan Location Section */}
                <TouchableOpacity 
                    style={[styles.scanSection, { backgroundColor: colors.surface }]}
                    onPress={handleScanLocation}
                    activeOpacity={0.7}
                >
                    <View style={[styles.scanIcon, { backgroundColor: `${colors.accent}10` }]}>
                        <Ionicons name="qr-code" size={32} color={colors.accent} />
                    </View>
                    <Text style={[styles.scanTitle, { color: colors.text }]}>Escanear Ubicación</Text>
                    <TouchableOpacity onPress={() => setShowManualInput(!showManualInput)}>
                        <Text style={[styles.scanManual, { color: colors.textTertiary }]}>O ingresar código manualmente</Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Manual Input */}
                {showManualInput && (
                    <View style={[styles.manualInput, { backgroundColor: colors.surface }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Ingresa código (ej. B-12-04)"
                            placeholderTextColor={colors.textTertiary}
                            value={manualCode}
                            onChangeText={setManualCode}
                            autoCapitalize="characters"
                        />
                    </View>
                )}

                {/* Assigned Locations */}
                <View style={styles.locationsHeader}>
                    <Text style={[styles.locationsTitle, { color: colors.textTertiary }]}>UBICACIONES ASIGNADAS</Text>
                    <View style={[styles.placedBadge, { backgroundColor: `${colors.accent}15` }]}>
                        <Text style={[styles.placedText, { color: colors.accent }]}>{totalPlaced} Colocados</Text>
                    </View>
                </View>

                <View style={[styles.locationsList, { backgroundColor: colors.surface }]}>
                    {MOCK_LOCATIONS.map((location, index) => (
                        <View 
                            key={location.id}
                            style={[
                                styles.locationRow,
                                index < MOCK_LOCATIONS.length - 1 && { 
                                    borderBottomWidth: StyleSheet.hairlineWidth, 
                                    borderBottomColor: colors.border 
                                }
                            ]}
                        >
                            <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                            <View style={styles.locationInfo}>
                                <Text style={[styles.locationCode, { color: colors.text }]}>{location.code}</Text>
                                <Text style={[styles.locationZone, { color: colors.textTertiary }]}>{location.zone}</Text>
                            </View>
                            <Text style={[styles.locationQty, { color: colors.text }]}>{location.quantity} pzs</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Swipe to Confirm Button */}
            <SwipeButton 
                onConfirm={handleConfirm}
                colors={colors}
                paddingBottom={insets.bottom + 16}
            />

            {/* Success Modal */}
            <Modal
                visible={showSuccess}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.successModal, { backgroundColor: colors.surface }]}>
                        <View style={[styles.successIcon, { backgroundColor: `${colors.success}15` }]}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                        </View>
                        <Text style={[styles.successTitle, { color: colors.text }]}>¡Acomodo Completado!</Text>
                        <Text style={[styles.successSubtitle, { color: colors.textTertiary }]}>
                            El material ha sido ubicado correctamente.
                        </Text>
                    </View>
                </View>
            </Modal>
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
        paddingBottom: 12,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    headerAction: {
        fontSize: 16,
    },
    scrollView: { flex: 1 },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    // Product Card
    productCard: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 12,
        gap: 14,
        marginBottom: 16,
    },
    productImage: {
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: '#e0e0e0',
    },
    productInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
    },
    batchBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 2,
    },
    batchText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    productSku: {
        fontSize: 18,
        fontWeight: '700',
    },
    productName: {
        fontSize: 14,
    },
    // Scan Section
    scanSection: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    scanIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    scanTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    scanManual: {
        fontSize: 14,
    },
    manualInput: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        marginTop: -16,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 16,
    },
    // Locations
    locationsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    locationsTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    placedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    placedText: {
        fontSize: 12,
        fontWeight: '600',
    },
    locationsList: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationInfo: {
        flex: 1,
        gap: 2,
    },
    locationCode: {
        fontSize: 16,
        fontWeight: '600',
    },
    locationZone: {
        fontSize: 13,
    },
    locationQty: {
        fontSize: 15,
        fontWeight: '500',
    },
    // Swipe Button
    swipeContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    swipeTrack: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingLeft: 60,
    },
    swipeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    swipeThumb: {
        position: 'absolute',
        left: 4,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    // Success Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successModal: {
        width: '100%',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
});
