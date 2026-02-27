import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, Image, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { OperadorSamsara } from './types';

interface DriverDetailModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: any;
  operadorSeleccionado: any;
  onAssign: (operador: any) => void;
}

export const DriverDetailModal = ({
  visible,
  onClose,
  colors,
  styles,
  operadorSeleccionado,
  onAssign,
}: DriverDetailModalProps) => {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
         <TouchableOpacity 
           style={{ flex: 1 }} 
           activeOpacity={1} 
           onPress={onClose} 
         />
         <BlurView
           intensity={Platform.OS === 'ios' ? 90 : 100}
           tint={colors.isDark ? 'dark' : 'light'}
           style={[styles.driverDetailSheet, { backgroundColor: colors.surface + "F2" }]}
         >
           <View style={styles.modalHandle} />
           
           {operadorSeleccionado && (operadorSeleccionado as OperadorSamsara).latitud ? (
             <>
               <View style={styles.driverHeader}>
                 <View style={[styles.avatarStats, { backgroundColor: colors.accent + "20" }]}>
                   {(operadorSeleccionado as OperadorSamsara).foto ? (
                     <Image source={{ uri: (operadorSeleccionado as OperadorSamsara).foto! }} style={styles.largeAvatar} />
                   ) : (
                     <Text style={[styles.largeInitial, { color: colors.accent }]}>
                       {operadorSeleccionado.nombre_completo.charAt(0)}
                     </Text>
                   )}
                   <View style={styles.onlineIndicator} />
                 </View>
                 
                 <View style={{ flex: 1 }}>
                   <Text style={[styles.driverNameLarge, { color: colors.text }]}>
                     {operadorSeleccionado.nombre_completo}
                   </Text>
                   <Text style={[styles.driverSubText, { color: colors.textSecondary }]}>
                     Conductor Samsara Live
                   </Text>
                 </View>
               </View>

               <View style={styles.driverStatsGrid}>
                 <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                   <Ionicons name="car-sport" size={20} color={colors.accent} />
                   <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Vehículo</Text>
                   <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                    {(operadorSeleccionado as OperadorSamsara).vehiculo || "No asignado"}
                   </Text>
                 </View>
                 <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                   <Ionicons name="speedometer" size={20} color="#34C759" />
                   <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Velocidad</Text>
                   <Text style={[styles.statValue, { color: colors.text }]}>
                    {(operadorSeleccionado as OperadorSamsara).velocidad} km/h
                   </Text>
                 </View>
                 <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                   <Ionicons name="navigate" size={20} color="#FF9500" />
                   <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Distancia</Text>
                   <Text style={[styles.statValue, { color: colors.text }]}>
                    {(operadorSeleccionado as OperadorSamsara).distancia_km} km
                   </Text>
                 </View>
               </View>

               <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                 <View style={styles.locationHeader}>
                   <Ionicons name="location" size={18} color={colors.accent} />
                   <Text style={[styles.locationTitle, { color: colors.textSecondary }]}>Ubicación Actual</Text>
                 </View>
                 <Text style={[styles.locationText, { color: colors.text }]}>
                   {(operadorSeleccionado as OperadorSamsara).ubicacion || "Buscando ubicación..."}
                 </Text>
               </View>

               <View style={styles.modalActions}>
                 <TouchableOpacity 
                   style={[styles.modalActionBtn, { backgroundColor: colors.accent }]}
                   onPress={() => onAssign(operadorSeleccionado)}
                 >
                    <Text style={styles.modalActionBtnText}>Asignar a esta Ruta</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={[styles.modalActionBtnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                   onPress={onClose}
                 >
                    <Text style={[styles.modalActionBtnTextSecondary, { color: colors.textSecondary }]}>Cerrar Detalle</Text>
                 </TouchableOpacity>
               </View>
             </>
           ) : (
             <View style={{ padding: 40, alignItems: 'center' }}>
               <ActivityIndicator size="large" color={colors.accent} />
               <Text style={{ marginTop: 12, color: colors.textSecondary }}>Cargando datos en tiempo real...</Text>
             </View>
           )}
         </BlurView>
      </View>
    </Modal>
  );
};
