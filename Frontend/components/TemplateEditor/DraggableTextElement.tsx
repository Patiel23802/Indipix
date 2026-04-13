import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { X } from 'lucide-react-native';
import { TextElement } from './types';
import { styles } from './styles';

interface DraggableTextElementProps {
  element: TextElement;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function DraggableTextElement({
  element,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onEndEdit,
  onDelete,
  onUpdate,
  canvasWidth,
  canvasHeight,
}: DraggableTextElementProps) {
  const pan = useRef(new Animated.ValueXY({ x: element.x, y: element.y })).current;
  const [localText, setLocalText] = useState(element.text);
  const textInputRef = useRef<TextInput>(null);

  // Use refs to store latest values so panResponder can access them
  const elementRef = useRef(element);
  const localTextRef = useRef(localText);
  const isEditingRef = useRef(isEditing);

  // Keep refs in sync with props/state
  React.useEffect(() => {
    elementRef.current = element;
  }, [element]);

  React.useEffect(() => {
    localTextRef.current = localText;
  }, [localText]);

  React.useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Sync pan value with element position when element changes (but not while dragging)
  const isDraggingRef = useRef(false);
  React.useEffect(() => {
    if (!isDraggingRef.current && !isEditing) {
      pan.setValue({ x: element.x, y: element.y });
    }
  }, [element.x, element.y, isEditing]);

  const panResponder = useRef(
    PanResponder.create({
      // Capture early so parent press handlers don't steal the gesture.
      onStartShouldSetPanResponderCapture: () => {
        if (isEditingRef.current) return false;
        return true;
      },
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Don't start panning if we're editing text
        if (isEditingRef.current) return false;
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Don't start panning if we're editing text
        if (isEditingRef.current) return false;
        // Only start panning if there's significant movement
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // If we're still editing, save the text first
        if (isEditingRef.current && textInputRef.current) {
          // Save any unsaved text before starting drag - use refs to get latest values
          const currentElement = elementRef.current;
          const currentLocalText = localTextRef.current;
          const textToSave = currentLocalText || currentElement.text || '';
          onUpdate({ text: textToSave });
          textInputRef.current.blur();
        }
        isDraggingRef.current = true;
        onSelect();
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        // Critical: reset the animated value after setting the offset,
        // otherwise dx/dy gets applied on top of the previous value and drag breaks/jumps.
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        pan.flattenOffset();
        const x = (pan.x as any)._value;
        const y = (pan.y as any)._value;
        // Get latest values from refs to ensure we have the current text
        const currentElement = elementRef.current;
        const currentLocalText = localTextRef.current;
        // Get the text to preserve - prefer element text, fallback to local text
        const textToPreserve = currentElement.text || currentLocalText;
        // Only include text in update if we have a value, otherwise let updateTextElement preserve it
        const updates: Partial<TextElement> = { 
          x: Math.max(0, Math.min(x, canvasWidth - currentElement.width)), 
          y: Math.max(0, Math.min(y, canvasHeight - currentElement.height))
        };
        // Only explicitly set text if we have a non-empty value
        if (textToPreserve && textToPreserve.trim().length > 0) {
          updates.text = textToPreserve;
        }
        onUpdate(updates);
      },
    })
  ).current;

  // Update local text when element text changes, but only if not currently editing
  // This prevents overwriting user input while they're typing
  React.useEffect(() => {
    if (!isEditing) {
      setLocalText(element.text);
    }
  }, [element.text, isEditing]);

  return (
    <Animated.View
      style={[
        styles.textElement,
        {
          left: pan.x,
          top: pan.y,
          width: element.width,
          height: element.height,
          backgroundColor: isEditing ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
          borderWidth: isEditing ? 2 : 0,
          borderColor: isEditing ? '#fbbf24' : 'transparent',
          borderRadius: isEditing ? 4 : 0,
          padding: isEditing ? 8 : 0,
        },
      ]}
      {...(!isEditing ? panResponder.panHandlers : {})}
    >
      {isEditing && (
        <>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={onDelete}
          >
            <X size={12} color="#EF4444" />
          </TouchableOpacity>
          <View style={styles.resizeHandle} />
        </>
      )}
      {isEditing ? (
        <TextInput
          ref={textInputRef}
          style={[
            styles.textElementInput,
            {
              fontSize: element.fontSize,
              color: element.color,
              fontFamily: element.fontFamily === 'System' ? undefined : element.fontFamily,
              fontWeight: '700',
              textAlign: element.textAlign || 'center',
            },
          ]}
          value={localText}
          onChangeText={(text) => {
            setLocalText(text);
            // Immediately save text to element state
            onUpdate({ text });
          }}
          onBlur={() => {
            // Ensure text is saved before ending edit
            const textToSave = localText || element.text || '';
            onUpdate({ text: textToSave });
            setLocalText(textToSave);
            onEndEdit();
          }}
          onSubmitEditing={() => {
            // Also save on submit
            const textToSave = localText || element.text || '';
            onUpdate({ text: textToSave });
            setLocalText(textToSave);
            textInputRef.current?.blur();
          }}
          placeholder="Enter text"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          multiline
          autoFocus
        />
      ) : (
        <TouchableOpacity
          style={styles.textElementTouchable}
          onPress={onStartEdit}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.textElementText,
              {
                fontSize: element.fontSize,
                color: element.color,
                fontFamily: element.fontFamily === 'System' ? undefined : element.fontFamily,
                fontWeight: '700',
                textAlign: element.textAlign || 'center',
                textShadowColor: element.textShadow ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
                textShadowOffset: element.textShadow === 'small' ? { width: 0, height: 1 } :
                                  element.textShadow === 'medium' ? { width: 0, height: 2 } :
                                  element.textShadow === 'large' ? { width: 0, height: 3 } :
                                  { width: 0, height: 0 },
                textShadowRadius: element.textShadow === 'small' ? 2 :
                                  element.textShadow === 'medium' ? 4 :
                                  element.textShadow === 'large' ? 6 : 0,
              },
            ]}
          >
            {element.text || 'Tap to edit'}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
