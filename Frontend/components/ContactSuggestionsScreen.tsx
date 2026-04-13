import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { UserProfile } from '@/types';
import { api } from '@/lib/api';

const COLORS = {
  primary: '#8B1A3D',
  textDark: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  card: '#FAF8F3',
};

type Props = {
  user: UserProfile;
};

export function ContactSuggestionsScreen({ user }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter your suggestion or message.');
      return;
    }
    setError(null);
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.submitSuggestion({
        userId: user.id,
        subject: subject.trim() || undefined,
        message: trimmed,
      })) as { success?: boolean; error?: string };
      if (res && res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone(true);
        setSubject('');
        setMessage('');
      } else {
        setError(typeof res?.error === 'string' ? res.error : 'Could not send. Try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Contact us</Text>
        <Text style={styles.subtitle}>
          Share ideas, report issues, or tell us what templates you would like. Your message goes to our team.
        </Text>

        {done ? (
          <View style={styles.thanksBox}>
            <Text style={styles.thanksTitle}>Thank you</Text>
            <Text style={styles.thanksText}>We have received your message and will review it.</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setDone(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.secondaryBtnText}>Send another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Subject (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. New template idea"
              placeholderTextColor={COLORS.textLight}
              value={subject}
              onChangeText={setSubject}
              maxLength={200}
              editable={!sending}
            />

            <Text style={styles.label}>Your message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your suggestion here…"
              placeholderTextColor={COLORS.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              maxLength={8000}
              editable={!sending}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, sending && styles.submitBtnDisabled]}
              onPress={onSubmit}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textDark,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 160,
    paddingTop: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  thanksBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thanksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  thanksText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
