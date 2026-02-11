import { Language, useLanguage } from '@/context/language-context';
import { useThemeColors } from '@/context/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇲🇽',
    region: 'México',
  },
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    region: 'United States',
  },
];

export default function IdiomaScreen() {
  const colors = useThemeColors();
  const { language, setLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = selectedLanguage !== language;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setLanguage(selectedLanguage);
      
      Alert.alert(
        t('language.saved'),
        t('language.savedDesc'),
        [{ text: t('general.ok') }]
      );
    } catch (error) {
      console.log('Error saving language:', error);
      Alert.alert(t('general.error'), 'No se pudo guardar el idioma');
    } finally {
      setIsSaving(false);
    }
  };

  const LanguageCard = ({ language }: { language: LanguageOption }) => {
    const isSelected = selectedLanguage === language.id;

    return (
      <TouchableOpacity
        style={[
          styles.languageCard,
          { 
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.accent : colors.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => setSelectedLanguage(language.id)}
        activeOpacity={0.7}
      >
        <View style={styles.languageFlag}>
          <Text style={styles.flagEmoji}>{language.flag}</Text>
        </View>
        
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, { color: colors.text }]}>
            {language.nativeName}
          </Text>
          <Text style={[styles.languageRegion, { color: colors.textSecondary }]}>
            {language.name} ({language.region})
          </Text>
        </View>

        <View style={[
          styles.radioOuter,
          { borderColor: isSelected ? colors.accent : colors.border }
        ]}>
          {isSelected && (
            <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="language" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('language.select')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {t('language.selectDesc')}
          </Text>
        </View>

        {/* Language Options */}
        <View style={styles.languagesContainer}>
          {LANGUAGES.map((lang) => (
            <LanguageCard key={lang.id} language={lang} />
          ))}
        </View>

        {/* Info Note */}
        <View style={[styles.infoNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('language.note')}
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: hasChanges ? colors.accent : colors.buttonDisabled,
            }
          ]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <Text style={styles.saveButtonText}>
              {t('general.saving')}
            </Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {t('general.saveChanges')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  languagesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  languageFlag: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  flagEmoji: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  languageRegion: {
    fontSize: 13,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 24,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
