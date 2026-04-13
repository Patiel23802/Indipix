import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Edit, Type, Palette } from 'lucide-react-native';
import { TextElement, ActiveProperty } from './types';
import { PropertyButton } from './PropertyButton';
import { styles } from './styles';

interface TextPropertiesPanelProps {
  selectedText: TextElement;
  activeProperty: ActiveProperty;
  editingTextId: string | null;
  textElements: TextElement[];
  fonts: string[];
  colors: string[];
  onClose: () => void;
  onSetActiveProperty: (property: ActiveProperty) => void;
  onUpdateTextElement: (id: string, updates: Partial<TextElement>) => void;
  onSetEditingTextId: (id: string | null) => void;
}

export function TextPropertiesPanel({
  selectedText,
  activeProperty,
  editingTextId,
  textElements,
  fonts,
  colors,
  onClose,
  onSetActiveProperty,
  onUpdateTextElement,
  onSetEditingTextId,
}: TextPropertiesPanelProps) {
  const selectedTextId = selectedText.id;

  return (
    <View style={styles.propertiesPanel}>
      <View style={styles.propertiesHeader}>
        <View style={styles.propertiesTitle}>
          <Edit size={14} color="#6B7280" />
          <Text style={styles.propertiesTitleText}>Text Properties</Text>
        </View>
        <TouchableOpacity onPress={() => {
          if (editingTextId && selectedText) {
            const activeElement = textElements.find(el => el.id === editingTextId);
            if (activeElement) {
              onSetEditingTextId(null);
            }
          }
          onClose();
        }}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.propertiesScroll}
        contentContainerStyle={styles.propertiesScrollContent}
      >
        <PropertyButton 
          icon={<Type size={24} color={activeProperty === 'font' ? "#881337" : "#6B7280"} />} 
          label="Font" 
          active={activeProperty === 'font'}
          onPress={() => onSetActiveProperty(activeProperty === 'font' ? null : 'font')}
        />
        <PropertyButton 
          icon={<Palette size={24} color={activeProperty === 'color' ? "#881337" : "#6B7280"} />} 
          label="Color"
          active={activeProperty === 'color'}
          onPress={() => onSetActiveProperty(activeProperty === 'color' ? null : 'color')}
        />
        <PropertyButton 
          icon={<Text style={{ fontSize: 20, color: activeProperty === 'size' ? '#881337' : '#6B7280' }}>Aa</Text>} 
          label="Size"
          active={activeProperty === 'size'}
          onPress={() => onSetActiveProperty(activeProperty === 'size' ? null : 'size')}
        />
        <PropertyButton 
          icon={<Text style={{ fontSize: 20, color: activeProperty === 'shadow' ? '#881337' : '#6B7280' }}>T</Text>} 
          label="Shadow"
          active={activeProperty === 'shadow'}
          onPress={() => onSetActiveProperty(activeProperty === 'shadow' ? null : 'shadow')}
        />
        <PropertyButton 
          icon={<Text style={{ fontSize: 20, color: activeProperty === 'format' ? '#881337' : '#6B7280' }}>≡</Text>} 
          label="Format"
          active={activeProperty === 'format'}
          onPress={() => onSetActiveProperty(activeProperty === 'format' ? null : 'format')}
        />
      </ScrollView>

      {/* Property Options Panel */}
      {activeProperty === 'font' && (
        <View style={styles.propertyOptionsPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyOptionsScroll}>
            {fonts.map((font) => (
              <TouchableOpacity
                key={font}
                style={[
                  styles.fontOption,
                  selectedText.fontFamily === font && styles.fontOptionActive
                ]}
                onPress={() => onUpdateTextElement(selectedTextId, { fontFamily: font })}
              >
                <Text style={[
                  styles.fontOptionText,
                  { fontFamily: font === 'System' ? undefined : font },
                  selectedText.fontFamily === font && styles.fontOptionTextActive
                ]}>
                  {font}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {activeProperty === 'color' && (
        <View style={styles.propertyOptionsPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyOptionsScroll}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedText.color === color && styles.colorOptionActive
                ]}
                onPress={() => onUpdateTextElement(selectedTextId, { color })}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {activeProperty === 'size' && (
        <View style={styles.propertyOptionsPanel}>
          <View style={styles.sizeControl}>
            <TouchableOpacity
              style={styles.sizeButton}
              onPress={() => {
                if (selectedText.fontSize > 12) {
                  onUpdateTextElement(selectedTextId, { fontSize: selectedText.fontSize - 2 });
                }
              }}
            >
              <Text style={styles.sizeButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.sizeValue}>{selectedText.fontSize}</Text>
            <TouchableOpacity
              style={styles.sizeButton}
              onPress={() => {
                if (selectedText.fontSize < 72) {
                  onUpdateTextElement(selectedTextId, { fontSize: selectedText.fontSize + 2 });
                }
              }}
            >
              <Text style={styles.sizeButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeProperty === 'shadow' && (
        <View style={styles.propertyOptionsPanel}>
          <View style={styles.shadowOptions}>
            <TouchableOpacity
              style={[styles.shadowOption, !selectedText.textShadow && styles.shadowOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textShadow: false })}
            >
              <Text style={styles.shadowOptionText}>None</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shadowOption, selectedText.textShadow === 'small' && styles.shadowOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textShadow: 'small' })}
            >
              <Text style={styles.shadowOptionText}>Small</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shadowOption, selectedText.textShadow === 'medium' && styles.shadowOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textShadow: 'medium' })}
            >
              <Text style={styles.shadowOptionText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shadowOption, selectedText.textShadow === 'large' && styles.shadowOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textShadow: 'large' })}
            >
              <Text style={styles.shadowOptionText}>Large</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeProperty === 'format' && (
        <View style={styles.propertyOptionsPanel}>
          <View style={styles.formatOptions}>
            <TouchableOpacity
              style={[styles.formatOption, selectedText.textAlign === 'left' && styles.formatOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textAlign: 'left' })}
            >
              <Text style={styles.formatIcon}>☰</Text>
              <Text style={styles.formatLabel}>Left</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formatOption, selectedText.textAlign === 'center' && styles.formatOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textAlign: 'center' })}
            >
              <Text style={styles.formatIcon}>☰</Text>
              <Text style={styles.formatLabel}>Center</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formatOption, selectedText.textAlign === 'right' && styles.formatOptionActive]}
              onPress={() => onUpdateTextElement(selectedTextId, { textAlign: 'right' })}
            >
              <Text style={styles.formatIcon}>☰</Text>
              <Text style={styles.formatLabel}>Right</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
