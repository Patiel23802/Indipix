import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TemplatePreview } from '@/components/TemplatePreview';
import { api } from '@/lib/api';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

function templatesFromResponse(response: unknown): any[] {
  const r = response as { success?: boolean; data?: unknown };
  if (r.success && r.data && Array.isArray(r.data)) {
    return r.data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (r.data && Array.isArray(r.data)) {
    return r.data as any[];
  }
  return [];
}

function normalizeParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function TemplatePreviewScreen() {
  const router = useRouter();
  const { id, category, sort, source } = useLocalSearchParams<{
    id: string;
    category?: string;
    sort?: string;
    source?: string;
  }>();
  const routeTemplateId = normalizeParam(id);
  const { state } = useFirebaseAuth();
  const [templateList, setTemplateList] = useState<any[]>([]);
  /** Which template is shown; updated by arrows/swipe without router navigation */
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() =>
    routeTemplateId ? String(routeTemplateId) : null
  );
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const slideX = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);
  const [slideAnimating, setSlideAnimating] = useState(false);

  const listContext = useMemo(() => {
    const cat = normalizeParam(category as string | string[] | undefined);
    const srt = normalizeParam(sort as string | string[] | undefined);
    const src = normalizeParam(source as string | string[] | undefined);
    return {
      category: cat || undefined,
      sort: srt === 'trending' ? ('trending' as const) : undefined,
      source: src === 'liked' ? ('liked' as const) : undefined,
      userId: state.user?.id,
    };
  }, [category, sort, source, state.user?.id]);

  const fetchTemplateList = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      if (listContext.source === 'liked') {
        if (!listContext.userId) {
          setTemplateList([]);
          setError('Sign in to view liked templates');
          return;
        }
        const response = await api.getLikedTemplates(listContext.userId);
        setTemplateList(templatesFromResponse(response));
        return;
      }
      const response = await api.getTemplatesWithLikes({
        userId: listContext.userId ?? undefined,
        category: listContext.category,
        sort: listContext.sort,
      });
      setTemplateList(templatesFromResponse(response));
    } catch (err) {
      console.error('Error fetching templates:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to load template. Please check your connection.';
      setError(errorMessage);
      setTemplateList([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setListLoading(false);
    }
  }, [listContext]);

  useEffect(() => {
    fetchTemplateList();
  }, [fetchTemplateList]);

  // Opening this screen (or deep link) sets which template is active — no slide animation
  useEffect(() => {
    if (!routeTemplateId) return;
    slideX.setValue(0);
    setActiveTemplateId(String(routeTemplateId));
  }, [routeTemplateId, slideX]);

  const template = useMemo(() => {
    if (!activeTemplateId || templateList.length === 0) return null;
    return templateList.find((t: any) => String(t.id) === String(activeTemplateId)) ?? null;
  }, [activeTemplateId, templateList]);

  useEffect(() => {
    if (listLoading) return;

    if (templateList.length === 0) {
      setError((prev) => prev || 'Template not found');
      return;
    }

    if (!activeTemplateId) {
      setError((prev) => prev || 'Template not found');
      return;
    }

    if (template) {
      setError(null);
    } else {
      setError('Template not found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [template, templateList, listLoading, activeTemplateId]);

  const runSlideTransition = useCallback(
    (newTemplateId: string, direction: 'next' | 'prev') => {
      if (isTransitioning.current || windowWidth <= 0) return;
      isTransitioning.current = true;
      setSlideAnimating(true);
      const w = windowWidth;
      const outTo = direction === 'next' ? -w : w;
      const inFrom = direction === 'next' ? w : -w;
      const timing = (to: number, duration: number) =>
        Animated.timing(slideX, {
          toValue: to,
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        });

      timing(outTo, 240).start(({ finished }) => {
        if (!finished) {
          isTransitioning.current = false;
          setSlideAnimating(false);
          return;
        }
        slideX.setValue(inFrom);
        setActiveTemplateId(newTemplateId);
        requestAnimationFrame(() => {
          timing(0, 280).start(({ finished: f2 }) => {
            isTransitioning.current = false;
            setSlideAnimating(false);
            if (!f2) slideX.setValue(0);
          });
        });
      });
    },
    [slideX, windowWidth]
  );

  const updateLikeInState = useCallback((templateId: string, liked: boolean, like_count: number) => {
    setTemplateList((prev) =>
      prev.map((t) =>
        String(t.id) === String(templateId) ? { ...t, liked, like_count } : t
      )
    );
  }, []);

  const handleToggleLike = useCallback(async () => {
    if (!template || likeLoading || !state.user?.id) {
      if (!state.user?.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }
    const currentlyLiked = !!template.liked;
    const optimisticCount = Math.max(0, (template.like_count ?? 0) + (currentlyLiked ? -1 : 1));
    updateLikeInState(template.id, !currentlyLiked, optimisticCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeLoading(true);
    try {
      const res = (currentlyLiked
        ? await api.unlikeTemplate(template.id, state.user.id)
        : await api.likeTemplate(template.id, state.user.id)) as {
        success?: boolean;
        error?: string;
        liked?: boolean;
        like_count?: number;
      };
      const failed = res && (res.success === false || res.error);
      if (!failed) {
        updateLikeInState(
          template.id,
          typeof res.liked === 'boolean' ? res.liked : !currentlyLiked,
          typeof res.like_count === 'number' ? res.like_count : optimisticCount
        );
      } else {
        updateLikeInState(template.id, currentlyLiked, template.like_count ?? 0);
      }
    } catch {
      updateLikeInState(template.id, currentlyLiked, template.like_count ?? 0);
    } finally {
      setLikeLoading(false);
    }
  }, [template, likeLoading, state.user?.id, updateLikeInState]);

  const handleBack = () => {
    router.back();
  };

  const currentIndex = useMemo(() => {
    if (!activeTemplateId || templateList.length === 0) return -1;
    return templateList.findIndex((t: any) => String(t.id) === String(activeTemplateId));
  }, [activeTemplateId, templateList]);

  const goPrev = useCallback(() => {
    if (currentIndex <= 0 || isTransitioning.current) return;
    const prevT = templateList[currentIndex - 1];
    if (prevT) runSlideTransition(String(prevT.id), 'prev');
  }, [currentIndex, templateList, runSlideTransition]);

  const goNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= templateList.length - 1 || isTransitioning.current) return;
    const nextT = templateList[currentIndex + 1];
    if (nextT) runSlideTransition(String(nextT.id), 'next');
  }, [currentIndex, templateList, runSlideTransition]);

  if (listLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#881337" />
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Template not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            fetchTemplateList();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleNavigate = (screen: string, params?: any) => {
    if (screen === 'template-edit' && params?.id) {
      router.push(`/template/${params.id}/edit`);
    }
  };

  const canGoPrev = templateList.length > 1 && currentIndex > 0;
  const canGoNext = templateList.length > 1 && currentIndex >= 0 && currentIndex < templateList.length - 1;

  return (
    <View style={styles.previewRoot} collapsable={false}>
      <TemplatePreview
        template={template}
        onBack={handleBack}
        onNavigate={handleNavigate}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevTemplate={goPrev}
        onNextTemplate={goNext}
        interactionLocked={slideAnimating}
        slideTranslateX={slideX}
        likeLoading={likeLoading}
        onToggleLike={state.user?.id ? handleToggleLike : undefined}
        headerUser={state.user ?? null}
        unreadNotificationCount={0}
        onNotificationsPress={() => router.push('/notifications')}
        onProfilePress={() => router.push('/profile')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  previewRoot: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#881337',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    padding: 20,
  },
  errorText: {
    color: '#881337',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#881337',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
