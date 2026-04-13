import { useState, useEffect } from 'react';
import { Alert, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { TextElement, Template } from './types';
import { getFileUrl, parseAspectRatio, profileCategoryShowsPartyLogo } from './utils';
import { api } from '@/lib/api';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

const { width } = Dimensions.get('window');

const DOWNLOADED_TEMPLATES_KEY_PREFIX = 'chitrakala_downloaded_templates_v1_';

type DownloadedTemplateEntry = {
  id: string;
  name: string;
  file_url?: string | null;
  category_slug?: string | null;
  aspect_ratio?: string | null;
  downloaded_at: number;
};

interface UseTemplateEditorProps {
  template: Template;
  continueEditing: boolean;
  canvasWidth: number;
  canvasHeight: number;
  imageDimensions: { width: number; height: number } | null;
  canvasRef: React.RefObject<ViewShot | null>;
}

export function useTemplateEditor({
  template,
  continueEditing,
  canvasWidth,
  canvasHeight,
  imageDimensions,
  canvasRef,
}: UseTemplateEditorProps) {
  const { state } = useFirebaseAuth();
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showTextProperties, setShowTextProperties] = useState(false);
  const [activeProperty, setActiveProperty] = useState<'font' | 'color' | 'size' | 'shadow' | 'format' | null>(null);
  const [history, setHistory] = useState<TextElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [partyLogo, setPartyLogo] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoSize, setProfilePhotoSize] = useState<number>(120);
  const [profilePhotoPosition, setProfilePhotoPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportWatermarkVisible, setExportWatermarkVisible] = useState(false);

  // Storage key for auto-save (include user ID to isolate per user)
  const storageKey = `template_editor_${state.user?.id || 'anonymous'}_${template.id}`;

  // Initialize profile photo position when canvas dimensions are available or when profile photo is loaded
  useEffect(() => {
    if (profilePhoto && profilePhotoPosition === null && canvasWidth > 0 && canvasHeight > 0) {
      setProfilePhotoPosition({ 
        x: canvasWidth - 140,
        y: canvasHeight - 140 
      });
    }
  }, [canvasWidth, canvasHeight, profilePhotoPosition, profilePhoto]);

  // Load saved state on mount only if continueEditing is true
  useEffect(() => {
    if (continueEditing) {
      loadSavedState();
    }
    fetchPartyLogo();
    fetchProfilePhoto();
  }, [continueEditing, state.user?.id, state.user?.category, state.user?.political_party]);

  // Auto-save whenever textElements change (debounced)
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      saveState();
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [textElements, showLogo, profilePhoto, profilePhotoPosition, profilePhotoSize]);

  const loadSavedState = async () => {
    try {
      const savedData = await AsyncStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.textElements && parsed.textElements.length > 0) {
          setTextElements(parsed.textElements);
          setHistory([parsed.textElements]);
          setHistoryIndex(0);
        }
        if (parsed.showLogo !== undefined && profileCategoryShowsPartyLogo(state.user?.category)) {
          setShowLogo(parsed.showLogo);
        }
        if (parsed.profilePhoto) {
          setProfilePhoto(parsed.profilePhoto);
        }
        if (parsed.profilePhotoPosition) {
          setProfilePhotoPosition(parsed.profilePhotoPosition);
        }
        if (parsed.profilePhotoSize !== undefined) {
          setProfilePhotoSize(parsed.profilePhotoSize);
        }
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  };

  const saveState = async () => {
    try {
      const stateToSave = {
        textElements,
        showLogo,
        profilePhoto,
        profilePhotoPosition,
        profilePhotoSize,
        templateId: template.id,
        templateName: template.name,
        /** Base image URL for home “Continue your masterpiece” (not dependent on loaded category lists) */
        templateFileUrl: template.file_url ?? null,
        lastSaved: Date.now(),
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(stateToSave));
      console.log('Saved template state:', storageKey, stateToSave);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  const storeDownloadedTemplateLocally = async () => {
    try {
      const key = `${DOWNLOADED_TEMPLATES_KEY_PREFIX}${state.user?.id || 'anonymous'}`;
      const existingRaw = await AsyncStorage.getItem(key);
      const existing: DownloadedTemplateEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      const now = Date.now();
      const entry: DownloadedTemplateEntry = {
        id: String(template.id),
        name: template.name,
        file_url: template.file_url ?? null,
        category_slug: (template as any).category_slug ?? null,
        aspect_ratio: template.aspect_ratio ?? null,
        downloaded_at: now,
      };
      const withoutDup = existing.filter((e) => String(e.id) !== String(entry.id));
      const next = [entry, ...withoutDup].slice(0, 100);
      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setExportWatermarkVisible(true);
      // Allow watermark to render before capture (kept extremely short).
      await new Promise((r) => setTimeout(r, 32));
      
      if (Platform.OS === 'web') {
        await downloadWebImage();
        await storeDownloadedTemplateLocally();
        try {
          await api.recordTemplateDownload(String(template.id), state.user?.id ?? null);
        } catch {}
      } else {
        if (!canvasRef.current || !canvasRef.current.capture) {
          Alert.alert('Error', 'Canvas not ready. Please try again.');
          setIsDownloading(false);
          return;
        }
        
        const uri = await canvasRef.current.capture();
        
        if (!uri) {
          Alert.alert('Error', 'Failed to capture image. Please try again.');
          setIsDownloading(false);
          return;
        }

        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Save your template',
          });
          Alert.alert('Success', 'Image saved successfully!');
          await storeDownloadedTemplateLocally();
          try {
            await api.recordTemplateDownload(String(template.id), state.user?.id ?? null);
          } catch {}
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      }
    } catch (error) {
      console.error('Error downloading:', error);
      Alert.alert('Error', 'Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
      setExportWatermarkVisible(false);
    }
  };

  const downloadWebImage = async () => {
    try {
      // @ts-ignore - html2canvas types may not be available
      const html2canvas = (await import('html2canvas')).default;
      
      const canvasElement = canvasRef.current;
      if (!canvasElement) {
        throw new Error('Canvas element not found');
      }

      // @ts-ignore - React Native Web ref structure
      const domElement = canvasElement._nativeNode || canvasElement;
      
      const canvas = await html2canvas(domElement, {
        width: canvasWidth,
        height: canvasHeight,
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `chitrakal_${template.name}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          Alert.alert('Success', 'Image downloaded successfully!');
        } else {
          Alert.alert('Error', 'Failed to create image file.');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      throw error;
    }
  };

  const fetchPartyLogo = async () => {
    try {
      const userProfile = state.user;
      if (!profileCategoryShowsPartyLogo(userProfile?.category)) {
        setPartyLogo(null);
        setShowLogo(false);
        return;
      }

      console.log('User profile:', userProfile);
      console.log('Political party:', userProfile?.political_party);
      
      if (userProfile?.political_party) {
        const response = await api.lookupPoliticalPartyByName(userProfile.political_party);
        console.log('Political party lookup response:', response);

        if (response.success && response.data) {
          const userParty = response.data as {
            logo_url?: string | null;
            short_name?: string | null;
            color?: string | null;
            name?: string;
          };

          console.log('Found party:', userParty);
          console.log('Party logo URL:', userParty?.logo_url);

          if (userParty.logo_url) {
            setPartyLogo(userParty.logo_url);
            setShowLogo(true);
            console.log('Logo set successfully from database');
          } else if (userParty.short_name) {
            const color = userParty.color?.replace('#', '') || 'FF9933';
            const svgContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#${color}"/>
                <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="bold" 
                      fill="white" text-anchor="middle" dominant-baseline="middle">${userParty.short_name}</text>
              </svg>`;
            const encodedSvg = encodeURIComponent(svgContent);
            const svgLogo = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
            setPartyLogo(svgLogo);
            setShowLogo(true);
            console.log('Using SVG placeholder logo for:', userParty.short_name);
          } else {
            console.log('No logo URL or short_name found for party:', userParty?.name);
          }
        } else {
          console.log('Party not found. User party:', userProfile.political_party);
        }
      } else {
        console.log('No political party in user profile');
      }
    } catch (error) {
      console.error('Error fetching party logo:', error);
    }
  };

  const fetchProfilePhoto = async () => {
    try {
      const userProfile = state.user;
      if (userProfile?.profile_photo_url) {
        const photoUrl = userProfile.profile_photo_url.startsWith('http') 
          ? userProfile.profile_photo_url 
          : getFileUrl(userProfile.profile_photo_url);
        
        try {
          const response = await fetch(photoUrl, { method: 'HEAD' });
          if (response.ok) {
            setProfilePhoto(photoUrl);
            console.log('Profile photo set:', photoUrl);
          } else {
            console.warn('Profile photo not found (status:', response.status, '):', photoUrl);
            setProfilePhoto(null);
          }
        } catch (fetchError) {
          console.warn('Profile photo URL not accessible:', photoUrl);
          setProfilePhoto(null);
        }
      } else {
        console.log('No profile photo URL in user profile');
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error);
    }
  };

  const handleProfilePhotoError = () => {
    if (__DEV__) {
      console.warn('Profile photo failed to load:', profilePhoto);
    }
    setProfilePhoto(null);
  };

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to add a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === 'web' ? false : true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let photoUri = asset.uri;
        
        if (Platform.OS !== 'web' && asset.base64) {
          photoUri = `data:image/jpeg;base64,${asset.base64}`;
        }
        
        setProfilePhoto(photoUri);
        
        if (!profilePhotoPosition && canvasWidth > 0 && canvasHeight > 0) {
          setProfilePhotoPosition({ 
            x: canvasWidth - 120, 
            y: canvasHeight - 120 
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTextElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTextElements(history[historyIndex + 1]);
    }
  };

  const handleAddText = () => {
    const newText: TextElement = {
      id: Date.now().toString(),
      text: '',
      x: canvasWidth * 0.2,
      y: canvasHeight * 0.4,
      width: canvasWidth * 0.6,
      height: 40,
      fontSize: 24,
      color: '#FFFFFF',
      fontFamily: 'System',
      textAlign: 'center',
      textShadow: false,
    };
    const newElements = [...textElements, newText];
    setTextElements(newElements);
    setSelectedTextId(newText.id);
    setShowTextProperties(true);
    setActiveProperty(null);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleDeleteText = (id: string) => {
    const newElements = textElements.filter(el => el.id !== id);
    setTextElements(newElements);
    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(prevElements => {
      const newElements = prevElements.map(el => {
        if (el.id === id) {
          const mergedUpdates = { ...el, ...updates };
          if (updates.text === undefined) {
            mergedUpdates.text = el.text || '';
          } else if (updates.text === '' && el.text && el.text.trim().length > 0) {
            mergedUpdates.text = el.text;
          }
          return mergedUpdates;
        }
        return el;
      });
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newElements);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return newElements;
    });
  };

  const partyLogoEligible = profileCategoryShowsPartyLogo(state.user?.category);

  return {
    // State
    textElements,
    selectedTextId,
    editingTextId,
    showTextProperties,
    activeProperty,
    history,
    historyIndex,
    historyLength: history.length,
    partyLogo,
    showLogo,
    partyLogoEligible,
    profilePhoto,
    profilePhotoSize,
    profilePhotoPosition,
    selectedProfilePhoto,
    isDownloading,
    exportWatermarkVisible,
    // Setters
    setSelectedTextId,
    setEditingTextId,
    setShowTextProperties,
    setActiveProperty,
    setShowLogo,
    setProfilePhotoPosition,
    setProfilePhotoSize,
    setSelectedProfilePhoto,
    // Handlers
    handleDownload,
    handleUndo,
    handleRedo,
    handleAddText,
    handleDeleteText,
    updateTextElement,
    pickProfilePhoto,
    handleProfilePhotoError,
  };
}
