import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { X, Undo2, Redo2, Download, Type, Image as ImageIcon, Square, Smile } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { TemplateEditorProps, Template } from './TemplateEditor/types';
import { getFileUrl, parseAspectRatio } from './TemplateEditor/utils';
import { useTemplateEditor } from './TemplateEditor/useTemplateEditor';
import { TemplateCanvas } from './TemplateEditor/TemplateCanvas';
import { TextPropertiesPanel } from './TemplateEditor/TextPropertiesPanel';
import { ActionButton } from './TemplateEditor/ActionButton';
import { styles } from './TemplateEditor/styles';
import { COLORS } from '@/constants/colors';

const { width } = Dimensions.get('window');

/** Match Home header accent / primary (see TemplateEditor/styles.ts). */
const APP_HEADER_ACCENT = '#EAB308';
const APP_HEADER_PRIMARY = '#8B1A3D';

export function TemplateEditor({ template, onBack, onSave, continueEditing = false }: TemplateEditorProps) {
  const { state } = useFirebaseAuth();
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const canvasRef = useRef<ViewShot | null>(null);

  // Calculate canvas dimensions
  const canvasWidth = width - 32;
  const aspectRatio = imageDimensions 
    ? imageDimensions.height / imageDimensions.width 
    : parseAspectRatio(template.aspect_ratio || '4:5');
  const canvasHeight = canvasWidth * aspectRatio;

  // Get template image URL
  const templateImageUrl = template.file_url ? getFileUrl(template.file_url) : null;

  // Use custom hook for editor logic
  const {
    textElements,
    selectedTextId,
    editingTextId,
    showTextProperties,
    activeProperty,
    historyIndex,
    historyLength,
    partyLogo,
    showLogo,
    partyLogoEligible,
    profilePhoto,
    profilePhotoSize,
    profilePhotoPosition,
    selectedProfilePhoto,
    isDownloading,
    exportWatermarkVisible,
    setSelectedTextId,
    setEditingTextId,
    setShowTextProperties,
    setActiveProperty,
    setShowLogo,
    setProfilePhotoPosition,
    setProfilePhotoSize,
    setSelectedProfilePhoto,
    handleDownload,
    handleUndo,
    handleRedo,
    handleAddText,
    handleDeleteText,
    updateTextElement,
    pickProfilePhoto,
    handleProfilePhotoError,
  } = useTemplateEditor({
    template,
    continueEditing,
    canvasWidth,
    canvasHeight,
    imageDimensions,
    canvasRef,
  });
  
  // Handle image load to get actual dimensions
  const handleImageLoad = (event: any) => {
    if (event?.nativeEvent?.source) {
      const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
      if (imgWidth && imgHeight) {
        setImageDimensions({ width: imgWidth, height: imgHeight });
      }
    }
  };

  const selectedText = textElements.find(el => el.id === selectedTextId);

  const fonts = ['System', 'Poppins', 'Inter', 'Roboto', 'Arial', 'Times New Roman'];
  const colors = ['#FFFFFF', '#000000', '#881337', '#fbbf24', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6'];

  const handleCanvasPress = () => {
    setEditingTextId(null);
    setSelectedTextId(null);
    setShowTextProperties(false);
    setActiveProperty(null);
    setSelectedProfilePhoto(false);
  };

  const handleTextSelect = (id: string) => {
    setSelectedTextId(id);
    setShowTextProperties(true);
  };

  const handleTextStartEdit = (id: string) => {
    setEditingTextId(id);
    setSelectedTextId(id);
    setShowTextProperties(true);
  };

  const handleTextEndEdit = () => {
    setEditingTextId(null);
  };

  const handleProfilePhotoSelect = () => {
    setSelectedProfilePhoto(true);
    setSelectedTextId(null);
    setShowTextProperties(false);
  };

  const handleProfilePhotoPositionUpdate = (x: number, y: number) => {
    setProfilePhotoPosition({ x, y });
  };

  const handleProfilePhotoSizeUpdate = (size: number) => {
    setProfilePhotoSize(size);
    if (profilePhotoPosition) {
      const newX = Math.max(0, Math.min(profilePhotoPosition.x, canvasWidth - size));
      const newY = Math.max(0, Math.min(profilePhotoPosition.y, canvasHeight - size));
      if (newX !== profilePhotoPosition.x || newY !== profilePhotoPosition.y) {
        setProfilePhotoPosition({ x: newX, y: newY });
      }
    }
  };


  const handleToggleLogo = () => {
    if (!partyLogoEligible) return;
    if (partyLogo) {
      setShowLogo(!showLogo);
      console.log('Logo button clicked. Show logo:', !showLogo);
    } else {
      console.log('No party logo available. Party:', state.user?.political_party);
    }
  };

  const handleLogoError = () => {
    setShowLogo(false);
  };

  const comingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} will be available in a future update.`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <X size={24} color={APP_HEADER_ACCENT} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={historyIndex === 0}
            style={[styles.headerButton, historyIndex === 0 && styles.headerButtonDisabled]}
          >
            <Undo2 size={20} color={historyIndex === 0 ? 'rgba(255,255,255,0.35)' : APP_HEADER_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            disabled={historyIndex === historyLength - 1}
            style={[styles.headerButton, historyIndex === historyLength - 1 && styles.headerButtonDisabled]}
          >
            <Redo2
              size={20}
              color={historyIndex === historyLength - 1 ? 'rgba(255,255,255,0.35)' : APP_HEADER_ACCENT}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleDownload}
          style={[styles.saveButton, isDownloading && styles.saveButtonDisabled]}
          disabled={isDownloading}
        >
          <Text style={styles.saveButtonText}>{isDownloading ? 'Downloading...' : 'Download'}</Text>
          <Download size={18} color={APP_HEADER_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Canvas Area */}
      <ScrollView 
        style={styles.canvasContainer}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleCanvasPress}
          style={styles.canvasTouchable}
        >
          <TemplateCanvas
            templateImageUrl={templateImageUrl}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
            canvasRef={canvasRef}
            textElements={textElements}
            selectedTextId={selectedTextId}
            editingTextId={editingTextId}
            profilePhoto={profilePhoto}
            profilePhotoPosition={profilePhotoPosition}
            profilePhotoSize={profilePhotoSize}
            selectedProfilePhoto={selectedProfilePhoto}
            partyLogo={partyLogo}
            showLogo={showLogo}
            partyLogoEligible={partyLogoEligible}
            onImageLoad={handleImageLoad}
            onCanvasPress={handleCanvasPress}
            onTextSelect={handleTextSelect}
            onTextStartEdit={handleTextStartEdit}
            onTextEndEdit={handleTextEndEdit}
            onTextDelete={handleDeleteText}
            onTextUpdate={updateTextElement}
            onProfilePhotoSelect={handleProfilePhotoSelect}
            onProfilePhotoPositionUpdate={handleProfilePhotoPositionUpdate}
            onProfilePhotoSizeUpdate={handleProfilePhotoSizeUpdate}
            onProfilePhotoError={handleProfilePhotoError}
            onPickProfilePhoto={pickProfilePhoto}
            onToggleLogo={handleToggleLogo}
            onLogoError={handleLogoError}
            showWatermark={exportWatermarkVisible}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Text Properties Panel */}
      {showTextProperties && selectedText && (
        <TextPropertiesPanel
          selectedText={selectedText}
          activeProperty={activeProperty}
          editingTextId={editingTextId}
          textElements={textElements}
          fonts={fonts}
          colors={colors}
          onClose={() => {
              setShowTextProperties(false);
              setActiveProperty(null);
              setEditingTextId(null);
              if (selectedTextId) {
                setSelectedTextId(null);
              }
          }}
          onSetActiveProperty={setActiveProperty}
          onUpdateTextElement={updateTextElement}
          onSetEditingTextId={setEditingTextId}
        />
      )}

      {/* Profile Photo Properties Panel */}
      {selectedProfilePhoto && profilePhoto && (
        <View style={styles.propertiesPanel}>
          <View style={styles.propertiesHeader}>
            <View style={styles.propertiesTitle}>
              <ImageIcon size={14} color="#6B7280" />
              <Text style={styles.propertiesTitleText}>Profile Photo</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setSelectedProfilePhoto(false);
            }}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.propertyOptionsPanel}>
            <Text style={styles.sizeLabel}>Size: {Math.round(profilePhotoSize)}px</Text>
            <Text style={styles.helpText}>Pinch with two fingers to resize, or drag to move</Text>
          </View>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <ActionButton 
          icon={<Type size={26} color="#881337" />} 
          label="Add Text" 
          active 
          onPress={handleAddText}
        />
        <ActionButton 
          icon={<ImageIcon size={26} color="#6B7280" />} 
          label="Add Image" 
          disabled
          onPress={() => comingSoon('Add Image')}
        />
          <ActionButton 
            icon={<Square size={26} color="#6B7280" />} 
            label="Add Frame" 
            disabled
            onPress={() => comingSoon('Add Frame')}
          />
          <ActionButton 
            icon={<Smile size={26} color="#6B7280" />} 
            label="Stickers" 
            disabled
            onPress={() => comingSoon('Stickers')}
          />
      </View>
    </View>
  );
}
