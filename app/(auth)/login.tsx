import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const { companyCode, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const theme = {
    bg: isDark ? '#08050D' : '#FAFAFA',
    surface: isDark ? '#0D0912' : '#FFFFFF',
    border: isDark ? '#1C1326' : '#E5E5E5',
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    textMuted: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    accent: '#9D4EDD',
    accentDark: '#7B2CBF',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const success = await login(email, password);
      if (success) {
        router.replace('/(main)');
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (e) {
      setError('Error al iniciar sesión');
    }

    setIsLoading(false);
  };

  const goBack = () => {
    router.replace('/(auth)/company-code');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.headerBtn, { backgroundColor: theme.inputBg }]} 
          onPress={goBack}
        >
          <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.headerBtn, { backgroundColor: theme.inputBg }]} 
          onPress={toggleTheme}
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Company Initial */}
            <View style={[styles.initialContainer, { borderColor: theme.border }]}>
              <Text style={[styles.initialText, { color: theme.accent }]}>
                {companyCode?.charAt(0).toUpperCase() || 'K'}
              </Text>
            </View>

            <Text style={[styles.companyName, { color: theme.text }]}>
              {companyCode?.toUpperCase() || 'EMPRESA'}
            </Text>
            <Text style={[styles.companyDomain, { color: theme.textMuted }]}>
              {companyCode}.krkn.mx
            </Text>

            <View style={styles.dividerLine}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Bienvenido</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Ingresa tus credenciales
            </Text>

            {/* Card */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Glow line */}
              <LinearGradient
                colors={['transparent', `${theme.accent}60`, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardGlow}
              />

              {/* Email */}
              <View style={[
                styles.inputBox, 
                { 
                  backgroundColor: theme.inputBg,
                  borderColor: focusedField === 'email' 
                    ? theme.accent 
                    : error && !email.trim() 
                      ? '#EF4444' 
                      : theme.border,
                }
              ]}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Correo electrónico"
                  placeholderTextColor={theme.textMuted}
                  value={email}
                  onChangeText={(text) => { setEmail(text); setError(''); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View style={[
                styles.inputBox, 
                { 
                  backgroundColor: theme.inputBg,
                  borderColor: focusedField === 'password' 
                    ? theme.accent 
                    : error && !password.trim() 
                      ? '#EF4444' 
                      : theme.border,
                }
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setError(''); }}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={18} 
                    color={theme.textMuted} 
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: theme.accent }]}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.btn, (!email.trim() || !password.trim() || isLoading) && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={!email.trim() || !password.trim() || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!email.trim() || !password.trim() || isLoading) 
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
                        { color: (!email.trim() || !password.trim()) ? theme.textMuted : '#fff' }
                      ]}>
                        Entrar
                      </Text>
                      <Ionicons 
                        name="arrow-forward" 
                        size={18} 
                        color={(!email.trim() || !password.trim()) ? theme.textMuted : '#fff'} 
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <Text style={[styles.footer, { color: theme.textMuted }]}>© 2026 KRKN Systems</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: { 
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 80,
  },
  content: {
    alignItems: 'center',
  },
  // Company Initial
  initialContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  initialText: {
    fontSize: 28,
    fontWeight: '700',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  companyDomain: {
    fontSize: 12,
    marginBottom: 20,
  },
  dividerLine: {
    width: 40,
    marginBottom: 20,
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  // Card
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
  },
  // Input
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Button
  btn: {
    borderRadius: 10,
    overflow: 'hidden',
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
  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
