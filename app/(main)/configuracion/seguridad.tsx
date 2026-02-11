import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

const FACE_ID_ENABLED_KEY = '@krkn_face_id_enabled';

export default function SeguridadScreen() {
  const colors = useThemeColors();
  const [isFaceIdAvailable, setIsFaceIdAvailable] = useState(false);
  const [isFaceIdEnabled, setIsFaceIdEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceid' | 'touchid' | 'none'>('none');

  useEffect(() => {
    checkBiometricSupport();
    loadFaceIdSetting();
  }, []);

  const checkBiometricSupport = async () => {
    // Para testing, permitir en todas las plataformas
    // En producción, descomentar la restricción de iOS
    // if (Platform.OS !== 'ios') {
    //   setIsFaceIdAvailable(false);
    //   return;
    // }

    if (Platform.OS === 'ios') {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('faceid');
          setIsFaceIdAvailable(true);
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('touchid');
          setIsFaceIdAvailable(true);
        }
      }
    } else {
      // Para testing en Android/Web - simular que Face ID está disponible
      setBiometricType('faceid');
      setIsFaceIdAvailable(true);
    }
  };

  const loadFaceIdSetting = async () => {
    try {
      const value = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);
      setIsFaceIdEnabled(value === 'true');
    } catch (error) {
      console.error('Error loading Face ID setting:', error);
    }
  };

  const handleFaceIdToggle = async (enabled: boolean) => {
    if (enabled) {
      // En iOS, autenticar primero para activar
      if (Platform.OS === 'ios') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: biometricType === 'faceid' ? 'Activa Face ID' : 'Activa Touch ID',
          cancelLabel: 'Cancelar',
          disableDeviceFallback: true,
          fallbackLabel: '',
        });

        if (result.success) {
          setIsFaceIdEnabled(true);
          await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, 'true');
          Alert.alert(
            '¡Activado!', 
            biometricType === 'faceid' 
              ? 'Face ID ha sido activado para iniciar sesión' 
              : 'Touch ID ha sido activado para iniciar sesión'
          );
        } else {
          Alert.alert('Error', 'No se pudo verificar tu identidad');
        }
      } else {
        // Para testing en Android/Web - activar directamente
        setIsFaceIdEnabled(true);
        await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, 'true');
        Alert.alert('¡Activado!', 'Face ID ha sido activado para iniciar sesión (modo testing)');
      }
    } else {
      setIsFaceIdEnabled(false);
      await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, 'false');
    }
  };

  const SecurityItem = ({ 
    icon, 
    label, 
    description, 
    actionLabel,
    onPress 
  }: { 
    icon: keyof typeof Ionicons.glyphMap; 
    label: string; 
    description: string;
    actionLabel: string;
    onPress?: () => void;
  }) => (
    <View style={[styles.securityItem, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.securityContent}>
        <Text style={[styles.securityLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.securityDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.actionButton, { borderColor: colors.border }]}
        onPress={onPress}
      >
        <Text style={[styles.actionButtonText, { color: colors.accent }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header con botón atrás */}
      <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>Atrás</Text>
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Seguridad</Text>
        <View style={styles.backButton} />
      </View>

      {/* Face ID / Touch ID - Solo iOS */}
      {Platform.OS === 'ios' && isFaceIdAvailable && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {biometricType === 'faceid' ? 'FACE ID' : 'TOUCH ID'}
          </Text>
          <View style={[styles.faceIdCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.faceIdHeader}>
              <View style={[styles.faceIdIconContainer, { backgroundColor: colors.accent }]}>
                <Ionicons 
                  name={biometricType === 'faceid' ? 'scan' : 'finger-print'} 
                  size={28} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.faceIdContent}>
                <Text style={[styles.faceIdTitle, { color: colors.text }]}>
                  {biometricType === 'faceid' ? 'Face ID' : 'Touch ID'}
                </Text>
                <Text style={[styles.faceIdDescription, { color: colors.textSecondary }]}>
                  Inicia sesión con {biometricType === 'faceid' ? 'reconocimiento facial' : 'tu huella digital'}
                </Text>
              </View>
              <Switch
                value={isFaceIdEnabled}
                onValueChange={handleFaceIdToggle}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
            {isFaceIdEnabled && (
              <View style={[styles.faceIdStatus, { borderTopColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                <Text style={[styles.faceIdStatusText, { color: '#34C759' }]}>
                  {biometricType === 'faceid' ? 'Face ID activado' : 'Touch ID activado'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Cambiar contraseña */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CONTRASEÑA</Text>
        <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña actual</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nueva contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar contraseña</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>
          <TouchableOpacity 
            style={[styles.updateButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.updateButtonText}>Actualizar contraseña</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Opciones de seguridad */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OPCIONES DE SEGURIDAD</Text>
        <View style={styles.sectionContent}>
          <SecurityItem
            icon="finger-print"
            label="Biométricos"
            description="Usa huella o Face ID para acceder"
            actionLabel="Activar"
          />
          <SecurityItem
            icon="keypad"
            label="PIN de acceso"
            description="Configura un PIN de 4 dígitos"
            actionLabel="Configurar"
          />
          <SecurityItem
            icon="shield-checkmark"
            label="Autenticación 2FA"
            description="Añade una capa extra de seguridad"
            actionLabel="Activar"
          />
        </View>
      </View>

      {/* Sesiones */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SESIONES ACTIVAS</Text>
        <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sessionHeader}>
            <View style={[styles.sessionIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="phone-portrait" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionDevice, { color: colors.text }]}>Este dispositivo</Text>
              <Text style={[styles.sessionDetails, { color: colors.textSecondary }]}>iPhone • Activo ahora</Text>
            </View>
            <View style={[styles.currentBadge, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
              <Text style={[styles.currentBadgeText, { color: '#34C759' }]}>Actual</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cerrar todas las sesiones */}
      <TouchableOpacity 
        style={[styles.logoutAllButton, { backgroundColor: 'rgba(255, 69, 58, 0.1)' }]}
      >
        <Ionicons name="log-out-outline" size={20} color="#FF453A" />
        <Text style={styles.logoutAllText}>Cerrar todas las sesiones</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  faceIdCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faceIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  faceIdIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIdContent: {
    flex: 1,
  },
  faceIdTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  faceIdDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  faceIdStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  faceIdStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  updateButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityContent: {
    flex: 1,
  },
  securityLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  securityDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  currentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  logoutAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF453A',
  },
});
