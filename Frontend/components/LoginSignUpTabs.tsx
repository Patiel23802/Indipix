import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { Eye, EyeOff, Pencil } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#ec1349',
  backgroundDark: '#221015',
  surfaceDark: '#2f1b20',
  white: '#ffffff',
  gray: '#999999',
};

type TabType = 'login' | 'signup';

interface LoginSignUpTabsProps {
  onLoginSubmit: (phone: string, password: string) => void;
  onSignUpSubmit: (phone: string, password: string) => void;
  onForgotPassword?: () => void;
  loading: boolean;
  error: string | null;
}

export function LoginSignUpTabs({
  onLoginSubmit,
  onSignUpSubmit,
  onForgotPassword,
  loading,
  error,
}: LoginSignUpTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const normalizePhone = (text: string) => text.replace(/\D/g, '').slice(0, 10);

  const handleLoginSubmit = () => {
    if (!loginPhone.trim() || !loginPassword.trim()) {
      return;
    }
    onLoginSubmit(loginPhone, loginPassword);
  };

  const handleSignUpSubmit = () => {
    try {
      if (!signUpPhone.trim() || !signUpPassword.trim() || !confirmPassword.trim()) {
        return;
      }
      if (signUpPassword !== confirmPassword) {
        return;
      }
      console.log('🔵 LoginSignUpTabs: Calling onSignUpSubmit', { phone: signUpPhone });
      onSignUpSubmit(signUpPhone, signUpPassword);
    } catch (err: any) {
      console.error('🔴 LoginSignUpTabs: handleSignUpSubmit error', err);
      // Error will be handled by parent component
    }
  };

  const mandalaImageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsCH3AYP3f3g1vA0gPe_FZCajXK3Aw9WfYETtfWXsWFAfUwrjRt3TEmvgeNUtFUY_IgXLzOKgMY04MVPaphJhXKQUEOeRRLeZPCZ0GUc_pBQNHVV3eihHnuYykzzU4r0npk7CFTIpxxI7igmoczoxFkv5VWB1SWMk0wANxKMgYSfI-2x7NWK2kH3c_DMXYmD4_9fMxZ3jxceUkA7Hmxs7lLgKHTeQT03-Kkahg4h6N4KV9VATJvko_nRGznA0j4UkzJqbUAzoh7NI';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section with Hero Image */}
        <View style={styles.headerSection}>
          <ImageBackground
            source={{ uri: mandalaImageUrl }}
            style={styles.headerBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(34, 16, 21, 0.3)', 'rgba(34, 16, 21, 0.6)', 'rgba(34, 16, 21, 1)']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <Pencil size={24} color={COLORS.primary} />
                  </View>
                </View>
                <Text style={styles.title}>Namaste,</Text>
                <Text style={styles.title}>Creator</Text>
                <Text style={styles.subtitle}>
                  {activeTab === 'login' ? 'Edit photos with a desi touch.' : 'Start your journey with a desi touch.'}
                </Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Segmented Control */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'login' && styles.tabActive]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                Log In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
              onPress={() => setActiveTab('signup')}
            >
              <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {activeTab === 'login' ? (
            <View style={styles.formContainer}>
              {/* Mobile Number Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your mobile number"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={loginPhone}
                    onChangeText={text => setLoginPhone(normalizePhone(text))}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                    disabled={!loginPassword}
                    style={styles.eyeButton}
                  >
                    {showLoginPassword ? (
                      <Eye size={20} color="rgba(255, 255, 255, 0.4)" />
                    ) : (
                      <EyeOff size={20} color="rgba(255, 255, 255, 0.4)" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={onForgotPassword}
                disabled={!onForgotPassword || loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleLoginSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Mobile Number Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your mobile number"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={signUpPhone}
                    onChangeText={text => setSignUpPhone(normalizePhone(text))}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry={!showSignUpPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSignUpPassword(!showSignUpPassword)}
                    disabled={!signUpPassword}
                    style={styles.eyeButton}
                  >
                    {showSignUpPassword ? (
                      <Eye size={20} color="rgba(255, 255, 255, 0.4)" />
                    ) : (
                      <EyeOff size={20} color="rgba(255, 255, 255, 0.4)" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!confirmPassword}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <Eye size={20} color="rgba(255, 255, 255, 0.4)" />
                    ) : (
                      <EyeOff size={20} color="rgba(255, 255, 255, 0.4)" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>📬</Text>
                <Text style={styles.infoText}>
                  We will send a One Time Password (OTP) to your mobile number for verification.
                </Text>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSignUpSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By {activeTab === 'login' ? 'logging in' : 'signing up'}, you agree to our{' '}
              <Text style={styles.link}>Terms</Text> & <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
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
  },
  headerSection: {
    width: '100%',
    height: 320,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  headerBackground: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40,
  },
  headerContent: {
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(236, 19, 73, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(236, 19, 73, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: -24,
    zIndex: 20,
  },
  tabContainer: {
    backgroundColor: 'rgba(47, 27, 32, 0.8)',
    borderRadius: 9999,
    padding: 6,
    flexDirection: 'row',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(236, 19, 73, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    marginLeft: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 64,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginRight: 8,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(236, 19, 73, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 40,
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
});
