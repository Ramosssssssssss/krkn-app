import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ManagerAuthModalProps {
    visible: boolean;
    onClose: () => void;
    onAuthorize: () => void;
    title?: string;
    description?: string;
}

const PIN_LENGTH = 4;
const CORRECT_PIN = "1234"; // PIN de seguridad por defecto

export default function ManagerAuthModal({ 
    visible, 
    onClose, 
    onAuthorize,
    title = "Autorización de Gerencia",
    description = "Ingresa el PIN para cancelar la venta"
}: ManagerAuthModalProps) {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!visible) {
            setPin("");
            setError(false);
        }
    }, [visible]);

    const handlePress = (num: string) => {
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + num;
            setPin(newPin);
            setError(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (newPin.length === PIN_LENGTH) {
                if (newPin === CORRECT_PIN) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(() => {
                        onAuthorize();
                        onClose();
                    }, 300);
                } else {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setError(true);
                    setTimeout(() => {
                        setPin("");
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const renderDot = (index: number) => {
        const isActive = pin.length > index;
        return (
            <View 
                key={index}
                style={[
                    styles.dot, 
                    { 
                        backgroundColor: error 
                            ? colors.error 
                            : isActive 
                                ? colors.primary 
                                : isDark ? '#3A3A3C' : '#E5E5EA' 
                    }
                ]} 
            />
        );
    };

    const renderKey = (val: string | number, index: number) => {
        if (val === '') return <View key={index} style={styles.key} />;
        
        if (val === 'delete') {
            return (
                <TouchableOpacity key="del" style={styles.key} onPress={handleDelete}>
                    <Ionicons name="backspace-outline" size={28} color={colors.text} />
                </TouchableOpacity>
            );
        }
        
        return (
            <TouchableOpacity 
                key={val} 
                style={[styles.key, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} 
                onPress={() => handlePress(val.toString())}
            >
                <Text style={[styles.keyTxt, { color: colors.text }]}>{val}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                
                <View style={[
                    styles.container, 
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }
                ]}>
                    <View style={styles.handle} />
                    
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close-circle" size={32} color={colors.textTertiary + '80'} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>
                    </View>

                    <View style={styles.dotsContainer}>
                        {[...Array(PIN_LENGTH)].map((_, i) => renderDot(i))}
                    </View>

                    <View style={styles.numpad}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'].map((val, i) => renderKey(val, i))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 24,
        alignItems: 'center',
        paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#8888',
        marginBottom: 20,
    },
    closeBtn: {
        position: 'absolute',
        top: 24,
        right: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    desc: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 6,
        opacity: 0.7,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        gap: 24,
    },
    dot: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    numpad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 300,
        justifyContent: 'center',
        gap: 12,
    },
    key: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyTxt: {
        fontSize: 32,
        fontWeight: '500',
    }
});
