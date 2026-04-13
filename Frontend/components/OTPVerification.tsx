import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/colors';

interface OTPVerificationProps {
  phone: string;
  onVerify: (otp: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  /** When true (e.g. development mode), show hint that any 6-digit code can be entered */
  testMode?: boolean;
  /** Password reset copy vs signup / login verification */
  variant?: 'default' | 'password_reset';
}

const OTP_DIGITS = 6;

export function OTPVerification({
  phone,
  onVerify,
  onBack,
  loading,
  error,
  testMode,
  variant = 'default',
}: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOTPChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setOtp(numericText);
      setActiveIndex(numericText.length);
      if (numericText.length === 6) {
        inputRef.current?.blur();
        Keyboard.dismiss();
      }
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (otp.length < 6) {
      const newOtp = otp + digit;
      setOtp(newOtp);
      setActiveIndex(newOtp.length);
      if (newOtp.length === 6) {
        Keyboard.dismiss();
      }
    }
  };

  const handleBackspace = () => {
    if (otp.length > 0) {
      const newOtp = otp.slice(0, -1);
      setOtp(newOtp);
      setActiveIndex(newOtp.length);
    }
  };

  const handleVerify = () => {
    if (otp.length === 6) {
      onVerify(otp);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={loading}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <View style={styles.phoneContainer}>
            <Text style={styles.phoneText}>
              {variant === 'password_reset'
                ? `We sent a 6-digit code to ${formatPhone(phone)} to reset your password`
                : `We sent a 6-digit code to ${formatPhone(phone)}`}
            </Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {testMode && (
            <View style={styles.testModeHint}>
              <Text style={styles.testModeText}>Development mode: enter any 6-digit code to continue</Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.otpContainer}>
          <TextInput
            ref={inputRef}
            style={styles.otpInput}
            value={otp}
            onChangeText={handleOTPChange}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
            autoFocus
          />

          <View style={styles.otpDisplay}>
            {Array.from({ length: OTP_DIGITS }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  index === activeIndex && styles.otpBoxActive,
                  otp[index] && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpDigit} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                  {otp[index] || ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.timerContainer}>
          {timer > 0 ? (
            <>
              <Clock size={16} color={COLORS.grayLight} />
              <Text style={styles.timerText}>Resend code in {formatTimer(timer)}</Text>
            </>
          ) : (
            <TouchableOpacity disabled={loading}>
              <Text style={styles.resendText}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (otp.length < 6 || loading) && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={otp.length < 6 || loading}
        >
          <LinearGradient
            colors={['#EC4899', COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
                <ArrowRight size={20} color={COLORS.white} style={styles.arrowIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          {[
            { key: '1', label: '1' },
            { key: '2', label: '2 ABC' },
            { key: '3', label: '3 DEF' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.keypadKey}
              onPress={() => handleKeypadPress(item.key)}
              disabled={loading}
            >
              <Text style={styles.keypadKeyText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {[
            { key: '4', label: '4 GHI' },
            { key: '5', label: '5 JKL' },
            { key: '6', label: '6 MNO' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.keypadKey}
              onPress={() => handleKeypadPress(item.key)}
              disabled={loading}
            >
              <Text style={styles.keypadKeyText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          {[
            { key: '7', label: '7 PQRS' },
            { key: '8', label: '8 TUV' },
            { key: '9', label: '9 WXYZ' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.keypadKey}
              onPress={() => handleKeypadPress(item.key)}
              disabled={loading}
            >
              <Text style={styles.keypadKeyText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.keypadRow}>
          <View style={styles.keypadKey} />
          <TouchableOpacity
            style={styles.keypadKey}
            onPress={() => handleKeypadPress('0')}
            disabled={loading}
          >
            <Text style={styles.keypadKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keypadKey}
            onPress={handleBackspace}
            disabled={loading || otp.length === 0}
          >
            <View style={styles.backspaceContainer}>
              <Text style={styles.backspaceText}>⌫</Text>
            </View>
          </TouchableOpacity>
        </View>
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
  },
  backButton: {
    marginTop: 16,
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  phoneText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    color: COLORS.grayLight,
  },
  editText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  testModeHint: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  testModeText: {
    fontSize: 13,
    color: '#93c5fd',
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
  otpContainer: {
    marginBottom: 32,
    width: '100%',
    maxWidth: '100%',
  },
  otpInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  otpDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: '100%',
    gap: 6,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    maxWidth: 56,
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: COLORS.surfaceDark,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  timerText: {
    color: COLORS.grayLight,
    fontSize: 14,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  verifyButton: {
    borderRadius: 16,
    marginBottom: 40,
    overflow: 'hidden',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  gradientButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  keypad: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keypadKey: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  keypadKeyText: {
    fontSize: 22,
    fontWeight: '400',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 28,
  },
  backspaceContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backspaceText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '600',
  },
});
