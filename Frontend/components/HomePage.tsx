import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, User, Home, Heart, TrendingUp, Download, Mail, MessageCircle, Camera, Play, Facebook, Phone, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/types';
import { COLORS } from '@/constants/colors';
import { api } from '@/lib/api';
import { ContactSuggestionsScreen } from '@/components/ContactSuggestionsScreen';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Template {
  id: string;
  name: string;
  category_slug: string;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  description: string | null;
  file_url: string;
  file_format: string;
  aspect_ratio: string;
  status: string;
  like_count?: number;
  download_count?: number;
  liked?: boolean;
  created_at?: string | null;
}

const DOWNLOADED_TEMPLATES_KEY_PREFIX = 'chitrakala_downloaded_templates_v1_';

// WhatsApp Icon Component (speech bubble with phone)
const WhatsAppIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ position: 'relative', width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <MessageCircle size={size} color={color} strokeWidth={2.5} fill="none" />
    <Phone 
      size={size * 0.35} 
      color={color} 
      strokeWidth={2.5} 
      style={{ position: 'absolute' }} 
    />
  </View>
);

const CREATE_OPTIONS = [
  { 
    name: 'WhatsApp\nStatus', 
    icon: 'whatsapp' as const, 
    color: '#25D366', 
    gradient: ['#25D366', '#128C7E'] 
  },
  { 
    name: 'Instagram\nReels', 
    icon: Camera, 
    color: '#E1306C', 
    gradient: ['#833AB4', '#E1306C', '#FCAF45'] 
  },
  { 
    name: 'YouTube\nShorts', 
    icon: Play, 
    color: '#FF0000', 
    gradient: ['#FF0000', '#CC0000'] 
  },
  { 
    name: 'Facebook\nPost', 
    icon: Facebook, 
    color: '#1877F2', 
    gradient: ['#1877F2', '#0C63D4'] 
  },
];


interface HomePageProps {
  user: UserProfile;
  onLogout: () => void;
  onNavigate?: (screen: string, params?: any) => void;
  /** When set (e.g. from push / in-app tap), switch to Home tab and open this category’s templates */
  initialOpenCategorySlug?: string;
  onClearOpenCategoryParam?: () => void;
}

interface SavedTemplate {
  templateId: string;
  templateName: string;
  lastSaved: number;
  textElements: any[];
  showLogo: boolean;
  profilePhoto: string | null;
  /** Persisted from editor so thumbnails work without loading that template’s category */
  templateFileUrl?: string | null;
  storageKey?: string;
}

// Skeleton Loading Component
const TemplateSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonTitleCompact} />
  </View>
);

type HomeCarouselSlide = { id: string; image_url: string };

/** Max category rows on home (e.g. Festival, Birthday, …). */
const HOME_BROWSE_CATEGORY_ROWS = 5;
/** Template thumbnails per row before the “View more” tile. */
const HOME_BROWSE_TEMPLATES_PER_ROW = 5;
/** Sliding home rows: how many thumbs fit fully across the screen. */
const HOME_SLIDING_THUMBS_VISIBLE = 3;
/** Must match `styles.mainContent.paddingHorizontal`. */
const HOME_SCROLL_PAD_X = 8;
/** Must match `styles.homeTemplateThumb.marginRight`. */
const HOME_THUMB_SPACING = 12;
/** Templates per page when viewing a category’s full grid. */
const CATEGORY_TEMPLATES_PAGE_SIZE = 10;
/** Top N templates on the Trending tab (global, not category-wise). */
const TRENDING_LIMIT = 30;

type DownloadedTemplate = Template & { downloaded_at?: number };

