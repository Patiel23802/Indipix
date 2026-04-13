import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Bell,
  Heart,
  Edit,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import type { UserProfile } from '@/types';

const { width } = Dimensions.get('window');

/** Match `HomePage` header (`HOME_COLORS`). */
const HEADER = {
  primary: '#8B1A3D',
  secondary: '#EAB308',
} as const;

interface Template {
  id: string;
  name: string;
  category_slug: string;
  category_name?: string;
  description: string | null;
  file_url: string;
  file_format: string;
  aspect_ratio: string;
  status: string;
  like_count?: number;
  liked?: boolean;
  download_count?: number;
}

interface TemplatePreviewProps {
  template: Template;
  onBack: () => void;
  onNavigate?: (screen: string, params?: any) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrevTemplate?: () => void;
  onNextTemplate?: () => void;
  likeLoading?: boolean;
  onToggleLike?: () => void;
  /** Same chrome as Home: bell + profile (optional). */
  headerUser?: UserProfile | null;
  unreadNotificationCount?: number;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  /** True while parent runs horizontal slide between templates */
  interactionLocked?: boolean;
  /** When set, only the title + scroll area slide; header chrome and bottom bar stay fixed */
  slideTranslateX?: Animated.Value;
}

export function TemplatePreview({
  template,
  onBack,
  onNavigate,
  canGoPrev,
  canGoNext,
  onPrevTemplate,
  onNextTemplate,
  likeLoading,
  onToggleLike,
  headerUser,
  unreadNotificationCount = 0,
  onNotificationsPress,
  onProfilePress,
  interactionLocked = false,
  slideTranslateX,
}: TemplatePreviewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const slideStyle =
    slideTranslateX != null ? { transform: [{ translateX: slideTranslateX }] } : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [template.id]);

  const swipePan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !interactionLocked &&
          Math.abs(g.dx) > 22 &&
          Math.abs(g.dx) > Math.abs(g.dy) + 10,
        onPanResponderRelease: (_, g) => {
          if (interactionLocked) return;
          if (g.dx < -56 && canGoNext) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNextTemplate?.();
          } else if (g.dx > 56 && canGoPrev) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPrevTemplate?.();
          }
        },
      }),
    [canGoNext, canGoPrev, onNextTemplate, onPrevTemplate, interactionLocked]
  );

  const getFileUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Extract base URL without /api suffix for static files (uploads)
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present
    return `${baseUrl}${fileUrl}`;
  };

  const categoryName = template.category_name || template.category_slug;
  const templateImageUrl = template.file_url ? getFileUrl(template.file_url) : null;

  const showHeaderActions = !!(onNotificationsPress && onProfilePress);

  return (
    <View style={styles.container}>
      <View style={styles.appHeader}>
        <View style={styles.appHeaderRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }}
            style={styles.appHeaderBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={HEADER.secondary} />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.appHeaderTextBlock,
              showHeaderActions && styles.appHeaderTextBlockWithActions,
              slideStyle,
            ]}
            collapsable={false}
          >
            <Text style={styles.appHeaderTitle} numberOfLines={2}>
              {template.name}
            </Text>
            <Text style={styles.appHeaderSubtitle} numberOfLines={1}>
              {categoryName}
            </Text>
          </Animated.View>
        </View>
        {showHeaderActions ? (
          <View style={styles.appHeaderRight}>
            <TouchableOpacity
              style={styles.appHeaderIconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNotificationsPress?.();
              }}
            >
              <Bell size={22} color={HEADER.secondary} />
              {unreadNotificationCount > 0 ? <View style={styles.appHeaderNotifDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.appHeaderProfileBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onProfilePress?.();
              }}
            >
              {headerUser?.profile_photo_url ? (
                <Image
                  source={{
                    uri: headerUser.profile_photo_url.startsWith('http')
                      ? headerUser.profile_photo_url
                      : getFileUrl(headerUser.profile_photo_url),
                  }}
                  style={styles.appHeaderProfilePhoto}
                  resizeMode="cover"
                />
              ) : (
                <User size={17} color="#9ca3af" />
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Animated.View style={[styles.middleSlide, slideStyle]} collapsable={false}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContent}>
          {/* Template Preview Card — horizontal swipe changes template without leaving the screen */}
          <View style={styles.templateCard} {...swipePan.panHandlers}>
            {templateImageUrl ? (
              <Image
                source={{ uri: templateImageUrl }}
                style={styles.templateImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}

            {(canGoPrev || canGoNext) ? (
              <View style={styles.navArrowsRow} pointerEvents="box-none">
                {canGoPrev ? (
                  <TouchableOpacity
                    style={[styles.navArrow, interactionLocked && styles.navArrowDisabled]}
                    onPress={() => {
                      if (interactionLocked) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onPrevTemplate?.();
                    }}
                    disabled={interactionLocked}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Previous template"
                  >
                    <ChevronLeft size={28} color={COLORS.white} strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navArrowSpacer} />
                )}
                {canGoNext ? (
                  <TouchableOpacity
                    style={[styles.navArrow, interactionLocked && styles.navArrowDisabled]}
                    onPress={() => {
                      if (interactionLocked) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onNextTemplate?.();
                    }}
                    disabled={interactionLocked}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Next template"
                  >
                    <ChevronRight size={28} color={COLORS.white} strokeWidth={2.5} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navArrowSpacer} />
                )}
              </View>
            ) : null}
            
            {/* Favorite Button */}
            <TouchableOpacity
              style={[styles.favoriteButton, likeLoading ? styles.favoriteButtonDisabled : null]}
              onPress={() => {
                if (likeLoading || !onToggleLike) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleLike();
              }}
              disabled={likeLoading || !onToggleLike}
              accessibilityRole="button"
              accessibilityLabel={template.liked ? 'Unlike template' : 'Like template'}
            >
              <Heart
                size={24}
                color={COLORS.white}
                fill={template.liked ? COLORS.white : 'transparent'}
              />
            </TouchableOpacity>

            {/* Bottom Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradientOverlay}
            >
              <View style={styles.overlayContent}>
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>POPULAR</Text>
                  </View>
                  <Text style={styles.categoryText}>{categoryName}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>❤️ {template.like_count ?? 0}</Text>
                  <Text style={styles.statsText}>⬇️ {template.download_count ?? 0}</Text>
                </View>
                <Text style={styles.templateTitle}>{template.name}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>
        </ScrollView>
      </Animated.View>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.useButton}
          activeOpacity={0.9}
          onPress={() => onNavigate?.('template-edit', { id: template.id })}
        >
          <LinearGradient
            colors={['#881337', '#4c0519']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.useButtonGradient}
          >
            <Edit size={24} color={COLORS.white} />
            <Text style={styles.useButtonText}>Use Template</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.customizeButton}
          activeOpacity={0.8}
          onPress={() => onNavigate?.('template-edit', { id: template.id })}
        >
          <Settings size={20} color="#6B7280" />
          <Text style={styles.customizeButtonText}>Customize</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  middleSlide: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200, // Space for bottom actions
  },
  appHeader: {
    backgroundColor: HEADER.primary,
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  appHeaderBack: {
    paddingTop: 2,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
    marginBottom: 4,
  },
  appHeaderTextBlockWithActions: {
    paddingRight: 120,
  },
  appHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  appHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  appHeaderRight: {
    position: 'absolute',
    top: 44,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  appHeaderIconBtn: {
    position: 'relative',
    padding: 4,
  },
  appHeaderNotifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: HEADER.secondary,
  },
  appHeaderProfileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appHeaderProfilePhoto: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    alignItems: 'center',
  },
  templateCard: {
    width: width - 48,
    maxWidth: 400,
    aspectRatio: 4 / 5,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  favoriteButtonDisabled: {
    opacity: 0.6,
  },
  navArrowsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 5,
  },
  navArrowDisabled: {
    opacity: 0.35,
  },
  navArrow: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  navArrowSpacer: {
    width: 44,
    height: 52,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  overlayContent: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  categoryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  templateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  useButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#881337',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  useButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  useButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customizeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
});

