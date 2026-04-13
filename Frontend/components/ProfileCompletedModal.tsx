import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Check, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/constants/colors';

interface ProfileCompletedModalProps {
  visible: boolean;
  onClose: () => void;
  onGoHome: () => void;
}

export function ProfileCompletedModal({ visible, onClose, onGoHome }: ProfileCompletedModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Check size={40} color={COLORS.white} strokeWidth={3} />
            </View>
          </View>

          <Text style={styles.title}>Profile Completed!</Text>
          <Text style={styles.message}>
            Your profile details have been saved successfully. You are all set to create amazing designs!
          </Text>

          <TouchableOpacity style={styles.button} onPress={onGoHome}>
            <Text style={styles.buttonText}>Go to Home Screen</Text>
            <ArrowRight size={20} color={COLORS.white} style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Decorative dots */}
          <View style={styles.decorativeDot1} />
          <View style={styles.decorativeDot2} />
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.grayLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  decorativeDot1: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
  },
  decorativeDot2: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
  },
});
