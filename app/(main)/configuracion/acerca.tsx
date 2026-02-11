import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AcercaScreen() {
  const colors = useThemeColors();

  const LinkItem = ({ 
    icon, 
    label, 
    onPress 
  }: { 
    icon: keyof typeof Ionicons.glyphMap; 
    label: string; 
    onPress: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.linkItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.accent} />
      <Text style={[styles.linkLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo y versión */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>KRKN WMS</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>Versión 1.0.0 (Build 100)</Text>
      </View>

      {/* Descripción */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.description, { color: colors.text }]}>
          KRKN WMS es un sistema de gestión de almacenes moderno y potente que te ayuda a optimizar tus operaciones logísticas.
        </Text>
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>INFORMACIÓN</Text>
        <View style={styles.linksContainer}>
          <LinkItem
            icon="globe-outline"
            label="Sitio web"
            onPress={() => Linking.openURL('https://krkn.mx')}
          />
          <LinkItem
            icon="document-text-outline"
            label="Términos y condiciones"
            onPress={() => {}}
          />
          <LinkItem
            icon="shield-outline"
            label="Política de privacidad"
            onPress={() => {}}
          />
          <LinkItem
            icon="book-outline"
            label="Licencias de código abierto"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Soporte */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SOPORTE</Text>
        <View style={styles.linksContainer}>
          <LinkItem
            icon="help-circle-outline"
            label="Centro de ayuda"
            onPress={() => {}}
          />
          <LinkItem
            icon="chatbubbles-outline"
            label="Contactar soporte"
            onPress={() => {}}
          />
          <LinkItem
            icon="bug-outline"
            label="Reportar un problema"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Redes sociales */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SÍGUENOS</Text>
        <View style={styles.socialContainer}>
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="logo-linkedin" size={24} color="#0077B5" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="logo-instagram" size={24} color="#E4405F" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Copyright */}
      <View style={styles.footer}>
        <Text style={[styles.copyright, { color: colors.textSecondary }]}>
          © 2026 KRKN Technologies
        </Text>
        <Text style={[styles.madeWith, { color: colors.textSecondary }]}>
          Hecho con 💜 en México
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
  },
  descriptionCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
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
  linksContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 4,
  },
  copyright: {
    fontSize: 13,
  },
  madeWith: {
    fontSize: 13,
  },
});