/** Same card as the home “category templates” grid (2-column, square thumb, Use row). */
function HomeCategoryTemplateGridCard({
  template,
  getFileUrl,
  onPressTemplate,
  onToggleLike,
  showUseButton = false,
}: {
  template: Template;
  getFileUrl: (u: string) => string;
  onPressTemplate: (t: Template) => void;
  onToggleLike: (t: Template) => void;
  showUseButton?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.templateCard, !showUseButton && styles.templateCardThumbOnly]}
      onPress={() => onPressTemplate(template)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.templateImageContainer,
          !showUseButton && styles.templateImageContainerThumbOnly,
        ]}
      >
        {template.file_url ? (
          <Image
            source={{ uri: getFileUrl(template.file_url) }}
            style={styles.templateImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.templateImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.templateCardOverlayGradient}
        >
          <View style={styles.homeOverlayStatsRow}>
            <Text style={styles.homeOverlayStatsText}>
              ❤️ {template.like_count ?? 0}
            </Text>
            <Text style={styles.homeOverlayStatsText}>
              ⬇️ {template.download_count ?? 0}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.templateCardOverlayTitle}>
            {template.name}
          </Text>
        </LinearGradient>
        <TouchableOpacity
          style={styles.templateGridHeartBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleLike(template);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.85}
        >
          <Heart
            size={18}
            color={template.liked ? '#F87171' : COLORS.white}
            fill={template.liked ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      {showUseButton ? (
        <View style={styles.templateFooter}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onPressTemplate(template);
            }}
          >
            <Text style={styles.actionButtonText}>Use</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function TrendingCategoryRow({
  section,
  getFileUrl,
  onPressTemplate,
  onToggleLike,
}: {
  section: TrendingSection;
  getFileUrl: (u: string) => string;
  onPressTemplate: (t: Template) => void;
  onToggleLike: (t: Template) => void;
}) {
  return (
    <View style={styles.trendingCategorySection}>
      <Text style={styles.trendingCategoryTitle}>{section.category.name}</Text>
      <View style={styles.templatesGrid}>
        {section.templates.map((template) => (
          <HomeCategoryTemplateGridCard
            key={template.id}
            template={template}
            getFileUrl={getFileUrl}
            onPressTemplate={onPressTemplate}
            onToggleLike={onToggleLike}
          />
        ))}
      </View>
    </View>
  );
}

function templatesListFromApiResponse(response: unknown): Template[] {
  const r = response as {
    success?: boolean;
    data?: unknown;
  };
  if (r.success && r.data) {
    return Array.isArray(r.data) ? (r.data as Template[]) : [];
  }
  if (Array.isArray(response)) {
    return response as Template[];
  }
  if (r.data && Array.isArray(r.data)) {
    return r.data as Template[];
  }
  return [];
}

function computeHomeSlidingThumbWidth(windowWidth: number): number {
  const inner = windowWidth - 2 * HOME_SCROLL_PAD_X;
  const gaps = (HOME_SLIDING_THUMBS_VISIBLE - 1) * HOME_THUMB_SPACING;
  return Math.max(88, (inner - gaps) / HOME_SLIDING_THUMBS_VISIBLE);
}

function CategoryBrowseRow({
  category,
  templates,
  loading,
  getFileUrl,
  onTemplatePress,
  onViewMore,
}: {
  category: Category;
  templates: Template[];
  loading: boolean;
  getFileUrl: (url: string) => string;
  onTemplatePress: (t: Template) => void;
  onViewMore: () => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const thumbW = useMemo(
    () => computeHomeSlidingThumbWidth(windowWidth),
    [windowWidth],
  );

  return (
    <View style={styles.categoryBrowseSection}>
      <Text style={styles.categoryBrowseTitle}>{category.name}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBrowseScrollContent}
        nestedScrollEnabled
      >
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.homeTemplateThumb, { width: thumbW }]}>
              <View style={styles.homeTemplateThumbImagePlaceholder} />
            </View>
          ))
        ) : (
          <>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[styles.homeTemplateThumb, { width: thumbW }]}
                onPress={() => onTemplatePress(template)}
                activeOpacity={0.85}
              >
                <View style={styles.homeTemplateThumbImageWrap}>
                  {template.file_url ? (
                    <Image
                      source={{ uri: getFileUrl(template.file_url) }}
                      style={styles.homeTemplateThumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.homeTemplateThumbImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.homeTemplateThumbGradient}
                  >
                    <View style={styles.homeOverlayStatsRow}>
                      <Text style={styles.homeOverlayStatsText}>
                        ❤️ {template.like_count ?? 0}
                      </Text>
                      <Text style={styles.homeOverlayStatsText}>
                        ⬇️ {template.download_count ?? 0}
                      </Text>
                    </View>
                    <Text numberOfLines={2} style={styles.homeOverlayTitleSmall}>
                      {template.name}
                    </Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.homeTemplateThumb,
                styles.homeViewMoreTile,
                { width: thumbW, height: thumbW },
              ]}
              onPress={onViewMore}
              activeOpacity={0.85}
            >
              <Text style={styles.homeViewMoreText}>View more</Text>
              <Text numberOfLines={2} style={styles.homeViewMoreSubtext}>
                {category.name}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HomeCarouselBanner({
  getFileUrl,
  fixed = false,
}: {
  getFileUrl: (url: string) => string;
  /** When true, wrap in pinned (non–vertically-scrolling) chrome under the header */
  fixed?: boolean;
}) {
  const [slides, setSlides] = useState<HomeCarouselSlide[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const winPad = Dimensions.get('window').width - 32;
  const [slideWidth, setSlideWidth] = useState(() => Math.max(200, winPad));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getHomeCarouselSlides();
        if (!cancelled && res && (res as { success?: boolean }).success && Array.isArray((res as { data?: unknown }).data)) {
          setSlides((res as { data: HomeCarouselSlide[] }).data);
        }
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    indexRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [slides]);

  useEffect(() => {
    if (slideWidth <= 0 || slides.length <= 1) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      indexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
    }, 2000);
    return () => clearInterval(timer);
  }, [slideWidth, slides.length]);

  const onScrollEnd = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = ev.nativeEvent.contentOffset.x;
    if (slideWidth > 0) {
      indexRef.current = Math.round(x / slideWidth);
    }
  };

  if (slides.length === 0) {
    return null;
  }

  const carousel = (
    <View
      style={styles.homeCarouselWrap}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setSlideWidth(w);
      }}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.homeCarouselScroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
      >
        {slides.map((s) => (
          <View key={s.id} style={[styles.homeCarouselSlide, { width: slideWidth }]}>
            <Image
              source={{ uri: getFileUrl(s.image_url) }}
              style={styles.homeCarouselImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (fixed) {
    return <View style={styles.homeCarouselFixed}>{carousel}</View>;
  }
  return carousel;
}

export function HomePage({ user, onLogout, onNavigate, initialOpenCategorySlug, onClearOpenCategoryParam }: HomePageProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'liked' | 'trending' | 'downloads' | 'contact'>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingMoreTemplates, setIsLoadingMoreTemplates] = useState(false);
  const [templatesHasMore, setTemplatesHasMore] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const templatesRef = useRef<Template[]>([]);
  const [trendingTemplates, setTrendingTemplates] = useState<Template[]>([]);
  const trendingTemplatesRef = useRef<Template[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [likedTemplates, setLikedTemplates] = useState<Template[]>([]);
  const [isLoadingLiked, setIsLoadingLiked] = useState(false);
  const [likedError, setLikedError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [downloadedTemplates, setDownloadedTemplates] = useState<DownloadedTemplate[]>([]);
  const [downloadsError, setDownloadsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [homePreviewBySlug, setHomePreviewBySlug] = useState<Record<string, Template[]>>({});
  const [homePreviewLoading, setHomePreviewLoading] = useState(false);
  const [showFullCategoryGrid, setShowFullCategoryGrid] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const res = (await api.getUnreadNotificationCount(user.id)) as {
        success?: boolean;
        count?: number;
      };
      if (res?.success && typeof res.count === 'number') {
        setUnreadNotificationCount(res.count);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotificationCount();
    }, [fetchUnreadNotificationCount])
  );

  const categoryIcon: { [key: string]: string } = {
    'public-figure': '🌍',
    'politicians': '👔',
    'individual': '👤',
    'business-owner': '🏪',
    'brand': '✨',
    'creative': '🎨',
    'artists': '🎨',
    'celebrity': '⭐',
  };

  const categoryName: { [key: string]: string } = {
    'public-figure': 'Public figure',
    'politicians': 'Politicians',
    'individual': 'Individual',
    'business-owner': 'Business owner',
    'brand': 'Brand',
    'creative': 'Creative',
    'artists': 'Artists',
    'celebrity': 'Celebrity',
  };

  const icon = categoryIcon[user.category || 'individual'] || '👤';
  const categoryDisplay = categoryName[user.category || 'individual'] || 'Individual';
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  useEffect(() => {
    trendingTemplatesRef.current = trendingTemplates;
  }, [trendingTemplates]);

  useEffect(() => {
    fetchCategories();
    loadSavedTemplates();
    loadDownloadedTemplates();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch templates when a category is selected
  useEffect(() => {
    if (activeTab !== 'home') return;
    if (selectedCategory) {
      fetchTemplatesFirstPage(selectedCategory);
    } else {
      setTemplates([]);
      setTemplatesHasMore(false);
    }
  }, [selectedCategory, activeTab]);

  useEffect(() => {
    const slug = initialOpenCategorySlug?.trim();
    if (!slug) return;
    setActiveTab('home');
    setSelectedCategory(slug);
    setShowFullCategoryGrid(false);
    onClearOpenCategoryParam?.();
  }, [initialOpenCategorySlug, onClearOpenCategoryParam]);

  useEffect(() => {
    if (categories.length === 0) {
      setHomePreviewBySlug({});
      setHomePreviewLoading(false);
      return;
    }
    const topSlugs = categories.slice(0, HOME_BROWSE_CATEGORY_ROWS).map((c) => c.slug);
    let cancelled = false;
    setHomePreviewLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          topSlugs.map(async (slug) => {
            try {
              const response = await api.getTemplatesWithLikes({
                category: slug,
                userId: user.id,
                limit: HOME_BROWSE_TEMPLATES_PER_ROW,
              });
              let list: Template[] = [];
              if (response.success && response.data) {
                list = Array.isArray(response.data) ? response.data : [];
              } else if (Array.isArray(response)) {
                list = response;
              } else if (response.data && Array.isArray(response.data)) {
                list = response.data;
              }
              return [slug, list.slice(0, HOME_BROWSE_TEMPLATES_PER_ROW)] as const;
            } catch {
              return [slug, []] as const;
            }
          })
        );
        if (!cancelled) {
          setHomePreviewBySlug(Object.fromEntries(results));
        }
      } finally {
        if (!cancelled) setHomePreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categories, user.id]);

  useEffect(() => {
    if (activeTab === 'liked') {
      fetchLikedTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'trending') {
      fetchTrendingTemplates();
    }
    if (activeTab === 'downloads') {
      loadDownloadedTemplates();
    }
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      fetchCategories(),
      selectedCategory && activeTab === 'home' ? fetchTemplatesFirstPage(selectedCategory) : Promise.resolve(),
      activeTab === 'liked' ? fetchLikedTemplates() : Promise.resolve(),
      activeTab === 'trending' ? fetchTrendingTemplates() : Promise.resolve(),
      activeTab === 'downloads' ? loadDownloadedTemplates() : Promise.resolve(),
      loadSavedTemplates(),
      fetchUnreadNotificationCount(),
    ]);
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Refresh saved templates when component comes into focus
  useEffect(() => {
    const interval = setInterval(() => {
      loadSavedTemplates();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSavedTemplates = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', keys);
      // Filter by current user's ID to only show their saved templates
      const userPrefix = `template_editor_${user.id}_`;
      const templateKeys = keys.filter(key => key.startsWith(userPrefix));
      console.log('Template keys found for user', user.id, ':', templateKeys);
      
      const savedData = await Promise.all(
        templateKeys.map(async (key) => {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              console.log('Parsed template data for', key, ':', parsed);
              return {
                ...parsed,
                storageKey: key,
              };
            } catch (parseError) {
              console.error('Error parsing data for', key, ':', parseError);
              return null;
            }
          }
          return null;
        })
      );
      
      // Show templates that have any changes (text elements, logo, or profile photo)
      const validTemplates = savedData
        .filter((t): t is SavedTemplate & { storageKey: string } => {
          if (!t || !t.templateId) return false;
          // Show if there are text elements, logo is shown, or profile photo exists
          const hasTextElements = t.textElements && t.textElements.length > 0;
          const hasLogo = t.showLogo === true;
          const hasProfilePhoto = t.profilePhoto !== null && t.profilePhoto !== undefined;
          return hasTextElements || hasLogo || hasProfilePhoto;
        })
        .sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0))
        .slice(0, 5); // Show only the 5 most recent
      
      console.log('Loaded saved templates:', validTemplates.length, validTemplates);
      setSavedTemplates(validTemplates);
    } catch (error) {
      console.error('Error loading saved templates:', error);
    }
  };

  const loadDownloadedTemplates = async () => {
    try {
      setDownloadsError(null);
      const key = `${DOWNLOADED_TEMPLATES_KEY_PREFIX}${user.id || 'anonymous'}`;
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as DownloadedTemplate[]) : [];
      setDownloadedTemplates(Array.isArray(list) ? list : []);
    } catch (e) {
      setDownloadsError(e instanceof Error ? e.message : 'Unable to load downloads');
      setDownloadedTemplates([]);
    }
  };

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setCategoriesError(null);
      const response = await api.getCategories();
      
      if (response.success && response.data) {
        setCategories(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setCategories(response);
      } else if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unable to load categories. Please check your connection and try again.';
      setCategoriesError(errorMessage);
      setCategories([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchTemplatesFirstPage = async (categorySlug: string) => {
    try {
      setIsLoadingTemplates(true);
      setIsLoadingMoreTemplates(false);
      setTemplatesError(null);
      setTemplatesHasMore(false);
      const response = await api.getTemplatesWithLikes({
        category: categorySlug,
        userId: user.id,
        limit: CATEGORY_TEMPLATES_PAGE_SIZE,
      });
      const batch = templatesListFromApiResponse(response);
      setTemplates(batch);
      setTemplatesHasMore(batch.length === CATEGORY_TEMPLATES_PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching templates:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to load templates. Please check your connection and try again.';
      setTemplatesError(errorMessage);
      setTemplates([]);
      setTemplatesHasMore(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadMoreTemplates = async () => {
    if (!selectedCategory || isLoadingMoreTemplates || isLoadingTemplates) return;
    try {
      setIsLoadingMoreTemplates(true);
      setTemplatesError(null);
      const offset = templatesRef.current.length;
      const response = await api.getTemplatesWithLikes({
        category: selectedCategory,
        userId: user.id,
        limit: CATEGORY_TEMPLATES_PAGE_SIZE,
        offset,
      });
      const batch = templatesListFromApiResponse(response);
      setTemplates((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        for (const t of batch) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
        return merged;
      });
      setTemplatesHasMore(batch.length === CATEGORY_TEMPLATES_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more templates:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to load more templates.';
      setTemplatesError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoadingMoreTemplates(false);
    }
  };

  const fetchTrendingTemplates = async () => {
    try {
      setIsLoadingTrending(true);
      setTrendingError(null);
      setTrendingTemplates([]);

      const response = await api.getTemplatesWithLikes({
        userId: user.id,
        sort: 'trending',
        limit: TRENDING_LIMIT,
      });
      const batch = templatesListFromApiResponse(response);
      // Ensure deterministic order if backend doesn't sort
      batch.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
      setTrendingTemplates(batch);
    } catch (error) {
      console.error('Error fetching trending templates:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to load trending templates. Please check your connection and try again.';
      setTrendingError(errorMessage);
      setTrendingTemplates([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const fetchLikedTemplates = async () => {
    try {
      setIsLoadingLiked(true);
      setLikedError(null);
      const response = await api.getLikedTemplates(user.id);
      if (response.success && response.data) {
        setLikedTemplates(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setLikedTemplates(response);
      } else if (response.data && Array.isArray(response.data)) {
        setLikedTemplates(response.data);
      } else {
        setLikedTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching liked templates:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unable to load liked templates. Please check your connection and try again.';
      setLikedError(errorMessage);
      setLikedTemplates([]);
    } finally {
      setIsLoadingLiked(false);
    }
  };

  const updateTemplateLikeState = (templateId: string, nextLiked: boolean, nextCount?: number) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === templateId
          ? { ...t, liked: nextLiked, like_count: typeof nextCount === 'number' ? nextCount : t.like_count }
          : t
      )
    );
    setTrendingTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId
          ? { ...t, liked: nextLiked, like_count: typeof nextCount === 'number' ? nextCount : t.like_count }
          : t
      )
    );
    setLikedTemplates(prev => {
      const exists = prev.some(t => t.id === templateId);
      if (nextLiked) {
        if (exists) {
          return prev.map(t =>
            t.id === templateId
              ? { ...t, liked: true, like_count: typeof nextCount === 'number' ? nextCount : t.like_count }
              : t
          );
        }
        const fromTrending = trendingTemplatesRef.current.find((t) => t.id === templateId);
        const fromGrid = templatesRef.current.find((t) => t.id === templateId) || fromTrending;
        if (fromGrid) {
          return [{ ...fromGrid, liked: true, like_count: typeof nextCount === 'number' ? nextCount : fromGrid.like_count }, ...prev];
        }
        return prev;
      }
      // unliked
      return prev.filter(t => t.id !== templateId);
    });
  };

  const handleToggleLike = async (template: Template) => {
    const currentlyLiked = !!template.liked;
    const optimisticCount = Math.max(0, (template.like_count ?? 0) + (currentlyLiked ? -1 : 1));
    updateTemplateLikeState(template.id, !currentlyLiked, optimisticCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = currentlyLiked
        ? await api.unlikeTemplate(template.id, user.id)
        : await api.likeTemplate(template.id, user.id);
      if (res && res.success) {
        updateTemplateLikeState(template.id, !!res.liked, typeof res.like_count === 'number' ? res.like_count : optimisticCount);
      } else {
        // revert if backend rejected
        updateTemplateLikeState(template.id, currentlyLiked, template.like_count ?? 0);
      }
    } catch (e) {
      updateTemplateLikeState(template.id, currentlyLiked, template.like_count ?? 0);
    }
  };

  const getFileUrl = (fileUrl: string) => {
    // If file_url already starts with http, return as is
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Extract base URL without /api suffix for static files (uploads)
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
    const baseUrl = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present
    return `${baseUrl}${fileUrl}`;
  };

  /** Thumbnail for continue cards: saved URL first, then any loaded template list (category grid is often empty on home). */
  const resolveContinueTemplateThumbnail = useCallback(
    (saved: SavedTemplate): string | null => {
      if (saved.templateFileUrl) return saved.templateFileUrl;
      const id = String(saved.templateId);
      const pools: Template[][] = [templates, trendingTemplates, likedTemplates, ...Object.values(homePreviewBySlug)];
      for (const pool of pools) {
        const found = pool.find((t) => String(t.id) === id);
        if (found?.file_url) return found.file_url;
      }
      return null;
    },
    [templates, trendingTemplates, likedTemplates, homePreviewBySlug]
  );

  const handleTemplatePress = (templateOrId: string | Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const templateId = typeof templateOrId === 'string' ? templateOrId : templateOrId.id;
    const meta = typeof templateOrId === 'string' ? null : templateOrId;
    const categorySlug =
      activeTab === 'home'
        ? selectedCategory || meta?.category_slug || undefined
        : activeTab === 'trending'
          ? meta?.category_slug || undefined
          : undefined;
    onNavigate?.('template', {
      id: templateId,
      ...(categorySlug ? { category: categorySlug } : {}),
      ...(activeTab === 'trending' ? { sort: 'trending' as const } : {}),
      ...(activeTab === 'liked' ? { source: 'liked' as const } : {}),
    });
  };

  const handleContinuePress = (templateId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNavigate?.('template', { id: templateId, edit: true, continue: 'true' });
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'trending') {
      fetchTrendingTemplates();
      return;
    }
    if (selectedCategory) {
      fetchTemplatesFirstPage(selectedCategory);
    } else {
      fetchCategories();
    }
  };

  const handleCategorySelect = (categorySlug: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(categorySlug);
  };

  const handleBackToCategories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(null);
    setTemplates([]);
    setShowFullCategoryGrid(false);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {activeTab === 'contact' || activeTab === 'downloads' ? (
        <View style={styles.tabFullScreen}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userCategory}>{categoryDisplay}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onNavigate?.('notifications');
                }}
              >
                <Bell size={22} color={HOME_COLORS.secondary} />
                {unreadNotificationCount > 0 ? <View style={styles.notificationDot} /> : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onNavigate?.('profile');
                }}
              >
                {user.profile_photo_url ? (
                  <Image
                    source={{ uri: getFileUrl(user.profile_photo_url) }}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <User size={17} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {activeTab === 'contact' ? (
            <ContactSuggestionsScreen user={user} />
          ) : (
            <View style={styles.downloadsTabBody}>
              <Text style={styles.sectionTitle}>Downloads</Text>
              {downloadsError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{downloadsError}</Text>
                  <TouchableOpacity onPress={loadDownloadedTemplates} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : downloadedTemplates.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No downloads yet</Text>
                  <Text style={[styles.emptyText, { fontSize: 12, marginTop: 8 }]}>
                    Download a template to see it here
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={[styles.scrollContent, { paddingTop: 14 }]}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.templatesGrid}>
                    {downloadedTemplates.map((template) => (
                      <HomeCategoryTemplateGridCard
                        key={template.id}
                        template={template}
                        getFileUrl={getFileUrl}
                        onPressTemplate={handleTemplatePress}
                        onToggleLike={handleToggleLike}
                      />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      ) : (
      <View style={styles.mainWithFixedHeader}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userCategory}>{categoryDisplay}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNavigate?.('notifications');
              }}
            >
              <Bell size={22} color={HOME_COLORS.secondary} />
              {unreadNotificationCount > 0 ? <View style={styles.notificationDot} /> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNavigate?.('profile');
              }}
            >
              {user.profile_photo_url ? (
                <Image
                  source={{ uri: getFileUrl(user.profile_photo_url) }}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
              ) : (
                <User size={17} color="#9ca3af" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'home' ? <HomeCarouselBanner getFileUrl={getFileUrl} fixed /> : null}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={HOME_COLORS.primary}
              colors={[HOME_COLORS.primary]}
            />
          }
        >
        <View style={[styles.mainContent, activeTab === 'home' && styles.mainContentBelowFixedCarousel]}>
          {activeTab === 'liked' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Liked Templates</Text>
                <Text style={styles.sectionSubtitle}>Your saved favourites</Text>
              </View>
              <View style={styles.templatesGrid}>
                {isLoadingLiked && !refreshing ? (
                  <>
                    <TemplateSkeleton />
                    <TemplateSkeleton />
                    <TemplateSkeleton />
                    <TemplateSkeleton />
                  </>
                ) : likedError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{likedError}</Text>
                    <TouchableOpacity onPress={fetchLikedTemplates} style={styles.retryButton}>
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : likedTemplates.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No liked templates yet</Text>
                    <Text style={[styles.emptyText, { fontSize: 12, marginTop: 8 }]}>
                      Tap the heart on any template to save it here
                    </Text>
                  </View>
                ) : (
                  likedTemplates.map((template) => (
                    <HomeCategoryTemplateGridCard
                      key={template.id}
                      template={template}
                      getFileUrl={getFileUrl}
                      onPressTemplate={handleTemplatePress}
                      onToggleLike={handleToggleLike}
                    />
                  ))
                )}
              </View>
            </>
          ) : activeTab === 'trending' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trending</Text>
              </View>
              {isLoadingTrending && !refreshing ? (
                <View style={styles.trendingLoadingSections}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.trendingCategorySection}>
                      <View style={styles.trendingSkeletonTitle} />
                      <View style={styles.trendingSkeletonSubtitle} />
                      <View style={styles.templatesGrid}>
                        <TemplateSkeleton />
                        <TemplateSkeleton />
                        <TemplateSkeleton />
                        <TemplateSkeleton />
                      </View>
                    </View>
                  ))}
                </View>
              ) : trendingError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{trendingError}</Text>
                  <TouchableOpacity onPress={fetchTrendingTemplates} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : trendingTemplates.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No trending templates yet</Text>
                  <Text style={[styles.emptyText, { fontSize: 12, marginTop: 8 }]}>
                    Like templates to help them show up here
                  </Text>
                </View>
              ) : (
                <View style={styles.templatesGrid}>
                  {trendingTemplates.map((template) => (
                    <HomeCategoryTemplateGridCard
                      key={template.id}
                      template={template}
                      getFileUrl={getFileUrl}
                      onPressTemplate={handleTemplatePress}
                      onToggleLike={handleToggleLike}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
          {/* Back Button - Show when category is selected */}
          {selectedCategory && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToCategories}
            >
              <Text style={styles.backButtonText}>← Back to Categories</Text>
            </TouchableOpacity>
          )}

          {/* Categories: home rows (5 categories × horizontal templates + View more) or full grid */}
          {!selectedCategory && (
            <>
              {!showFullCategoryGrid ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Browse Categories</Text>
                  </View>
                  {isLoadingCategories && !refreshing ? (
                    <ActivityIndicator size="large" color={HOME_COLORS.primary} style={{ marginVertical: 20 }} />
                  ) : categoriesError ? (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{categoriesError}</Text>
                      <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : categories.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No categories available</Text>
                      <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Refresh</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {categories.slice(0, HOME_BROWSE_CATEGORY_ROWS).map((category) => (
                        <CategoryBrowseRow
                          key={category.id}
                          category={category}
                          templates={homePreviewBySlug[category.slug] ?? []}
                          loading={homePreviewLoading}
                          getFileUrl={getFileUrl}
                          onTemplatePress={handleTemplatePress}
                          onViewMore={() => handleCategorySelect(category.slug)}
                        />
                      ))}
                      {categories.length > HOME_BROWSE_CATEGORY_ROWS && (
                        <TouchableOpacity
                          style={styles.allCategoriesButton}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowFullCategoryGrid(true);
                          }}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.allCategoriesButtonText}>
                            All categories ({categories.length})
                          </Text>
                          <Text style={styles.allCategoriesButtonHint}>See every category</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowFullCategoryGrid(false);
                    }}
                  >
                    <Text style={styles.backButtonText}>← Back to home</Text>
                  </TouchableOpacity>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All categories</Text>
                    <Text style={styles.sectionSubtitle}>Select a category to view templates</Text>
                  </View>
                  <View style={styles.categoriesGrid}>
                    {categories.map((category) => {
                      const gradientColors: [string, string, ...string[]] = category.color
                        ? [category.color, `${category.color}CC`, `${category.color}99`]
                        : [HOME_COLORS.primary, HOME_COLORS.purple];

                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={styles.categoryCardWrapper}
                          onPress={() => handleCategorySelect(category.slug)}
                          activeOpacity={0.9}
                        >
                          <LinearGradient
                            colors={gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.categoryCard}
                          >
                            <View style={styles.categoryCardContent}>
                              {category.icon && (
                                <View style={styles.categoryIconContainer}>
                                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                                </View>
                              )}
                              <Text style={styles.categoryCardTitle}>{category.name}</Text>
                              {category.description && (
                                <Text style={styles.categoryCardDescription} numberOfLines={2}>
                                  {category.description}
                                </Text>
                              )}
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {/* Templates Grid - Show when category is selected */}
          {selectedCategory && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {categories.find(c => c.slug === selectedCategory)?.name || 'Templates'}
                </Text>
                <Text style={styles.sectionSubtitle}>Select a template to get started</Text>
              </View>
              <View style={styles.templatesGrid}>
            {isLoadingTemplates && !refreshing ? (
              <>
                <TemplateSkeleton />
                <TemplateSkeleton />
                <TemplateSkeleton />
                <TemplateSkeleton />
              </>
            ) : templatesError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{templatesError}</Text>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : templates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No templates available in this category yet
                </Text>
                <Text style={[styles.emptyText, { fontSize: 12, marginTop: 8 }]}>
                  Check back later or try another category
                </Text>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              templates.map((template) => (
                <HomeCategoryTemplateGridCard
                  key={template.id}
                  template={template}
                  getFileUrl={getFileUrl}
                  onPressTemplate={handleTemplatePress}
                  onToggleLike={handleToggleLike}
                />
              ))
            )}
              </View>
              {templates.length > 0 && templatesHasMore && !isLoadingTemplates && (
                <View style={styles.viewMoreRow}>
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      loadMoreTemplates();
                    }}
                    disabled={isLoadingMoreTemplates}
                    activeOpacity={0.8}
                  >
                    {isLoadingMoreTemplates ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.viewMoreButtonText}>View more</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Premium Access Banner */}
          <LinearGradient
            colors={[HOME_COLORS.primary, HOME_COLORS.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumBanner}
          >
            <View>
              <Text style={styles.premiumTitle}>Premium Access</Text>
              <Text style={styles.premiumSubtitle}>Unlock all Indian Festival Templates</Text>
            </View>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Continue Your Masterpiece Section */}
          {savedTemplates.length > 0 && (
            <View style={styles.continueSection}>
              <View style={styles.continueHeader}>
                <Edit3 size={20} color={HOME_COLORS.primary} />
                <Text style={styles.continueTitle}>Continue Your Masterpiece</Text>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.continueScroll}
                contentContainerStyle={styles.continueScrollContent}
              >
                {savedTemplates.map((saved, index) => {
                  const thumbPath = resolveContinueTemplateThumbnail(saved);
                  return (
                    <TouchableOpacity
                      key={saved.storageKey || index}
                      style={styles.continueCard}
                      onPress={() => handleContinuePress(saved.templateId)}
                      activeOpacity={0.8}
                    >
                      {thumbPath ? (
                        <Image
                          source={{ uri: getFileUrl(thumbPath) }}
                          style={styles.continueImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.continuePlaceholder}>
                          <Text style={styles.continuePlaceholderText}>📝</Text>
                        </View>
                      )}
                      <View style={styles.continueCardContent}>
                        <Text style={styles.continueCardTitle} numberOfLines={1}>
                          {saved.templateName || 'Untitled'}
                        </Text>
                        <Text style={styles.continueCardSubtitle}>
                          {saved.textElements?.length || 0} text elements
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
            </>
          )}
        </View>
        </ScrollView>
      </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('home');
          }}
        >
          <Home size={24} color={activeTab === 'home' ? HOME_COLORS.primary : HOME_COLORS.textLight} />
          <Text style={[styles.navLabel, activeTab === 'home' ? styles.navLabelActive : null]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('liked');
            setSelectedCategory(null);
          }}
        >
          <Heart
            size={24}
            color={activeTab === 'liked' ? HOME_COLORS.primary : HOME_COLORS.textLight}
            fill={activeTab === 'liked' ? HOME_COLORS.primary : 'transparent'}
          />
          <Text style={[styles.navLabel, activeTab === 'liked' ? styles.navLabelActive : null]}>Liked</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('trending');
            setSelectedCategory(null);
          }}
        >
          <TrendingUp
            size={24}
            color={activeTab === 'trending' ? HOME_COLORS.primary : HOME_COLORS.textLight}
          />
          <Text style={[styles.navLabel, activeTab === 'trending' ? styles.navLabelActive : null]}>Trending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('downloads');
            setSelectedCategory(null);
          }}
        >
          <Download size={24} color={activeTab === 'downloads' ? HOME_COLORS.primary : HOME_COLORS.textLight} />
          <Text style={[styles.navLabel, activeTab === 'downloads' ? styles.navLabelActive : null]}>Downloads</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('contact');
            setSelectedCategory(null);
          }}
        >
          <Mail size={24} color={activeTab === 'contact' ? HOME_COLORS.primary : HOME_COLORS.textLight} />
          <Text style={[styles.navLabel, activeTab === 'contact' ? styles.navLabelActive : null]}>Contact</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const HOME_COLORS = {
  primary: '#8B1A3D', // Maroon
  secondary: '#EAB308', // Gold/Yellow
  purple: '#7C3AED', // Purple for gradients
  background: '#FFFFFF', // White background
  cardBeige: '#FAF8F3', // Light beige for cards
  textDark: '#1F2937', // Dark grey text
  textLight: '#6B7280', // Light grey text
  gold: '#FBBF24', // Gold accent
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HOME_COLORS.background,
  },
  tabFullScreen: {
    flex: 1,
  },
  mainWithFixedHeader: {
    flex: 1,
  },
  downloadsTabBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    backgroundColor: HOME_COLORS.primary,
    paddingTop: 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  headerLeft: {
    marginBottom: 4,
    paddingRight: 120,
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  userCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    position: 'absolute',
    top: 44,
    right: 20,
  },
  iconButton: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: HOME_COLORS.secondary,
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mainContent: {
    paddingHorizontal: 8,
    marginTop: 14,
    position: 'relative',
    zIndex: 10,
  },
  /** Tighter top gap when carousel is fixed above the scroll area */
  mainContentBelowFixedCarousel: {
    marginTop: 6,
  },
  /** Pinned under header on Home tab; does not scroll with categories/templates */
  homeCarouselFixed: {
    backgroundColor: HOME_COLORS.background,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  homeCarouselWrap: {
    width: '100%',
    aspectRatio: 2.25 / 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 0,
    backgroundColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  homeCarouselScroll: {
    flex: 1,
  },
  homeCarouselSlide: {
    aspectRatio: 2.25 / 1,
    overflow: 'hidden',
  },
  homeCarouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  tabsContainer: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: HOME_COLORS.primary,
    borderColor: HOME_COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: HOME_COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  viewMoreRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -4,
  },
  viewMoreButton: {
    backgroundColor: HOME_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  templateCard: {
    width: '47%',
    backgroundColor: HOME_COLORS.cardBeige,
    borderRadius: 12,
    padding: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  /** No Use row: remove light outline that framed the card + old action area. */
  templateCardThumbOnly: {
    borderWidth: 0,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: HOME_COLORS.gold,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 8,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  templateNameHint: {
    fontSize: 9,
    fontWeight: '400',
    color: HOME_COLORS.textLight,
    opacity: 0.38,
    marginBottom: 6,
    marginTop: 2,
  },
  templateCardOverlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  templateCardOverlayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 18,
  },
  templateGridHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  templateImageContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 10,
    marginBottom: 4,
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  templateImageContainerThumbOnly: {
    marginBottom: 0,
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.textLight,
    textDecorationLine: 'line-through',
    marginRight: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.gold,
  },
  actionButton: {
    backgroundColor: HOME_COLORS.cardBeige,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  premiumBanner: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  upgradeButton: {
    backgroundColor: HOME_COLORS.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    paddingTop: 8,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingTop: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: HOME_COLORS.textLight,
  },
  navLabelActive: {
    color: HOME_COLORS.primary,
  },
  trendingCategorySection: {
    marginBottom: 18,
  },
  trendingCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
    marginBottom: 4,
  },
  trendingCategorySubtitle: {
    fontSize: 12,
    color: HOME_COLORS.textLight,
    marginBottom: 8,
  },
  trendingLoadingSections: {
    marginTop: 4,
  },
  trendingSkeletonTitle: {
    height: 18,
    width: '45%',
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 10,
  },
  trendingSkeletonSubtitle: {
    height: 12,
    width: '70%',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    marginBottom: 14,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: HOME_COLORS.textLight,
  },
  errorContainer: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: HOME_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: HOME_COLORS.textLight,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: HOME_COLORS.textLight,
  },
  continueSection: {
    marginBottom: 14,
    marginTop: 10,
    paddingHorizontal: 0,
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  continueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  continueScroll: {
    marginHorizontal: -8,
  },
  continueScrollContent: {
    paddingHorizontal: 8,
    gap: 12,
  },
  continueCard: {
    width: 140,
    backgroundColor: HOME_COLORS.cardBeige,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
  },
  continuePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continuePlaceholderText: {
    fontSize: 48,
  },
  continueCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  continueCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: HOME_COLORS.textDark,
    marginBottom: 4,
  },
  continueCardSubtitle: {
    fontSize: 11,
    color: HOME_COLORS.textLight,
  },
  // Skeleton loading styles
  skeletonCard: {
    width: '47%',
    backgroundColor: HOME_COLORS.cardBeige,
    borderRadius: 12,
    padding: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 4,
  },
  skeletonTitleCompact: {
    width: '55%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 4,
    opacity: 0.6,
  },
  // Category styles
  backButton: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: HOME_COLORS.primary,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: HOME_COLORS.textLight,
  },
  categoryBrowseSection: {
    marginBottom: 14,
  },
  categoryBrowseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categoryBrowseScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  homeTemplateThumb: {
    marginRight: 12,
  },
  homeTemplateThumbImageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  homeTemplateThumbImage: {
    width: '100%',
    height: '100%',
  },
  homeTemplateThumbGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  homeOverlayStatsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  homeOverlayStatsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  homeOverlayTitleSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 15,
  },
  homeTemplateThumbImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  homeViewMoreTile: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: HOME_COLORS.primary,
    backgroundColor: HOME_COLORS.cardBeige,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  homeViewMoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: HOME_COLORS.primary,
    textAlign: 'center',
  },
  homeViewMoreSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: HOME_COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  allCategoriesButton: {
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.cardBeige,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  allCategoriesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: HOME_COLORS.textDark,
  },
  allCategoriesButtonHint: {
    fontSize: 12,
    color: HOME_COLORS.textLight,
    marginTop: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  categoryCardWrapper: {
    width: '47%',
    marginBottom: 12,
  },
  categoryCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryCardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
