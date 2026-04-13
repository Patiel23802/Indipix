import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Languages, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

const LANGUAGES = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'Default', 
    letter: 'A',
    color: '#f97316',
    bgColor: '#fed7aa',
    default: true 
  },
  { 
    code: 'hi', 
    name: 'Hindi', 
    nativeName: 'हिंदी', 
    letter: 'अ',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  { 
    code: 'mr', 
    name: 'Marathi', 
    nativeName: 'मराठी', 
    letter: 'म',
    color: '#ec4899',
    bgColor: '#fce7f3',
  },
];

interface SelectLanguageProps {
  onContinue: (language: string) => void;
  loading: boolean;
  error: string | null;
}

export function SelectLanguage({ onContinue, loading, error }: SelectLanguageProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleContinue = () => {
    onContinue(selectedLanguage);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Language</Text>
          <Text style={styles.subtitle}>Select your preferred language to use the app.</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.languagesContainer}>
          {LANGUAGES.map(language => {
            const isSelected = selectedLanguage === language.code;
            
            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageCard,
                  isSelected && styles.languageCardSelected,
                ]}
                onPress={() => setSelectedLanguage(language.code)}
                disabled={loading}
                activeOpacity={0.99}
              >
                <View style={styles.languageContent}>
                  <View
                    style={[
                      styles.languageIconContainer,
                      { backgroundColor: language.bgColor },
                    ]}
                  >
                    <Text style={[styles.languageLetter, { color: language.color }]}>
                      {language.letter}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.languageName}>{language.name}</Text>
                    <Text style={styles.languageNativeName}>{language.nativeName}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioButtonDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.comingSoonContainer}>
          <Languages size={16} color={COLORS.grayLight} />
          <Text style={styles.comingSoonText}>More Indian languages will be coming soon</Text>
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Text style={styles.arrow}> →</Text>
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
    backgroundColor: COLORS.backgroundDark,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.grayLight,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(236, 19, 73, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  languagesContainer: {
    marginBottom: 24,
    gap: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  languageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageLetter: {
    fontSize: 24,
    fontWeight: '700',
  },
  languageName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  languageNativeName: {
    fontSize: 14,
    color: COLORS.grayLight,
    marginTop: 2,
  },
  comingSoonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  comingSoonText: {
    fontSize: 12,
    color: COLORS.grayLight,
    fontStyle: 'italic',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  radioButtonDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  arrow: {
    color: COLORS.white,
    fontSize: 20,
    marginLeft: 8,
  },
});
