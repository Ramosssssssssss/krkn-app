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

interface NuevaLineaModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: LineFormData) => void;
}

interface LineFormData {
    nombre: string;
    grupoId: number;
    descripcion: string;
    margen: number;
}

const GROUPS = [
    { id: 1, nombre: 'Construcción', descripcion: 'Infraestructura pesada', icon: 'construct', color: '#0D9488' },
    { id: 2, nombre: 'Soldaduras', descripcion: 'Procesos térmicos', icon: 'flame', color: '#F59E0B' },
    { id: 3, nombre: 'Logística', descripcion: 'Distribución y almacenaje', icon: 'cube', color: '#64748B' },
];

export default function NuevaLineaModal({ visible, onClose, onSave }: NuevaLineaModalProps) {
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();

    const [nombre, setNombre] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const [descripcion, setDescripcion] = useState('');
    const [margen, setMargen] = useState(15);

    const handleSave = () => {
        if (!nombre.trim() || !selectedGroup) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            nombre,
            grupoId: selectedGroup,
            descripcion,
            margen,
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
        setSelectedGroup(null);
        setDescripcion('');
        setMargen(15);
    };

    const incrementMargen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMargen(prev => Math.min(prev + 1, 100));
    };

    const decrementMargen = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMargen(prev => Math.max(prev - 1, 0));
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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva Línea</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.headerBtn, { color: colors.accent, fontWeight: '600' }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* NOMBRE DE LA LÍNEA */}
                    <View style={[styles.inputSection, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.inputLabel, { color: colors.accent }]}>NOMBRE DE LA LÍNEA</Text>
                        <TextInput
                            style={[styles.nameInput, { color: colors.text }]}
                            placeholder="Ej. Línea de Montaje A"
                            placeholderTextColor={colors.textTertiary}
                            value={nombre}
                            onChangeText={setNombre}
                        />
                    </View>

                    {/* ASIGNAR A GRUPO */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ASIGNAR A GRUPO</Text>
                        <View style={[styles.requiredBadge, { backgroundColor: colors.accent }]}>
                            <Text style={styles.requiredText}>Requerido</Text>
                        </View>
                    </View>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        {GROUPS.map((group, index) => (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.groupRow,
                                    index < GROUPS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedGroup(group.id);
                                }}
                            >
                                <View style={[styles.groupIcon, { backgroundColor: `${group.color}15` }]}>
                                    <Ionicons name={group.icon as any} size={18} color={group.color} />
                                </View>
                                <View style={styles.groupInfo}>
                                    <Text style={[styles.groupName, { color: colors.text }]}>{group.nombre}</Text>
                                    <Text style={[styles.groupDesc, { color: colors.textTertiary }]}>{group.descripcion}</Text>
                                </View>
                                <View style={[
                                    styles.radioOuter,
                                    { borderColor: selectedGroup === group.id ? colors.accent : colors.border }
                                ]}>
                                    {selectedGroup === group.id && (
                                        <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* DESCRIPCIÓN */}
                    <View style={[styles.descriptionSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.descHeader}>
                            <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} />
                            <Text style={[styles.descLabel, { color: colors.text }]}>Descripción</Text>
                        </View>
                        <TextInput
                            style={[styles.descInput, { color: colors.text }]}
                            placeholder="Añada detalles operativos, ubicación o notas especiales..."
                            placeholderTextColor={colors.textTertiary}
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* MARGEN SUGERIDO */}
                    <View style={[styles.marginSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.marginHeader}>
                            <View style={[styles.marginIconCircle, { backgroundColor: `${colors.accent}15` }]}>
                                <Ionicons name="cash-outline" size={16} color={colors.accent} />
                            </View>
                            <Text style={[styles.marginLabel, { color: colors.text }]}>Margen Sugerido</Text>
                            <Text style={[styles.marginHint, { color: colors.textTertiary }]}>Utilidad Neta</Text>
                        </View>
                        <View style={styles.marginStepper}>
                            <TouchableOpacity 
                                style={[styles.stepperBtn, { backgroundColor: colors.inputBackground }]}
                                onPress={decrementMargen}
                            >
                                <Ionicons name="remove" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <View style={[styles.marginValue, { borderColor: colors.border }]}>
                                <Text style={[styles.marginNumber, { color: colors.text }]}>{margen}</Text>
                                <Text style={[styles.marginPercent, { color: colors.textTertiary }]}>%</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.stepperBtnAccent, { backgroundColor: colors.accent }]}
                                onPress={incrementMargen}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
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
    scrollContent: { padding: 16 },
    inputSection: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    nameInput: {
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    requiredBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    requiredText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    formSection: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    groupIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupInfo: {
        flex: 1,
        gap: 2,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '500',
    },
    groupDesc: {
        fontSize: 13,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    descriptionSection: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    descHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    descLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    descInput: {
        fontSize: 15,
        minHeight: 60,
        lineHeight: 22,
    },
    marginSection: {
        borderRadius: 12,
        padding: 16,
    },
    marginHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    marginIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    marginLabel: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    marginHint: {
        fontSize: 13,
    },
    marginStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    stepperBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperBtnAccent: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    marginValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 8,
        gap: 4,
    },
    marginNumber: {
        fontSize: 24,
        fontWeight: '600',
    },
    marginPercent: {
        fontSize: 16,
    },
});
