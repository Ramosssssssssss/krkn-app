import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const videoSource = require('@/assets/video.mp4');

const { width, height } = Dimensions.get('window');

export default function CompanyCodeScreen() {
  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const { setCompanyCode: saveCompanyCode } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Video player
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const openWhatsApp = () => {
    const phoneNumber = '5215512345678';
    const message = 'Hola, me interesa conocer más sobre KRKN WMS';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
    setShowContactModal(false);
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const validateCompanyCode = async () => {
    if (!companyCode.trim()) {
      setError('Ingresa el código de tu empresa');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Consultar API para obtener empresa y sus BDs (usando query string)
      const code = companyCode.trim().toUpperCase();
      const response = await fetch(`https://app.krkn.mx/api/get-databases.php?companyCode=${encodeURIComponent(code)}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.ok && data.databases) {
        // Guardar company code y databases en contexto
        saveCompanyCode(companyCode.trim().toUpperCase(), data.company, data.databases);
        router.push('/(auth)/login');
      } else {
        setError(data.message || 'Código de empresa no encontrado');
      }
    } catch (error) {
      console.error('Error validando empresa:', error);
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setIsLoading(false);
    }

    setIsLoading(false);
  };

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E5E5E5',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />
      
      {/* Video de fondo */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      
      {/* Overlay oscuro sobre el video */}
      <View style={styles.videoOverlay} />
      
      {/* Gradiente de fondo sutil */}
      <LinearGradient
        colors={['rgba(8,5,13,0.7)', 'rgba(13,9,18,0.85)', 'rgba(8,5,13,0.95)']}
        style={StyleSheet.absoluteFill}
      />



      {/* Theme Toggle */}
      <TouchableOpacity 
        style={[styles.themeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} 
        onPress={toggleTheme}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header con branding */}
          <Animated.View 
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={[styles.brand, { color: '#FFFFFF' }]}>KRKN</Text>
            <Text style={[styles.tagline, { color: 'rgba(255,255,255,0.5)' }]}>
              Sistema de gestión de almacenes
            </Text>
          </Animated.View>

          {/* Card principal */}
          <Animated.View 
            style={[
              styles.card,
              { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {/* Borde luminoso superior */}
            <LinearGradient
              colors={['transparent', `${theme.accent}60`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGlow}
            />

            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Ingresa tu código
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Introduce el código único de tu empresa
            </Text>

            {/* Input field */}
            <View style={[
              styles.inputContainer,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderColor: isFocused 
                  ? theme.accent 
                  : error 
                    ? '#EF4444' 
                    : theme.border,
              }
            ]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="mi-empresa"
                placeholderTextColor={theme.textMuted}
                value={companyCode}
                onChangeText={(text) => {
                  setCompanyCode(text.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <View style={[styles.inputDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : theme.border }]} />
              <Text style={[styles.inputSuffix, { color: theme.textMuted }]}>.krkn.mx</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Botón principal */}
            <TouchableOpacity
              style={[styles.btn, (!companyCode.trim() || isLoading) && styles.btnDisabled]}
              onPress={validateCompanyCode}
              disabled={!companyCode.trim() || isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!companyCode.trim() || isLoading) 
                  ? [isDark ? '#1C1326' : '#E5E5E5', isDark ? '#1C1326' : '#E5E5E5']
                  : [theme.accent, theme.accentDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={[
                      styles.btnText,
                      { color: (!companyCode.trim()) ? theme.textMuted : '#fff' }
                    ]}>
                      Continuar
                    </Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={18} 
                      color={(!companyCode.trim()) ? theme.textMuted : '#fff'} 
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Link de ayuda */}
            <TouchableOpacity 
              style={styles.helpLink} 
              onPress={() => setShowContactModal(true)}
            >
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                ¿No tienes código? <Text style={{ color: theme.accent }}>Contáctanos</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Animated.Text 
            style={[
              styles.footer, 
              { color: 'rgba(255,255,255,0.4)', opacity: fadeAnim }
            ]}
          >
            © 2026 KRKN Systems
          </Animated.Text>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Contacto */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView 
            intensity={isDark ? 40 : 60} 
            tint={isDark ? 'dark' : 'light'} 
            style={styles.modalBlur}
          >
            <View style={[
              styles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}>
              <View style={[styles.modalIconContainer, { backgroundColor: `${theme.accent}15` }]}>
                <Ionicons name="chatbubbles-outline" size={28} color={theme.accent} />
              </View>

              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Solicita tu acceso
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Nuestro equipo te ayudará a configurar tu cuenta empresarial
              </Text>

              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.whatsappGradient}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.whatsappText}>Contactar por WhatsApp</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalCloseBtn, { borderColor: theme.border }]} 
                onPress={() => setShowContactModal(false)}
              >
                <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  // Video
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,5,13,0.4)',
  },
  themeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: { 
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 13,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  // Card
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  inputDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 12,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  // Button
  btn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 6,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Help link
  helpLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    fontSize: 12,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 24,
  },
  modalCard: {
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 300,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  whatsappBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  whatsappGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  whatsappText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
