import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface ScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

export default function ScannerModal({ visible, onClose, onScan }: ScannerModalProps) {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            checkPermissions();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
                ])
            ).start();
        } else {
            scanLineAnim.setValue(0);
        }
    }, [visible]);

    const checkPermissions = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para escanear.');
                onClose();
            }
        }
    };

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onScan(data);
    };

    const translateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 200],
    });

    const handleFlash = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                
                {/* Real Camera Surface */}
                {visible && permission?.granted && (
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
                        }}
                    />
                )}
                <View style={styles.overlay} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={styles.headerBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Escanear</Text>
                    <TouchableOpacity 
                        onPress={handleFlash} 
                        style={styles.headerBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="flashlight-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Viewfinder */}
                <View style={styles.viewfinderArea}>
                    <View style={styles.viewfinder}>
                        <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
                        <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
                        <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
                        <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />
                        <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                    </View>
                    <Text style={styles.hintText}>Alinea el código de barras dentro del marco</Text>
                </View>


            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#000' 
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { 
        color: '#fff', 
        fontSize: 17, 
        fontWeight: '600' 
    },
    viewfinderArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    viewfinder: { 
        width: 200, 
        height: 200,
        position: 'relative',
    },
    corner: { 
        width: 32, 
        height: 32, 
        position: 'absolute' 
    },
    topLeft: { 
        top: 0, 
        left: 0, 
        borderTopWidth: 3, 
        borderLeftWidth: 3, 
        borderTopLeftRadius: 12 
    },
    topRight: { 
        top: 0, 
        right: 0, 
        borderTopWidth: 3, 
        borderRightWidth: 3, 
        borderTopRightRadius: 12 
    },
    bottomLeft: { 
        bottom: 0, 
        left: 0, 
        borderBottomWidth: 3, 
        borderLeftWidth: 3, 
        borderBottomLeftRadius: 12 
    },
    bottomRight: { 
        bottom: 0, 
        right: 0, 
        borderBottomWidth: 3, 
        borderRightWidth: 3, 
        borderBottomRightRadius: 12 
    },
    scanLine: { 
        height: 2, 
        backgroundColor: '#FF3B30', 
        width: '100%', 
        position: 'absolute',
    },
    hintText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        fontWeight: '400',
    },
    bottomPanel: { 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        padding: 16, 
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    section: {
        marginBottom: 16,
    },
    sectionLabel: { 
        fontSize: 13, 
        fontWeight: '500', 
        marginBottom: 8, 
        marginLeft: 16,
        letterSpacing: 0.5
    },
    card: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        borderRadius: 12,
        gap: 12,
    },
    productIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    productInfo: { 
        flex: 1,
        gap: 2,
    },
    productName: { 
        fontSize: 15, 
        fontWeight: '600',
    },
    productSku: {
        fontSize: 13,
    },
    statusBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    manualButton: { 
        height: 50, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    manualButtonText: { 
        color: '#fff', 
        fontSize: 17, 
        fontWeight: '600' 
    },
});
