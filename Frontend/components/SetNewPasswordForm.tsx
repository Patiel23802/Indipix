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
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

type Props = {
  phoneDisplay: string;
  onSubmit: (newPassword: string) => void | Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
};

export function SetNewPasswordForm({ phoneDisplay, onSubmit, onBack, loading, error }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const canSubmit =
    password.length >= 6 && password === confirm && !loading;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.title}>Create new password</Text>
        <Text style={styles.subtitle}>
          Verified {phoneDisplay}. Choose a new password for your account (at least 6 characters).
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>New password</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show1}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShow1(!show1)} disabled={!password} style={styles.eye}>
            {show1 ? <Eye size={20} color="rgba(255,255,255,0.4)" /> : <EyeOff size={20} color="rgba(255,255,255,0.4)" />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔑</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!show2}
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShow2(!show2)} disabled={!confirm} style={styles.eye}>
            {show2 ? <Eye size={20} color="rgba(255,255,255,0.4)" /> : <EyeOff size={20} color="rgba(255,255,255,0.4)" />}
          </TouchableOpacity>
        </View>

        {password.length > 0 && confirm.length > 0 && password !== confirm ? (
          <Text style={styles.hint}>Passwords do not match</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
          onPress={() => canSubmit && onSubmit(password)}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.ctaText}>Update password</Text>
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
    marginBottom: 18,
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
  eye: {
    padding: 4,
  },
  hint: {
    color: '#ff6b6b',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
