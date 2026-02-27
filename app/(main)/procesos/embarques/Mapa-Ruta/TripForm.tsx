import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TripFormProps {
  colors: any;
  styles: any;
  insets: any;
  nombreRuta: string;
  setNombreRuta: (text: string) => void;
  operadorSeleccionado: any;
  setShowOperadorModal: (visible: boolean) => void;
  selectedDate: Date;
  setShowCalendarModal: (visible: boolean) => void;
  comentarios: string;
  setComentarios: (text: string) => void;
  guardando: boolean;
  onGenerate: () => void;
  numParadas: number;
}

export const TripForm = ({
  colors,
  styles,
  insets,
  nombreRuta,
  setNombreRuta,
  operadorSeleccionado,
  setShowOperadorModal,
  selectedDate,
  setShowCalendarModal,
  comentarios,
  setComentarios,
  guardando,
  onGenerate,
  numParadas,
}: TripFormProps) => {
  return (
    <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.formHandleContainer}>
        <View style={[styles.formHandle, { backgroundColor: colors.border }]} />
      </View>
      
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Detalles del Viaje</Text>

        {/* Nombre Ruta */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Identificador</Text>
          <View style={[styles.formInputWrapper, { backgroundColor: colors.background }]}>
            <Ionicons name="bookmark-outline" size={18} color={colors.accent} />
            <TextInput
              style={[styles.formInputText, { color: colors.text }]}
              value={nombreRuta}
              onChangeText={setNombreRuta}
              placeholder="Ej. Ruta Norte Mañana"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Operador */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Conductor Asignado</Text>
          <TouchableOpacity
            onPress={() => setShowOperadorModal(true)}
            activeOpacity={0.7}
            style={[styles.formInputWrapper, { backgroundColor: colors.background }]}
          >
            <Ionicons name="person-outline" size={18} color={colors.accent} />
            <Text
              style={[
                styles.formInputText,
                { color: operadorSeleccionado ? colors.text : colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {operadorSeleccionado?.nombre_completo ?? "Seleccionar operador..."}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Fecha */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Fecha de Operación</Text>
          <TouchableOpacity
            onPress={() => setShowCalendarModal(true)}
            activeOpacity={0.7}
            style={[styles.formInputWrapper, { backgroundColor: colors.background }]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={[styles.formInputText, { color: colors.text }]}>
              {selectedDate.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Comentarios */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Observaciones</Text>
          <View style={[styles.formInputMulti, { backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.formInputText, { color: colors.text, minHeight: 60 }]}
              value={comentarios}
              onChangeText={setComentarios}
              placeholder="Notas adicionales..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          </View>
        </View>

        {/* Botón Crear */}
        <TouchableOpacity
          onPress={() => {
            if (!operadorSeleccionado) {
              Alert.alert(
                "Ruta sin Conductor",
                "No has seleccionado un conductor. ¿Deseas crear esta ruta como 'Disponible' para que un operador la tome después?",
                [
                  { text: "Cancelar", style: "cancel" },
                  { 
                    text: "SÍ, CREAR DISPONIBLE", 
                    onPress: onGenerate 
                  },
                ]
              );
              return;
            }

            Alert.alert(
              "Confirmar Envío",
              `¿Deseas crear el pre-embarque con ${numParadas} paradas asignado a ${operadorSeleccionado.nombre_completo}?`,
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "SÍ, CREAR",
                  onPress: onGenerate,
                },
              ]
            );
          }}
          disabled={guardando}
          activeOpacity={0.8}
          style={styles.createBtn}
        >
          <LinearGradient
            colors={[colors.accent, colors.accent + "DD"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.createBtnGrad}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Generar Pre-Embarque</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
};
