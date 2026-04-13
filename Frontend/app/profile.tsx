import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { ArrowLeft, User, Edit, Phone, Mail, MapPin, Briefcase, Globe } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { ProfileDetails } from '@/components/ProfileDetails';

export default function ProfileScreen() {
  const router = useRouter();
  const { state, completeProfile, logout } = useFirebaseAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show loading state while checking auth
  if (state.loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // If no user, show empty state (navigation will be handled by parent or user action)
  if (!state.user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.white, fontSize: 16 }}>Please login to view your profile</Text>
        <TouchableOpacity 
          style={[styles.loginButton, { marginTop: 20 }]} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const user = state.user;

  const formatPhone = (phone: string) => {
    if (phone && phone.length === 10) {
      return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
    return phone;
  };

  const getFileUrl = (fileUrl: string | null) => {
    if (!fileUrl) return null;
    // If file_url already starts with http, return as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Otherwise, prepend the backend URL
    // Extract base URL without /api suffix for static files (uploads)
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present
    return `${baseUrl}${fileUrl}`;
  };

  const handleEditProfile = async (data: {
    title: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    alternate_phone: string;
    email?: string;
    state?: string;
    district?: string;
    tahsil?: string;
    designation?: string;
    political_party?: string;
    profile_photo_url?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Saving profile data:', data);
      const result = await completeProfile(data as Partial<any>);
      console.log('Profile save result:', result);
      
      if (result.success) {
        // Wait a moment for state to update, then exit edit mode
        setTimeout(() => {
          setIsEditing(false);
        }, 100);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.editHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setIsEditing(false)}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <ProfileDetails
          phone={user.phone_number}
          category={user.category ?? null}
          onContinue={handleEditProfile}
          loading={loading}
          error={error}
          initialData={{
            title: user.title,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            alternate_phone: user.alternate_phone,
            email: user.email,
            state: user.state,
            district: user.district,
            tahsil: user.tahsil,
            designation: user.designation,
            political_party: user.political_party,
            profile_photo_url: user.profile_photo_url,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Edit size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Content */}
        <View style={styles.content}>
          {/* Profile Photo Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileIconContainer}>
              {user.profile_photo_url ? (
                <Image
                  source={{ uri: getFileUrl(user.profile_photo_url) || user.profile_photo_url }}
                  style={styles.profileImage}
                />
              ) : (
                <User size={48} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.profileName}>
              {user.title && `${user.title} `}
              {user.first_name} {user.middle_name} {user.last_name}
            </Text>
            <Text style={styles.profileCategory}>
              {user.category ? user.category.charAt(0).toUpperCase() + user.category.slice(1).replace('-', ' ') : 'Individual'}
            </Text>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Phone size={16} color={COLORS.grayLight} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{formatPhone(user.phone_number)}</Text>
              </View>
            </View>

            {user.alternate_phone && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Phone size={16} color={COLORS.grayLight} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Alternate Phone</Text>
                  <Text style={styles.infoValue}>{formatPhone(user.alternate_phone)}</Text>
                </View>
              </View>
            )}

            {user.email && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Mail size={16} color={COLORS.grayLight} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Location Details */}
          {(user.state || user.district || user.tahsil) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MapPin size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Location Details</Text>
              </View>

              {user.state && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MapPin size={16} color={COLORS.grayLight} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>State</Text>
                    <Text style={styles.infoValue}>{user.state}</Text>
                  </View>
                </View>
              )}

              {user.district && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MapPin size={16} color={COLORS.grayLight} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>District</Text>
                    <Text style={styles.infoValue}>{user.district}</Text>
                  </View>
                </View>
              )}

              {user.tahsil && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MapPin size={16} color={COLORS.grayLight} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Tahsil</Text>
                    <Text style={styles.infoValue}>{user.tahsil}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Professional Information (Politicians only) */}
          {user.category === 'politicians' && (user.designation || user.political_party) ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Briefcase size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Professional</Text>
              </View>

              {user.designation && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Briefcase size={16} color={COLORS.grayLight} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Designation</Text>
                    <Text style={styles.infoValue}>{user.designation}</Text>
                  </View>
                </View>
              )}

              {user.political_party && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Briefcase size={16} color={COLORS.grayLight} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Political Party</Text>
                    <Text style={styles.infoValue}>{user.political_party}</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {/* Language */}
          {user.language && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Globe size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Language</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Globe size={16} color={COLORS.grayLight} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Preferred Language</Text>
                  <Text style={styles.infoValue}>
                    {user.language === 'en' ? 'English' : 
                     user.language === 'hi' ? 'Hindi' : 
                     user.language === 'mr' ? 'Marathi' : user.language}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 19, 73, 0.1)',
    borderRadius: 20,
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  profileCategory: {
    fontSize: 16,
    color: COLORS.grayLight,
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
  },
  spacer: {
    height: 40,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '700',
  },
});
