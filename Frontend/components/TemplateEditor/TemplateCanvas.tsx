import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Image as ImageIcon, Square } from 'lucide-react-native';
import { TextElement } from './types';
import { DraggableTextElement } from './DraggableTextElement';
import { DraggableProfilePhoto } from './DraggableProfilePhoto';
import { styles } from './styles';

/** `indipix-watermark.png` intrinsic ratio — vertical strip only. */
const WATERMARK_SRC_W = 82;
const WATERMARK_SRC_H = 334;
const WATERMARK_ASPECT = WATERMARK_SRC_W / WATERMARK_SRC_H;

interface TemplateCanvasProps {
  templateImageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  canvasRef: React.RefObject<ViewShot | null>;
  textElements: TextElement[];
  selectedTextId: string | null;
  editingTextId: string | null;
  profilePhoto: string | null;
  profilePhotoPosition: { x: number; y: number } | null;
  profilePhotoSize: number;
  selectedProfilePhoto: boolean;
  partyLogo: string | null;
  showLogo: boolean;
  /** When false (non–Politician / non–Brand profile), hide logo UI entirely */
  partyLogoEligible: boolean;
  onImageLoad: (event: any) => void;
  onCanvasPress: () => void;
  onTextSelect: (id: string) => void;
  onTextStartEdit: (id: string) => void;
  onTextEndEdit: () => void;
  onTextDelete: (id: string) => void;
  onTextUpdate: (id: string, updates: Partial<TextElement>) => void;
  onProfilePhotoSelect: () => void;
  onProfilePhotoPositionUpdate: (x: number, y: number) => void;
  onProfilePhotoSizeUpdate: (size: number) => void;
  onProfilePhotoError: () => void;
  onPickProfilePhoto: () => void;
  onToggleLogo: () => void;
  onLogoError: () => void;
  /** Render watermark overlay (used only during export). */
  showWatermark?: boolean;
}

export function TemplateCanvas({
  templateImageUrl,
  canvasWidth,
  canvasHeight,
  canvasRef,
  textElements,
  selectedTextId,
  editingTextId,
  profilePhoto,
  profilePhotoPosition,
  profilePhotoSize,
  selectedProfilePhoto,
  partyLogo,
  showLogo,
  partyLogoEligible,
  onImageLoad,
  onCanvasPress,
  onTextSelect,
  onTextStartEdit,
  onTextEndEdit,
  onTextDelete,
  onTextUpdate,
  onProfilePhotoSelect,
  onProfilePhotoPositionUpdate,
  onProfilePhotoSizeUpdate,
  onProfilePhotoError,
  onPickProfilePhoto,
  onToggleLogo,
  onLogoError,
  showWatermark = false,
}: TemplateCanvasProps) {
  const stripMaxH = canvasHeight * 0.28;
  let stripH = stripMaxH;
  let stripW = stripH * WATERMARK_ASPECT;
  const stripMaxW = Math.max(18, canvasWidth * 0.085);
  if (stripW > stripMaxW) {
    stripW = stripMaxW;
    stripH = stripW / WATERMARK_ASPECT;
  }
  const stripTop = Math.max(4, (canvasHeight - stripH) / 2);

  const canvasContent = (
    <>
      {templateImageUrl ? (
        <Image
          source={{ uri: templateImageUrl }}
          style={[styles.canvasImage, { width: canvasWidth, height: canvasHeight }]}
          resizeMode="contain"
          onLoad={onImageLoad}
        />
      ) : (
        <View style={[styles.placeholderCanvas, { width: canvasWidth, height: canvasHeight }]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      {/* Text Elements */}
      {textElements.map((element) => {
        const isSelected = element.id === selectedTextId;
        return (
          <DraggableTextElement
            key={element.id}
            element={element}
            isSelected={isSelected}
            isEditing={editingTextId === element.id}
            onSelect={() => onTextSelect(element.id)}
            onStartEdit={() => onTextStartEdit(element.id)}
            onEndEdit={onTextEndEdit}
            onDelete={() => onTextDelete(element.id)}
            onUpdate={(updates) => onTextUpdate(element.id, updates)}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      })}

      {/* Profile Photo - Draggable and Resizable */}
      {profilePhoto && profilePhotoPosition ? (
        <DraggableProfilePhoto
          photoUri={profilePhoto}
          position={profilePhotoPosition}
          size={profilePhotoSize}
          isSelected={selectedProfilePhoto}
          onSelect={onProfilePhotoSelect}
          onUpdatePosition={onProfilePhotoPositionUpdate}
          onUpdateSize={(size) => {
            onProfilePhotoSizeUpdate(size);
            // Adjust position to keep within bounds when resizing
            if (profilePhotoPosition) {
              const newX = Math.max(0, Math.min(profilePhotoPosition.x, canvasWidth - size));
              const newY = Math.max(0, Math.min(profilePhotoPosition.y, canvasHeight - size));
              if (newX !== profilePhotoPosition.x || newY !== profilePhotoPosition.y) {
                onProfilePhotoPositionUpdate(newX, newY);
              }
            }
          }}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onError={onProfilePhotoError}
        />
      ) : (
        <TouchableOpacity 
          style={[styles.addPhotoButton, { 
            position: 'absolute',
            bottom: 24,
            right: 24,
          }]}
          onPress={onPickProfilePhoto}
        >
          <ImageIcon size={32} color="rgba(255,255,255,0.9)" />
          <Text style={styles.addPhotoText}>Add Photo</Text>
        </TouchableOpacity>
      )}

      {/* Add Logo Button — only for Politician / Brand profiles */}
      {partyLogoEligible ? (
        <TouchableOpacity 
          style={[styles.addLogoButton, !partyLogo && styles.addLogoButtonDisabled]}
          onPress={onToggleLogo}
        >
          <Square size={24} color={partyLogo ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"} />
          <Text style={[styles.addLogoText, !partyLogo && styles.addLogoTextDisabled]}>
            {partyLogo ? (showLogo ? 'Hide Logo' : 'Show Logo') : 'No Logo'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Political Party Logo */}
      {partyLogoEligible && showLogo && partyLogo && (
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: partyLogo }}
            style={styles.partyLogoImage}
            resizeMode="cover"
            onError={onLogoError}
            onLoad={() => {
              console.log('Logo image loaded successfully');
            }}
          />
        </View>
      )}

      {showWatermark ? (
        <View
          style={[
            styles.watermarkContainer,
            {
              top: stripTop,
              width: stripW,
              height: stripH,
            },
          ]}
          pointerEvents="none"
          collapsable={false}
        >
          <Image
            source={require('../../assets/images/indipix-watermark.png')}
            style={styles.watermarkImage}
            resizeMode="contain"
          />
        </View>
      ) : null}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        ref={canvasRef as any}
        style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
      >
        {canvasContent}
      </View>
    );
  }

  return (
    <ViewShot
      ref={canvasRef}
      options={{ format: 'png', quality: 1.0 }}
      style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
    >
      {canvasContent}
    </ViewShot>
  );
}
