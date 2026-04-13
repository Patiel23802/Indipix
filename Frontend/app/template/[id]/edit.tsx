import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TemplateEditor } from '@/components/TemplateEditor';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Text } from 'react-native';

export default function TemplateEditScreen() {
  const router = useRouter();
  const { id, continue: continueParam } = useLocalSearchParams<{ id: string; continue?: string }>();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const continueEditing = continueParam === 'true';

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTemplates();
      
      if (response.success && response.data) {
        const templates = Array.isArray(response.data) ? response.data : [];
        const foundTemplate = templates.find((t: any) => t.id === id);
        if (foundTemplate) {
          setTemplate(foundTemplate);
          // Fade in animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          setError('Template not found');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        setError('Failed to load template. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Unable to load template. Please check your connection.';
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    // TODO: Implement save functionality
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#881337" />
        <Text style={styles.loadingText}>Loading editor...</Text>
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Template not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fetchTemplate();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <TemplateEditor 
        template={template} 
        onBack={handleBack}
        onSave={handleSave}
        continueEditing={continueEditing}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#881337',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    color: '#881337',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#881337',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

