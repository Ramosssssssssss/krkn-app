import { useTheme, useThemeColors } from '@/context/theme-context';
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

interface CreateWarehouseModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: WarehouseFormData) => void;
}

interface WarehouseFormData {
    name: string;
    code: string;
    type: string;
    street: string;
    city: string;
    zip: string;
    totalSlots: number;
}

const WAREHOUSE_TYPES = [
    'Centro de Distribución',
    'Hub Logístico',
    'Almacén de Almacenamiento',
    'Cross-Dock',
    'Cámara de Frío',
];

export default function CreateWarehouseModal({ visible, onClose, onSave }: CreateWarehouseModalProps) {
    const colors = useThemeColors();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [code, setCode] = useState('ALM-');
    const [type, setType] = useState('Centro de Distribución');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [totalSlots, setTotalSlots] = useState('0');
    const [showTypePicker, setShowTypePicker] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({
            name,
            code,
            type,
            street,
            city,
            zip,
            totalSlots: parseInt(totalSlots) || 0,
        });
        resetForm();
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setName('');
        setCode('ALM-');
        setType('Centro de Distribución');
        setStreet('');
        setCity('');
        setZip('');
        setTotalSlots('0');
    };

    const handleUseLocation = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Get current location
    };

    const handleAddPhoto = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // TODO: Open image picker
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
                        <Text style={[styles.cancelText, { color: colors.accent }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Almacén</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.saveText, { color: colors.accent }]}>Guardar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Photo Upload */}
                    <TouchableOpacity 
                        style={[styles.photoUpload, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={handleAddPhoto}
                    >
                        <View style={[styles.cameraIcon, { backgroundColor: `${colors.accent}15` }]}>
                            <Ionicons name="camera" size={28} color={colors.accent} />
                        </View>
                        <Text style={[styles.photoText, { color: colors.accent }]}>Agregar Foto del Almacén</Text>
                        <Text style={[styles.photoHint, { color: colors.textTertiary }]}>o escanear plano</Text>
                    </TouchableOpacity>

                    {/* General Info Section */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>INFORMACIÓN GENERAL</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Nombre</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="ej. Hub Logístico Norte"
                                placeholderTextColor={colors.textTertiary}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Código</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text, textAlign: 'right' }]}
                                placeholder="ALM-"
                                placeholderTextColor={colors.textTertiary}
                                value={code}
                                onChangeText={setCode}
                                autoCapitalize="characters"
                            />
                        </View>
                        <TouchableOpacity 
                            style={styles.formRow}
                            onPress={() => setShowTypePicker(!showTypePicker)}
                        >
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
                            <View style={styles.typeSelector}>
                                <Text style={[styles.typeText, { color: colors.accent }]}>{type}</Text>
                                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Type Picker */}
                    {showTypePicker && (
                        <View style={[styles.typePicker, { backgroundColor: colors.surface }]}>
                            {WAREHOUSE_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeOption, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setType(t);
                                        setShowTypePicker(false);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Text style={[styles.typeOptionText, { color: colors.text }]}>{t}</Text>
                                    {type === t && (
                                        <Ionicons name="checkmark" size={20} color={colors.accent} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Address Section */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DIRECCIÓN</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Calle</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="Dirección de calle"
                                placeholderTextColor={colors.textTertiary}
                                value={street}
                                onChangeText={setStreet}
                            />
                        </View>
                        <View style={[styles.formRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>Ciudad</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="Nombre de ciudad"
                                placeholderTextColor={colors.textTertiary}
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                        <View style={styles.formRow}>
                            <Text style={[styles.fieldLabel, { color: colors.text }]}>C.P.</Text>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text }]}
                                placeholder="Código Postal"
                                placeholderTextColor={colors.textTertiary}
                                value={zip}
                                onChangeText={setZip}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Use Current Location */}
                    <TouchableOpacity style={styles.locationBtn} onPress={handleUseLocation}>
                        <Ionicons name="location" size={16} color={colors.accent} />
                        <Text style={[styles.locationText, { color: colors.accent }]}>Usar Ubicación Actual</Text>
                    </TouchableOpacity>

                    {/* Capacity Section */}
                    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>CAPACIDAD</Text>
                    <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                        <View style={styles.formRow}>
                            <View>
                                <Text style={[styles.fieldLabel, { color: colors.text }]}>Total de Slots</Text>
                                <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>Posiciones de tarima</Text>
                            </View>
                            <TextInput
                                style={[styles.fieldInput, { color: colors.text, textAlign: 'right', fontSize: 18, fontWeight: '700' }]}
                                placeholder="0"
                                placeholderTextColor={colors.textTertiary}
                                value={totalSlots}
                                onChangeText={setTotalSlots}
                                keyboardType="number-pad"
                            />
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
    cancelText: { fontSize: 16 },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    saveText: { fontSize: 16, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    photoUpload: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    cameraIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    photoText: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
    photoHint: { fontSize: 13 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    formSection: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fieldLabel: { fontSize: 16 },
    fieldInput: { flex: 1, fontSize: 16, marginLeft: 16 },
    fieldHint: { fontSize: 12, marginTop: 2 },
    typeSelector: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    typeText: { fontSize: 16 },
    typePicker: {
        borderRadius: 12,
        marginBottom: 16,
        marginTop: -8,
        overflow: 'hidden',
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    typeOptionText: { fontSize: 16 },
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
        marginLeft: 4,
    },
    locationText: { fontSize: 14, fontWeight: '500' },
});
