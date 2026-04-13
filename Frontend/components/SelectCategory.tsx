import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Globe, Vote, User, Store, CheckCircle, Palette, Sparkles, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

const CATEGORIES = [
  { 
    id: 'public-figure', 
    name: 'Public figure', 
    icon: Globe, 
    iconColor: '#3b82f6',
    bgColor: '#dbeafe',
  },
  { 
    id: 'politicians', 
    name: 'Politicians', 
    icon: Vote, 
    iconColor: '#f97316',
    bgColor: '#fed7aa',
  },
  { 
    id: 'individual', 
    name: 'Individual', 
    icon: User, 
    iconColor: '#10b981',
    bgColor: '#d1fae5',
  },
  { 
    id: 'business-owner', 
    name: 'Business owner', 
    icon: Store, 
    iconColor: '#8b5cf6',
    bgColor: '#e9d5ff',
  },
  { 
    id: 'brand', 
    name: 'Brand', 
    icon: CheckCircle, 
    iconColor: '#ec4899',
    bgColor: '#fce7f3',
  },
  { 
    id: 'artists', 
    name: 'Artists', 
    icon: Palette, 
    iconColor: '#06b6d4',
    bgColor: '#cffafe',
  },
  { 
    id: 'celebrity', 
    name: 'Celebrity', 
    icon: Sparkles, 
    iconColor: '#f59e0b',
    bgColor: '#fef3c7',
  },
];

interface SelectCategoryProps {
  onContinue: (category: string) => void;
  loading: boolean;
  error: string | null;
}

export function SelectCategory({ onContinue, loading, error }: SelectCategoryProps) {
  const [selectedCategory, setSelectedCategory] = useState('individual');

  const handleContinue = () => {
    onContinue(selectedCategory);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Category</Text>
          <Text style={styles.subtitle}>Choose the category that best describes you.</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.categoriesContainer}>
          {CATEGORIES.map(category => {
            const IconComponent = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
                disabled={loading}
                activeOpacity={0.99}
              >
                <View style={styles.categoryContent}>
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: category.bgColor },
                    ]}
                  >
                    <IconComponent size={24} color={category.iconColor} />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected,
                  ]}
                >
                  {isSelected && (
                    <Check size={16} color={COLORS.white} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  categoriesContainer: {
    marginBottom: 16,
    gap: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
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
