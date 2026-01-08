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
    View
} from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDatabaseSelector, setShowDatabaseSelector] = useState(false);
  
  const { companyCode, company, databases, selectedDatabase, selectDatabase, login } = useAuth();
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
    if (!username.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    if (!selectedDatabase) {
      setError('Selecciona una base de datos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://app.krkn.mx/api/login.php?companyCode=${companyCode}&databaseId=${selectedDatabase.id}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.ok) {
        // Guardar usuario y token en el contexto
        await login(data.user, data.token, data.database);
        router.replace('/(main)');
      } else {
        setError(data.message || 'Credenciales incorrectas');
      }
    } catch (e) {
      console.error('Error en login:', e);
      setError('Error de conexión. Verifica tu internet.');
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

            {/* Database Selector */}
            {databases && databases.length > 0 && (
              <TouchableOpacity
                style={[styles.databaseSelector, { 
                  backgroundColor: theme.surface, 
                  borderColor: selectedDatabase ? theme.accent : theme.border 
                }]}
                onPress={() => setShowDatabaseSelector(true)}
              >
                <View style={styles.databaseInfo}>
                  <Ionicons name="server-outline" size={20} color={selectedDatabase ? theme.accent : theme.textMuted} />
                  <View style={styles.databaseText}>
                    <Text style={[styles.databaseLabel, { color: theme.textMuted }]}>Base de datos</Text>
                    <Text style={[styles.databaseName, { color: theme.text }]}>
                      {selectedDatabase ? selectedDatabase.nombre : 'Selecciona una base de datos'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            )}

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

              {/* Username */}
              <View style={[
                styles.inputBox, 
                { 
                  backgroundColor: theme.inputBg,
                  borderColor: focusedField === 'username' 
                    ? theme.accent 
                    : error && !username.trim()
                      ? '#EF4444' 
                      : theme.border,
                }
              ]}>
                <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Usuario"
                  placeholderTextColor={theme.textMuted}
                  value={username}
                  onChangeText={(text) => { setUsername(text); setError(''); }}
                  autoCapitalize="characters"
                  editable={!isLoading}
                  onFocus={() => setFocusedField('username')}
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
                style={[styles.btn, (!username.trim() || !password.trim() || isLoading) && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={!username.trim() || !password.trim() || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!username.trim() || !password.trim() || isLoading) 
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
                        { color: (!username.trim() || !password.trim()) ? theme.textMuted : '#fff' }
                      ]}>
                        Entrar
                      </Text>
                      <Ionicons 
                        name="arrow-forward" 
                        size={18} 
                        color={(!username.trim() || !password.trim()) ? theme.textMuted : '#fff'} 
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

      {/* Database Selector Modal */}
      {showDatabaseSelector && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowDatabaseSelector(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Selecciona una base de datos</Text>
              <TouchableOpacity onPress={() => setShowDatabaseSelector(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.databaseList}>
              {databases.map((db) => (
                <TouchableOpacity
                  key={db.id}
                  style={[
                    styles.databaseItem,
                    { 
                      backgroundColor: selectedDatabase?.id === db.id ? `${theme.accent}15` : theme.inputBg,
                      borderColor: selectedDatabase?.id === db.id ? theme.accent : theme.border,
                    }
                  ]}
                  onPress={() => {
                    selectDatabase(db);
                    setShowDatabaseSelector(false);
                  }}
                >
                  <View style={styles.databaseItemContent}>
                    <Ionicons 
                      name={selectedDatabase?.id === db.id ? "radio-button-on" : "radio-button-off"} 
                      size={22} 
                      color={selectedDatabase?.id === db.id ? theme.accent : theme.textMuted} 
                    />
                    <View style={styles.databaseItemText}>
                      <Text style={[styles.dbName, { color: theme.text }]}>{db.nombre}</Text>
                      <Text style={[styles.dbServer, { color: theme.textMuted }]}>
                        {db.ip_servidor}:{db.puerto_bd}
                      </Text>
                    </View>
                  </View>
                  {selectedDatabase?.id === db.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  // Database Selector
  databaseSelector: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  databaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  databaseText: {
    flex: 1,
  },
  databaseLabel: {
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  databaseName: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  databaseList: {
    maxHeight: 400,
  },
  databaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  databaseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  databaseItemText: {
    flex: 1,
  },
  dbName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  dbServer: {
    fontSize: 12,
  },
});
