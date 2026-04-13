import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { styles } from './styles';

interface PropertyButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function PropertyButton({ icon, label, active = false, onPress }: PropertyButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.propertyButton, active && styles.propertyButtonActive]}
      onPress={onPress}
    >
      <View style={[styles.propertyIcon, active && styles.propertyIconActive]}>
        {icon}
      </View>
      <Text style={[styles.propertyLabel, active && styles.propertyLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
