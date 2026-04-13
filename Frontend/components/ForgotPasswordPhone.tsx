import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

type Props = {
  onSendOtp: (phone: string) => void | Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
};

export function ForgotPasswordPhone({ onSendOtp, onBack, loading, error }: Props) {
  const [phone, setPhone] = useState('');

  const normalizePhone = (text: string) => text.replace(/\D/g, '').slice(0, 10);

  const handleSubmit = () => {
    if (phone.length === 10) {
      onSendOtp(phone);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>
          Enter the mobile number linked to your account. We will send a verification code to reset your password.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Mobile number</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>📱</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={phone}
            onChangeText={(t) => setPhone(normalizePhone(t))}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.cta, (phone.length !== 10 || loading) && styles.ctaDisabled]}
          onPress={handleSubmit}
          disabled={phone.length !== 10 || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.ctaText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.grayLight,
    lineHeight: 22,
    marginBottom: 28,
  },
  errorBox: {
    backgroundColor: 'rgba(236, 19, 73, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
