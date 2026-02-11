import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NuevoClasificadorModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: ClasificadorFormData) => void;
}

export interface ClasificadorFormData {
    nombre: string;
    codigoCorto: string;
    descripcion: string;
    valores: string[];
    obligatorio: boolean;
}

export default function NuevoClasificadorModal({ visible, onClose, onSave }: NuevoClasificadorModalProps) {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();

    const [nombre, setNombre] = useState('');
    const [codigoCorto, setCodigoCorto] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [valores, setValores] = useState<string[]>(['Nike', 'Adidas']);
    const [obligatorio, setObligatorio] = useState(false);

    const handleSave = () => {
        if (!nombre.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            nombre,
            codigoCorto,
            descripcion,
            valores,
            obligatorio,
        });
        resetForm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setNombre('');
        setCodigoCorto('');
        setDescripcion('');
        setValores(['Nike', 'Adidas']);
        setObligatorio(false);
    };

    const handleDeleteDraft = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        resetForm();
        onClose();
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Crear Clasificador</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.headerBtn, { color: colors.accent, fontWeight: '600' }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* INFORMACIÓN BÁSICA */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>INFORMACIÓN BÁSICA</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabelSmall, { color: colors.textTertiary }]}>Nombre del Clasificador</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="Ej. Categoría Premium"
                                placeholderTextColor={colors.textTertiary}
                                value={nombre}
                                onChangeText={setNombre}
                            />
                        </View>
                        <View style={[styles.formRowHorizontal, { borderBottomColor: colors.border }]}>
                            <View style={styles.codeRowLeft}>
                                <Text style={[styles.fieldLabelSmall, { color: colors.textTertiary }]}>Código Corto</Text>
                                <TextInput
                                    style={[styles.fieldInput, { color: colors.text }]}
                                    placeholder="EJ. CAT-A"
                                    placeholderTextColor={colors.textTertiary}
                                    value={codigoCorto}
                                    onChangeText={setCodigoCorto}
                                    autoCapitalize="characters"
                                />
                            </View>
                            <View style={[styles.infoIcon, { backgroundColor: `${colors.accent}15` }]}>
                                <Ionicons name="information" size={16} color={colors.accent} />
                            </View>
                        </View>
                        <View style={styles.formRowVertical}>
                            <Text style={[styles.fieldLabelSmall, { color: colors.textTertiary }]}>Descripción</Text>
                            <TextInput
                                style={[styles.descInput, { color: colors.text }]}
                                placeholder="Describe el propósito de este clasificador para el equipo de almacén..."
                                placeholderTextColor={colors.textTertiary}
                                value={descripcion}
                                onChangeText={setDescripcion}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        El código corto se utilizará en las etiquetas de estantería.
                    </Text>

                    {/* VALORES ASOCIADOS */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>VALORES ASOCIADOS</Text>
                        <Text style={[styles.sectionBadge, { color: colors.accent }]}>{valores.length} Activos</Text>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        {valores.map((valor, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.valueRow,
                                    index < valores.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                                ]}
                                onPress={() => Haptics.selectionAsync()}
                            >
                                <View style={[styles.valueDot, { backgroundColor: colors.accent }]} />
                                <Text style={[styles.valueText, { color: colors.text }]}>{valor}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity 
                            style={styles.addValueRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Ionicons name="add" size={18} color={colors.accent} />
                            <Text style={[styles.addValueText, { color: colors.accent }]}>Crear Nuevo Valor</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ARTÍCULOS VINCULADOS */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ARTÍCULOS VINCULADOS</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.emptyArticles}>
                            <View style={[styles.emptyIcon, { backgroundColor: colors.inputBackground }]}>
                                <Ionicons name="cube-outline" size={24} color={colors.textTertiary} />
                            </View>
                            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                                Aún no hay artículos vinculados{'\n'}a este clasificador.
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.linkRow, { borderTopColor: colors.border }]}
                            onPress={() => Haptics.selectionAsync()}
                        >
                            <Ionicons name="link" size={18} color={colors.accent} />
                            <Text style={[styles.linkText, { color: colors.accent }]}>Añadir Artículos</Text>
                        </TouchableOpacity>
                    </View>

                    {/* CONFIGURACIÓN */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>CONFIGURACIÓN</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.switchRow}>
                            <View style={[styles.switchIcon, { backgroundColor: colors.inputBackground }]}>
                                <Ionicons name="settings-outline" size={18} color={colors.textTertiary} />
                            </View>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Clasificador Obligatorio</Text>
                            <Switch
                                value={obligatorio}
                                onValueChange={(val) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setObligatorio(val);
                                }}
                                trackColor={{ false: colors.border, true: colors.accent }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                    <Text style={[styles.hint, { color: colors.textTertiary }]}>
                        Si se activa, el operador deberá seleccionar un valor obligatoriamente al crear una entrada.
                    </Text>

                    {/* Delete Draft */}
                    <TouchableOpacity 
                        style={styles.deleteDraft}
                        onPress={handleDeleteDraft}
                    >
                        <Text style={[styles.deleteDraftText, { color: colors.error }]}>Eliminar Borrador</Text>
                    </TouchableOpacity>
                </ScrollView>
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
    scrollContent: { padding: 16, paddingBottom: 40 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 20,
        marginLeft: 4,
    },
    sectionBadge: {
        fontSize: 13,
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
    formRowHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    codeRowLeft: {
        flex: 1,
    },
    infoIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formRowVertical: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    fieldLabelSmall: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    fieldInput: {
        fontSize: 16,
    },
    descInput: {
        fontSize: 15,
        minHeight: 60,
        lineHeight: 22,
    },
    hint: {
        fontSize: 13,
        marginTop: 8,
        marginLeft: 4,
        lineHeight: 18,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    valueDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    valueText: {
        fontSize: 16,
        flex: 1,
    },
    addValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
    },
    addValueText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyArticles: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    switchIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 16,
        flex: 1,
    },
    deleteDraft: {
        alignItems: 'center',
        marginTop: 32,
    },
    deleteDraftText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
