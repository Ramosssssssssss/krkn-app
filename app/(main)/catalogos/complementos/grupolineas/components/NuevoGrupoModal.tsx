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

interface CreateLineGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: LineGroupFormData) => void;
}

interface LineGroupFormData {
    icono: string;
    nombre: string;
    descripcion: string;
    cuentaAlmacen: string;
    cuentaCostoVenta: string;
    cuentaVentas: string;
    cuentaDescuentos: string;
    cuentaDevVentas: string;
    cuentaCompras: string;
    cuentaDevCompras: string;
}

const CATEGORY_ICONS = [
    { id: 'construccion', icon: 'construct', label: 'Construcción', color: '#0D9488' },
    { id: 'cerrajeria', icon: 'key', label: 'Cerrajería', color: '#64748B' },
    { id: 'soldaduras', icon: 'build', label: 'Soldaduras', color: '#64748B' },
    { id: 'general', icon: 'file-tray', label: 'General', color: '#64748B' },
];

export default function CreateLineGroupModal({ visible, onClose, onSave }: CreateLineGroupModalProps) {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();

    const [selectedIcon, setSelectedIcon] = useState('construccion');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [showAccountingModal, setShowAccountingModal] = useState(false);
    const [cuentaAlmacen, setCuentaAlmacen] = useState('');
    const [cuentaCostoVenta, setCuentaCostoVenta] = useState('');
    const [cuentaVentas, setCuentaVentas] = useState('');
    const [cuentaDescuentos, setCuentaDescuentos] = useState('');
    const [cuentaDevVentas, setCuentaDevVentas] = useState('');
    const [cuentaCompras, setCuentaCompras] = useState('');
    const [cuentaDevCompras, setCuentaDevCompras] = useState('');

    const hasAccountingData = cuentaAlmacen || cuentaCostoVenta || cuentaVentas || cuentaDescuentos || cuentaDevVentas || cuentaCompras || cuentaDevCompras;

    const handleSave = () => {
        if (!nombre.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            icono: selectedIcon,
            nombre,
            descripcion,
            cuentaAlmacen,
            cuentaCostoVenta,
            cuentaVentas,
            cuentaDescuentos,
            cuentaDevVentas,
            cuentaCompras,
            cuentaDevCompras,
        });
        resetForm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setSelectedIcon('construccion');
        setNombre('');
        setDescripcion('');
        setCuentaAlmacen('');
        setCuentaCostoVenta('');
        setCuentaVentas('');
        setCuentaDescuentos('');
        setCuentaDevVentas('');
        setCuentaCompras('');
        setCuentaDevCompras('');
    };

    const selectIcon = (iconId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedIcon(iconId);
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Grupo</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.headerBtn, { color: colors.accent, fontWeight: '600' }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ICONO DE CATEGORÍA */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ICONO DE CATEGORÍA</Text>
                    <View style={styles.iconSelector}>
                        {CATEGORY_ICONS.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={styles.iconOption}
                                onPress={() => selectIcon(cat.id)}
                            >
                                <View style={[
                                    styles.iconCircle,
                                    { backgroundColor: selectedIcon === cat.id ? colors.accent : colors.inputBackground }
                                ]}>
                                    <Ionicons 
                                        name={cat.icon as any} 
                                        size={20} 
                                        color={selectedIcon === cat.id ? '#fff' : colors.textTertiary} 
                                    />
                                </View>
                                <Text style={[
                                    styles.iconLabel,
                                    { color: selectedIcon === cat.id ? colors.accent : colors.textTertiary }
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* DETALLES DEL GRUPO */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DETALLES DEL GRUPO</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabelSmall, { color: colors.textTertiary }]}>NOMBRE</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="Nombre del grupo"
                                placeholderTextColor={colors.textTertiary}
                                value={nombre}
                                onChangeText={setNombre}
                            />
                        </View>
                        <View style={styles.formRowVertical}>
                            <Text style={[styles.fieldLabelSmall, { color: colors.textTertiary }]}>DESCRIPCIÓN</Text>
                            <TextInput
                                style={[styles.descInput, { color: colors.text }]}
                                placeholder="Añade una descripción breve para ayudar a identificar este grupo en el inventario..."
                                placeholderTextColor={colors.textTertiary}
                                value={descripcion}
                                onChangeText={setDescripcion}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* INFORMACIÓN CONTABLE */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>INFORMACIÓN CONTABLE</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <TouchableOpacity 
                            style={styles.formRowBetween}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowAccountingModal(true);
                            }}
                        >
                            <View>
                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Cuentas Contables</Text>
                                <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                                    {hasAccountingData ? 'Configurado' : 'Sin configurar'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    {/* Hint */}
                    <Text style={[styles.footerHint, { color: colors.textTertiary }]}>
                        Al crear este grupo, se generará automáticamente un código de referencia interno para la gestión de almacén (WMS).
                    </Text>
                </ScrollView>
            </View>

            {/* Accounting Submenu Modal */}
            <Modal
                visible={showAccountingModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAccountingModal(false)}
            >
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
                        <TouchableOpacity onPress={() => setShowAccountingModal(false)}>
                            <Text style={[styles.headerBtn, { color: colors.accent }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Cuentas Contables</Text>
                        <TouchableOpacity onPress={() => setShowAccountingModal(false)}>
                            <Text style={[styles.headerBtn, { color: colors.accent, fontWeight: '600' }]}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Almacén:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaAlmacen}
                                    onChangeText={setCuentaAlmacen}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Costo de venta:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaCostoVenta}
                                    onChangeText={setCuentaCostoVenta}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Ventas:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaVentas}
                                    onChangeText={setCuentaVentas}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Descuentos sobre ventas:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaDescuentos}
                                    onChangeText={setCuentaDescuentos}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Devolución de ventas:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaDevVentas}
                                    onChangeText={setCuentaDevVentas}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Compras:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaCompras}
                                    onChangeText={setCuentaCompras}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.accountRow}>
                                <Text style={[styles.accountLabel, { color: colors.text }]}>Devolución de compras:</Text>
                                <TextInput
                                    style={[styles.accountInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textTertiary}
                                    value={cuentaDevCompras}
                                    onChangeText={setCuentaDevCompras}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
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
    scrollContent: { padding: 16 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 16,
        marginLeft: 4,
    },
    iconSelector: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    iconOption: {
        alignItems: 'center',
        gap: 6,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    formSection: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    formRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    formRowVertical: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    formRowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabelSmall: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    fieldLabel: { fontSize: 16 },
    fieldInput: {
        fontSize: 18,
        fontWeight: '500',
    },
    descInput: {
        fontSize: 15,
        minHeight: 60,
        lineHeight: 22,
    },
    fieldHint: { fontSize: 13, marginTop: 2 },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    fieldValue: { fontSize: 16, fontWeight: '500' },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    accountLabel: {
        fontSize: 15,
    },
    accountInput: {
        fontSize: 15,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 100,
        textAlign: 'right',
    },
    footerHint: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 16,
        lineHeight: 20,
    },
});
