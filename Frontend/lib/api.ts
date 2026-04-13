// API client for backend communication
import Constants from 'expo-constants';

// Get API URL from environment variable or Expo config
const getApiBaseUrl = () => {
  // First try process.env (works in development and if set at build time)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback to Expo Constants (works in APK builds)
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;
  }
  
  // Final fallback
  return 'http://64.227.150.214:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
// Import FileSystem for React Native file operations
let FileSystem: any = null;
if (typeof window === 'undefined' || !window.File) {
  // React Native environment - try to import expo-file-system
  try {
    FileSystem = require('expo-file-system');
  } catch (e) {
    console.warn('expo-file-system not available');
  }
}

// Log API base URL on module load (for debugging)
console.log('API Base URL:', API_BASE_URL);

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, options.method || 'GET');
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        if (!response.ok) {
          const isTemplateShare = endpoint.includes('/template-share');
          const hint =
            response.status === 404 && isTemplateShare
              ? 'Template sharing is not enabled on the server (404). Add template-share routes and run db/template_share_schema.sql — see backend/TEMPLATE_SHARE_INTEGRATION.md.'
              : `Server error (${response.status}). The response was not JSON (often a missing API route or proxy page).`;
          console.error('API non-JSON error body:', text.slice(0, 120));
          return { success: false, error: hint };
        }
        console.error('Failed to parse success response as JSON');
        throw new Error(`Invalid response from server (status: ${response.status})`);
      }
    }

    // Check if response is ok (status 200-299)
    if (!response.ok) {
      const errorMessage =
        (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        (response.status === 404 && endpoint.includes('/template-share')
          ? 'Template sharing is not enabled on the server (404). See backend/TEMPLATE_SHARE_INTEGRATION.md.'
          : `Server error (${response.status})`);
      console.error('API Error:', errorMessage, 'Status:', response.status);
      return { success: false, error: errorMessage };
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error('API Request failed:', errorMessage, 'Endpoint:', endpoint);
    
    // Provide more helpful error messages
    if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please check your internet connection.`);
    }
    
    throw new Error(errorMessage);
  }
}

export const api = {
  // Auth endpoints
  checkPhoneExists: (phone: string) =>
    apiRequest('/auth/check-phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  signUp: (phone: string, password: string) =>
    apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  login: (phone: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  sendOTP: (phone: string) =>
    apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOTP: (phone: string, otp: string) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),

  // Firebase OTP methods
  sendFirebaseOTP: (phone: string, fallback: boolean = false) =>
    apiRequest('/auth/send-firebase-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, fallback }),
    }),

  // Verifies phone auth on backend using Firebase ID token (preferred).
  // If firebaseIdToken is omitted, backend will fall back to test mode.
  // password is required for new user signup (account created after OTP verification).
  verifyFirebaseOTP: (params: { phone: string; firebaseIdToken?: string; verificationId?: string; password?: string }) =>
    apiRequest('/auth/verify-firebase-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  verifyPhoneForReset: (params: { phone: string; firebaseIdToken?: string; verificationId?: string }) =>
    apiRequest('/auth/verify-phone-for-reset', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  resetPassword: (params: {
    phone: string;
    newPassword: string;
    firebaseIdToken?: string;
    verificationId?: string;
  }) =>
    apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  completeProfile: (userId: string, profileData: any) =>
    apiRequest('/auth/complete-profile', {
      method: 'PUT',
      body: JSON.stringify({ userId, ...profileData }),
    }),

  getProfile: (userId: string) =>
    apiRequest(`/auth/profile/${userId}`, {
      method: 'GET',
    }),

  // Public endpoints for categories and templates
  getCategories: () => apiRequest('/categories', { method: 'GET' }),

  /** Active home banner carousel images (max 3), for app home screen */
  getHomeCarouselSlides: () => apiRequest('/home-carousel-slides', { method: 'GET' }),

  getTemplates: (params?: { category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    const query = queryParams.toString();
    return apiRequest(`/templates${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getTemplatesWithLikes: (params?: {
    category?: string;
    search?: string;
    userId?: string | number;
    limit?: number;
    offset?: number;
    /** Global most-liked order (no category filter). Backend: sort=trending */
    sort?: 'trending';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.userId !== undefined && params?.userId !== null) queryParams.append('user_id', String(params.userId));
    if (params?.limit !== undefined && params?.limit !== null && params.limit > 0) {
      queryParams.append('limit', String(params.limit));
    }
    if (params?.offset !== undefined && params?.offset !== null && params.offset > 0) {
      queryParams.append('offset', String(params.offset));
    }
    if (params?.sort === 'trending') {
      queryParams.append('sort', 'trending');
    }
    const query = queryParams.toString();
    return apiRequest(`/templates${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getLikedTemplates: (userId: string | number) =>
    apiRequest(`/templates/liked?user_id=${encodeURIComponent(String(userId))}`, { method: 'GET' }),

  likeTemplate: (templateId: string, userId: string | number) =>
    apiRequest(`/templates/${encodeURIComponent(templateId)}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId: String(userId) }),
    }),

  unlikeTemplate: (templateId: string, userId: string | number) =>
    apiRequest(`/templates/${encodeURIComponent(templateId)}/like`, {
      method: 'DELETE',
      body: JSON.stringify({ userId: String(userId) }),
    }),

  recordTemplateDownload: (templateId: string, userId?: string | number | null) =>
    apiRequest(`/templates/${encodeURIComponent(templateId)}/download`, {
      method: 'POST',
      body: JSON.stringify({ userId: userId === undefined || userId === null ? null : String(userId) }),
    }),

  getNotifications: (userId: string | number) =>
    apiRequest(`/notifications?user_id=${encodeURIComponent(String(userId))}`, { method: 'GET' }),

  getUnreadNotificationCount: (userId: string | number) =>
    apiRequest(
      `/notifications/unread-count?user_id=${encodeURIComponent(String(userId))}`,
      { method: 'GET' }
    ),

  markAllNotificationsRead: (userId: string | number) =>
    apiRequest('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId: String(userId) }),
    }),

  markNotificationRead: (userId: string | number, notificationId: string | number) =>
    apiRequest(`/notifications/${encodeURIComponent(String(notificationId))}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ userId: String(userId) }),
    }),

  registerPushToken: (params: { userId: string | number; token: string; platform?: string; appVersion?: string }) =>
    apiRequest('/push/register-token', {
      method: 'POST',
      body: JSON.stringify({
        userId: String(params.userId),
        token: String(params.token || ''),
        platform: params.platform || null,
        appVersion: params.appVersion || null,
      }),
    }),

  unregisterPushToken: (token: string) =>
    apiRequest('/push/unregister-token', {
      method: 'POST',
      body: JSON.stringify({ token: String(token || '') }),
    }),

  /** In-app template sharing (1:1 conversations; messages are template references only) */
  getTemplateShareConversations: (userId: string | number) =>
    apiRequest(`/template-share/conversations?user_id=${encodeURIComponent(String(userId))}`, {
      method: 'GET',
    }),

  openTemplateShareConversation: (params: {
    userId: string | number;
    otherUserId?: string | number;
    otherPhone?: string;
  }) =>
    apiRequest('/template-share/conversations/open', {
      method: 'POST',
      body: JSON.stringify({
        user_id: String(params.userId),
        ...(params.otherUserId != null ? { other_user_id: String(params.otherUserId) } : {}),
        ...(params.otherPhone ? { other_phone: params.otherPhone } : {}),
      }),
    }),

  getTemplateShareMessages: (conversationId: string, userId: string | number, limit = 50) =>
    apiRequest(
      `/template-share/conversations/${encodeURIComponent(conversationId)}/messages?user_id=${encodeURIComponent(String(userId))}&limit=${limit}`,
      { method: 'GET' }
    ),

  sendTemplateShareMessage: (
    conversationId: string,
    userId: string | number,
    templateId: string
  ) =>
    apiRequest(`/template-share/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: String(userId),
        template_id: String(templateId),
      }),
    }),

  /** Match device phone numbers to registered users (for contact picker). Max ~250 numbers. */
  matchTemplateShareContacts: (userId: string | number, phones: string[]) =>
    apiRequest('/template-share/contacts/match', {
      method: 'POST',
      body: JSON.stringify({
        user_id: String(userId),
        phones: Array.isArray(phones) ? phones : [],
      }),
    }),

  /** Feedback from the Contact tab (admin reads via /api/admin/suggestions) */
  submitSuggestion: (params: { userId: string | number; message: string; subject?: string }) =>
    apiRequest('/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        userId: String(params.userId),
        message: params.message,
        ...(params.subject?.trim() ? { subject: params.subject.trim() } : {}),
      }),
    }),

  // Location endpoints
  getStates: () => apiRequest('/locations/states', { method: 'GET' }),
  getDistricts: (stateId: string) => apiRequest(`/locations/districts?state_id=${stateId}`, { method: 'GET' }),
  getTehsils: (districtId: string) => apiRequest(`/locations/tehsils?district_id=${districtId}`, { method: 'GET' }),

  // Political parties: filtered by state (states.id). Use lookup for a single name (e.g. logos).
  getPoliticalParties: (stateId: string) =>
    apiRequest(`/political-parties?state_id=${encodeURIComponent(stateId)}`, { method: 'GET' }),

  lookupPoliticalPartyByName: (name: string) =>
    apiRequest(`/political-parties/lookup?name=${encodeURIComponent(name)}`, { method: 'GET' }),

  // Upload profile photo
  uploadProfilePhoto: async (userId: string, photoUri: string) => {
    console.log('Uploading profile photo:', { 
      userId, 
      photoUri
    });

    try {
      // Handle data URIs (base64 from ImagePicker) - works on both web and mobile
      if (photoUri.startsWith('data:')) {
        // Extract base64 from data URI: data:image/jpeg;base64,<base64>
        const base64Match = photoUri.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match && base64Match[2]) {
          let base64 = base64Match[2].trim();
          const mimeType = `image/${base64Match[1]}`;
          const ext = base64Match[1] === 'png' ? 'png' : 'jpg';
          const filename = `profile-photo.${ext}`;
          
          // Validate base64
          const base64Regex = /^[A-Za-z0-9+/=]+$/;
          if (!base64Regex.test(base64)) {
            throw new Error('Invalid base64 data format.');
          }
          
          console.log('Using base64 from data URI, length:', base64.length);
          
          // Send directly to backend
          const endpoint = `${API_BASE_URL}/auth/upload-profile-photo-base64`;
          const uploadResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userId,
              photo: base64,
              filename: filename,
              mimeType: mimeType,
            }),
          });
          
          const responseText = await uploadResponse.text();
          console.log('Upload response status:', uploadResponse.status);
          console.log('Upload response:', responseText.substring(0, 200));
          
          if (!uploadResponse.ok) {
            let errorData;
            try {
              errorData = JSON.parse(responseText);
            } catch {
              errorData = { error: responseText || 'Upload failed' };
            }
            throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
          }
          
          return JSON.parse(responseText);
        } else {
          throw new Error('Invalid data URI format.');
        }
      }

      // Check if we're on web or native
      // Priority: If FileSystem exists, it's React Native (even if window/File exist)
      const isWeb = typeof window !== 'undefined' && typeof File !== 'undefined' && !FileSystem;
      
      console.log('Platform detection:', { 
        isWeb, 
        hasFileSystem: !!FileSystem,
        willUseBase64: !!FileSystem
      });

      if (isWeb) {
        // For web, use fetch with FormData
        const formData = new FormData();
        const response = await fetch(photoUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Image file is empty or could not be read. Please select a valid image file.');
        }
        const filename = 'profile-photo.jpg';
        formData.append('photo', blob, filename);
        formData.append('userId', userId);

        const uploadResponse = await fetch(`${API_BASE_URL}/auth/upload-profile-photo`, {
          method: 'POST',
          body: formData,
        });

        const responseText = await uploadResponse.text();
        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response:', responseText);

        if (!uploadResponse.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { error: responseText || 'Upload failed' };
          }
          throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
        }

        return JSON.parse(responseText);
      } else {
        // For React Native, handle file uploads properly
        if (!FileSystem) {
          throw new Error('FileSystem is not available. Cannot upload photo from mobile device.');
        }
        // content:// URIs on Android need special handling
        return new Promise(async (resolve, reject) => {
          try {
            let uploadUri = photoUri;
            
            // Handle content:// URIs on Android by copying to temporary file:// location
          let tempUri: string | null = null;
            if (photoUri.startsWith('content://') && FileSystem) {
              try {
                console.log('Converting content:// URI to file:// URI');
                // Create a temporary file path
                const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                            tempUri = `${FileSystem.cacheDirectory}${tempFileName}`;
                
                // Copy the file from content:// to file://
                await FileSystem.copyAsync({
                  from: photoUri,
                  to: tempUri,
                });
                
                // Verify the copied file
                const fileInfo = await FileSystem.getInfoAsync(tempUri);
                if (!fileInfo.exists || fileInfo.size === 0) {
                  reject(new Error('Failed to copy file. Please try again.'));
                  return;
                }
                
                console.log('File copied successfully:', { from: photoUri, to: tempUri, size: fileInfo.size });
                uploadUri = tempUri;
                
                // Clean up temp file after upload (in finally block)
              } catch (copyError: any) {
                console.error('Error copying file:', copyError);
                reject(new Error('Failed to process image. Please try again.'));
                return;
              }
            } else if (FileSystem) {
              // Verify file exists for file:// URIs
              try {
                const fileInfo = await FileSystem.getInfoAsync(photoUri);
                if (!fileInfo.exists) {
                  reject(new Error('Selected file does not exist. Please select a valid image.'));
                  return;
                }
                console.log('File info:', { exists: fileInfo.exists, size: fileInfo.size, uri: photoUri });
                if (fileInfo.size === 0) {
                  reject(new Error('Selected file is empty. Please select a valid image.'));
                  return;
                }
              } catch (fileError) {
                console.warn('Could not verify file info:', fileError);
              }
            }
            
            // Verify file exists
            const fileInfo = await FileSystem.getInfoAsync(uploadUri);
            if (!fileInfo.exists) {
              reject(new Error('Selected file does not exist. Please select a valid image.'));
              return;
            }
            
            if (fileInfo.size === 0) {
              reject(new Error('Selected file is empty. Please select a valid image.'));
              return;
            }
            
            console.log('Reading file:', { uri: uploadUri, size: fileInfo.size });
            
            // Read file as base64
            let base64: string;
            try {
              base64 = await FileSystem.readAsStringAsync(uploadUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              // Trim whitespace and newlines that might corrupt the base64
              base64 = base64.trim().replace(/\s/g, '');
              
              if (!base64 || base64.length === 0) {
                reject(new Error('Failed to read image file: file appears to be empty.'));
                return;
              }
              
              // Validate base64 string format
              const base64Regex = /^[A-Za-z0-9+/=]+$/;
              if (!base64Regex.test(base64)) {
                reject(new Error('Failed to read image file: invalid data format.'));
                return;
              }
              
              console.log('File read successfully, base64 length:', base64.length, 'first 50 chars:', base64.substring(0, 50));
            } catch (readError: any) {
              console.error('Error reading file:', readError);
              reject(new Error(`Failed to read image file: ${readError.message || 'Unknown error'}`));
              return;
            }
            
            // Determine MIME type
            const filename = uploadUri.split('/').pop() || 'profile-photo.jpg';
            const match = /\.(\w+)$/.exec(filename.toLowerCase());
            let mimeType = 'image/jpeg';
            if (match) {
              const ext = match[1].toLowerCase();
              if (ext === 'png') mimeType = 'image/png';
              else if (ext === 'gif') mimeType = 'image/gif';
              else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            }
            
            console.log('Uploading file as base64:', { 
              base64Length: base64.length, 
              mimeType, 
              filename,
              base64Preview: base64.substring(0, 30) + '...'
            });
            
            // Send base64 as JSON to backend
            const endpoint = `${API_BASE_URL}/auth/upload-profile-photo-base64`;
            const uploadResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: userId,
                photo: base64,
                filename: filename,
                mimeType: mimeType,
              }),
            });
            
            // Clean up temp file
            if (tempUri) {
              FileSystem.deleteAsync(tempUri, { idempotent: true }).catch((err: any) => {
                console.warn('Failed to delete temp file:', err);
              });
            }
            
            const responseText = await uploadResponse.text();
            console.log('Upload response status:', uploadResponse.status);
            console.log('Upload response:', responseText);
            
            if (!uploadResponse.ok) {
              let errorData;
              try {
                errorData = JSON.parse(responseText);
              } catch {
                errorData = { error: responseText || 'Upload failed' };
              }
              reject(new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`));
              return;
            }
            
            const data = JSON.parse(responseText);
            console.log('Upload successful:', data);
            resolve(data);
          } catch (error) {
            console.error('Upload setup error:', error);
            reject(new Error(error instanceof Error ? error.message : 'Upload failed'));
          }
        });
      }
    } catch (error) {
      console.error('Upload profile photo error:', error);
      throw new Error(error instanceof Error ? error.message : 'Network error');
    }
  },
};

