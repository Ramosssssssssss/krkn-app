import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NuevaPrecioModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: PriceListFormData) => void;
}

interface PriceListFormData {
    categoria: string;
    precioUnitario: string;
    moneda: string;
    fechaInicio: string;
    fechaFin: string;
    notas: string;
}

const CURRENCIES = ['MXN', 'USD', 'EUR'];

export default function NuevaPrecioModal({ visible, onClose, onSave }: NuevaPrecioModalProps) {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();

    const [categoria, setCategoria] = useState('');
    const [precioUnitario, setPrecioUnitario] = useState('0.00');
    const [moneda, setMoneda] = useState('MXN');
    const [fechaInicio, setFechaInicio] = useState('Hoy');
    const [fechaFin, setFechaFin] = useState('Indefinido');
    const [notas, setNotas] = useState('');

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            categoria,
            precioUnitario,
            moneda,
            fechaInicio,
            fechaFin,
            notas,
        });
        resetForm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setCategoria('');
        setPrecioUnitario('0.00');
        setMoneda('MXN');
        setFechaInicio('Hoy');
        setFechaFin('Indefinido');
        setNotas('');
    };

    const selectCurrency = (currency: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMoneda(currency);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity onPress={handleCancel}>
                        <Text style={[styles.headerBtn, { color: colors.accent }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva Lista de Precios</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.headerBtn, { color: colors.accent, fontWeight: '600' }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* DETALLES Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="pricetag" size={14} color={colors.accent} />
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DETALLES</Text>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity style={styles.formRow}>
                            <View>
                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Categoría de Precio</Text>
                                <Text style={[styles.fieldPlaceholder, { color: colors.accent }]}>
                                    {categoria || 'Seleccionar categoría...'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    {/* MONTO Y MONEDA Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="wallet" size={14} color={colors.accent} />
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>MONTO Y MONEDA</Text>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.priceRow}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Precio Unitario</Text>
                            <View style={styles.priceInputContainer}>
                                <Text style={[styles.currencySymbol, { color: colors.textTertiary }]}>$</Text>
                                <TextInput
                                    style={[styles.priceInput, { color: colors.text }]}
                                    value={precioUnitario}
                                    onChangeText={setPrecioUnitario}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                        </View>
                        
                        {/* Currency Selector */}
                        <View style={[styles.currencySelector, { backgroundColor: colors.inputBackground }]}>
                            {CURRENCIES.map((curr) => (
                                <TouchableOpacity
                                    key={curr}
                                    style={[
                                        styles.currencyBtn,
                                        moneda === curr && { backgroundColor: colors.surface }
                                    ]}
                                    onPress={() => selectCurrency(curr)}
                                >
                                    <Text style={[
                                        styles.currencyText,
                                        { color: moneda === curr ? colors.text : colors.textTertiary }
                                    ]}>
                                        {curr}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* VIGENCIA Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="calendar" size={14} color={colors.accent} />
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>VIGENCIA</Text>
                        <View style={[styles.optionalBadge, { backgroundColor: colors.inputBackground }]}>
                            <Text style={[styles.optionalText, { color: colors.textTertiary }]}>OPCIONAL</Text>
                        </View>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={[styles.formRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Fecha de Inicio</Text>
                            <Text style={[styles.fieldValue, { color: colors.accent }]}>{fechaInicio}</Text>
                        </View>
                        <View style={styles.formRow}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Fecha de Fin</Text>
                            <Text style={[styles.fieldValue, { color: colors.textTertiary }]}>{fechaFin}</Text>
                        </View>
                    </View>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        Útil para promociones temporales como "Buen Fin" o liquidaciones.
                    </Text>

                    {/* NOTAS Section */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text" size={14} color={colors.accent} />
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NOTAS</Text>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <TextInput
                            style={[styles.notesInput, { color: colors.text }]}
                            placeholder="Escribe detalles adicionales sobre este precio..."
                            placeholderTextColor={colors.textTertiary}
                            value={notas}
                            onChangeText={setNotas}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>

                {/* Save Button */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.saveBtnText}>Guardar Precio</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: { fontSize: 16 },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        marginTop: 16,
        marginLeft: 4,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    optionalBadge: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    optionalText: {
        fontSize: 10,
        fontWeight: '600',
    },
    formSection: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: { fontSize: 16 },
    fieldPlaceholder: { fontSize: 14, marginTop: 2 },
    fieldValue: { fontSize: 16 },
    priceRow: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
    },
    currencySymbol: {
        fontSize: 28,
        marginRight: 4,
    },
    priceInput: {
        fontSize: 36,
        fontWeight: '300',
        minWidth: 100,
    },
    currencySelector: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        padding: 4,
    },
    currencyBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    currencyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        marginTop: 8,
        marginLeft: 4,
        fontStyle: 'italic',
    },
    notesInput: {
        padding: 16,
        fontSize: 15,
        minHeight: 80,
    },
    footer: {
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    saveBtn: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
