import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function ActionButton({ icon, label, active = false, onPress, disabled = false }: ActionButtonProps) {
  return (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.8}
    >
      <View
        style={[
          styles.actionIcon,
          active && styles.actionIconActive,
          disabled ? { opacity: 0.55 } : null,
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.actionLabel, active && styles.actionLabelActive, disabled ? { opacity: 0.6 } : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
