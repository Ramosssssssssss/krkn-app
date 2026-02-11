import { useTheme, useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Articulo {
  id: number;
  nombre: string;
  sku: string;
  ubicacion: string;
  cantidad: number;
  imagen: string;
  categoria: string;
}

type ReasonCode = 'Resurtido' | 'Daño' | 'Devolución' | 'Error';

interface StockAdjustmentModalProps {
    visible: boolean;
    articulo: Articulo | null;
    onClose: () => void;
    onConfirm: (qty: number, reason: string) => void;
}

export default function StockAdjustmentModal({ visible, articulo, onClose, onConfirm }: StockAdjustmentModalProps) {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [physicalQty, setPhysicalQty] = useState(0);
    const [reasonCode, setReasonCode] = useState<ReasonCode>('Resurtido');

    useEffect(() => {
        if (articulo) {
            setPhysicalQty(articulo.cantidad);
            setReasonCode('Resurtido');
        }
    }, [articulo]);

    if (!articulo) return null;

    const difference = physicalQty - articulo.cantidad;

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirm(physicalQty, reasonCode);
    };

    const reasons: ReasonCode[] = ['Resurtido', 'Daño', 'Devolución', 'Error'];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                
                {/* iOS Native Header */}
                <View style={[
                   styles.header, 
                   { 
                     borderBottomColor: colors.border,
                     paddingTop: Math.max(insets.top, 16)
                   }
                ]}>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={[styles.headerAction, { color: colors.accent }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Ajuste</Text>
                    <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text style={[styles.headerAction, styles.headerActionBold, { color: colors.accent }]}>Listo</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.content}
                >
                    {/* Product Card */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <Image source={{ uri: articulo.imagen }} style={styles.productImage} />
                        <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                                {articulo.nombre}
                            </Text>
                            <Text style={[styles.productSku, { color: colors.textTertiary }]}>
                                {articulo.sku} · {articulo.ubicacion}
                            </Text>
                        </View>
                    </View>

                    {/* Quantity Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CANTIDAD</Text>
                        <View style={[styles.card, { backgroundColor: colors.surface }]}>
                            {/* System Count */}
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>En sistema</Text>
                                <Text style={[styles.countValue, { color: colors.textTertiary }]}>{articulo.cantidad}</Text>
                            </View>
                            
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            
                            {/* Physical Count Stepper */}
                            <View style={styles.stepperRow}>
                                <Text style={[styles.countLabel, { color: colors.text }]}>Conteo físico</Text>
                                <View style={styles.stepper}>
                                    <TouchableOpacity 
                                        style={[styles.stepperBtn, { backgroundColor: colors.inputBackground }]}
                                        onPress={() => {
                                            setPhysicalQty(prev => Math.max(0, prev - 1));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="remove" size={20} color={colors.text} />
                                    </TouchableOpacity>
                                    <Text style={[styles.stepperValue, { color: colors.text }]}>{physicalQty}</Text>
                                    <TouchableOpacity 
                                        style={[styles.stepperBtn, { backgroundColor: colors.inputBackground }]}
                                        onPress={() => {
                                            setPhysicalQty(prev => prev + 1);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="add" size={20} color={colors.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            {/* Difference */}
                            <View style={styles.countRow}>
                                <Text style={[styles.countLabel, { color: colors.textSecondary }]}>Diferencia</Text>
                                <Text style={[
                                    styles.countValue, 
                                    { color: difference > 0 ? colors.success : difference < 0 ? colors.error : colors.textTertiary }
                                ]}>
                                    {difference > 0 ? '+' : ''}{difference}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Reason Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MOTIVO</Text>
                        <View style={[styles.segmentedContainer, { backgroundColor: colors.inputBackground }]}>
                            {reasons.map((reason) => {
                                const isSelected = reasonCode === reason;
                                return (
                                    <TouchableOpacity
                                        key={reason}
                                        style={[
                                            styles.segment,
                                            isSelected && [styles.segmentSelected, { backgroundColor: colors.surface }]
                                        ]}
                                        onPress={() => {
                                            setReasonCode(reason);
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <Text style={[
                                            styles.segmentText,
                                            { color: isSelected ? colors.text : colors.textTertiary }
                                        ]}>
                                            {reason}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                        style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                        onPress={handleConfirm}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmButtonText}>Confirmar Ajuste</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingTop: Platform.OS === 'ios' ? 16 : 20,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { 
        fontSize: 17, 
        fontWeight: '600' 
    },
    headerAction: { 
        fontSize: 17 
    },
    headerActionBold: { 
        fontWeight: '600' 
    },
    content: { 
        padding: 16, 
        paddingBottom: 120 
    },
    section: { 
        marginTop: 24 
    },
    sectionLabel: { 
        fontSize: 13, 
        fontWeight: '500', 
        marginBottom: 8, 
        marginLeft: 16,
        letterSpacing: 0.5
    },
    card: { 
        borderRadius: 12, 
        padding: 16 
    },
    productImage: { 
        width: 60, 
        height: 60, 
        borderRadius: 8, 
        marginBottom: 12 
    },
    productInfo: { 
        gap: 4 
    },
    productName: { 
        fontSize: 17, 
        fontWeight: '600' 
    },
    productSku: { 
        fontSize: 15 
    },
    countRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 4
    },
    countLabel: { 
        fontSize: 17 
    },
    countValue: { 
        fontSize: 17, 
        fontWeight: '500' 
    },
    divider: { 
        height: StyleSheet.hairlineWidth, 
        marginVertical: 12 
    },
    stepperRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingVertical: 4
    },
    stepper: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 16 
    },
    stepperBtn: { 
        width: 32, 
        height: 32, 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    stepperValue: { 
        fontSize: 20, 
        fontWeight: '600', 
        minWidth: 40, 
        textAlign: 'center' 
    },
    segmentedContainer: { 
        flexDirection: 'row', 
        borderRadius: 10, 
        padding: 2 
    },
    segment: { 
        flex: 1, 
        paddingVertical: 10, 
        alignItems: 'center', 
        borderRadius: 8 
    },
    segmentSelected: { 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2, 
        elevation: 2 
    },
    segmentText: { 
        fontSize: 13, 
        fontWeight: '500' 
    },
    footer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: 16, 
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: StyleSheet.hairlineWidth
    },
    confirmButton: { 
        height: 50, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    confirmButtonText: { 
        color: '#fff', 
        fontSize: 17, 
        fontWeight: '600' 
    },
});
