import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
  FlatList,
  RefreshControl,
} from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { api } from '@/lib/api';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

type NotificationItem = {
  id: string | number;
  title: string;
  message?: string;
  body?: string;
  created_at: string;
  data?: unknown;
};

function parseNotificationCategorySlug(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === 'object' && data !== null && 'category_slug' in data) {
    const v = (data as { category_slug?: unknown }).category_slug;
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  if (typeof data === 'string') {
    try {
      return parseNotificationCategorySlug(JSON.parse(data));
    } catch {
      return null;
    }
  }
  return null;
}

function NotificationSwipeRow({
  item,
  userId,
  categorySlug,
  onDismissed,
  onNavigateCategory,
}: {
  item: NotificationItem;
  userId: string;
  categorySlug: string | null;
  onDismissed: (id: string | number) => void;
  onNavigateCategory: (slug: string) => void;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const [busy, setBusy] = useState(false);

  const text = item.message ?? item.body ?? '';

  const openCategory = async () => {
    if (!categorySlug || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.markNotificationRead(userId, item.id)) as { success?: boolean; error?: string };
      if (res?.success) {
        swipeRef.current?.close();
        onDismissed(item.id);
        onNavigateCategory(categorySlug);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.markNotificationRead(userId, item.id)) as { success?: boolean; error?: string };
      if (res?.success) {
        swipeRef.current?.close();
        onDismissed(item.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  };

  const renderRight = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.swipeActions}
        onPress={dismiss}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Animated.View style={[styles.swipeDeleteInner, { transform: [{ scale }] }]}>
          <Trash2 size={22} color={COLORS.white} />
          <Text style={styles.swipeDeleteLabel}>Dismiss</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRight}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={openCategory}
        activeOpacity={categorySlug ? 0.88 : 1}
        disabled={!categorySlug || busy}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{text}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
          {categorySlug ? (
            <View style={styles.openHint}>
              <Text style={styles.openHintText}>Open category</Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.65)" />
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { state } = useFirebaseAuth();
  const user = state.user;

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setItems([]);
      setError('Missing account id. Sign out and sign in again.');
      return;
    }
    try {
      setError(null);
      const res = await api.getNotifications(user.id);
      if (res?.success && res.data) {
        setItems(Array.isArray(res.data) ? res.data : []);
      } else {
        const errRes = res as { error?: string; message?: string };
        setError(errRes.error || errRes.message || 'Could not load notifications');
        setItems([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchNotifications();
  }, [user, fetchNotifications, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
    setRefreshing(false);
  };

  const onDismissed = useCallback((id: string | number) => {
    setItems((prev) => prev.filter((n) => String(n.id) !== String(id)));
  }, []);

  const navigateToCategory = useCallback(
    (slug: string) => {
      router.replace(`/home?openCategory=${encodeURIComponent(slug)}` as any);
    },
    [router]
  );

  const onMarkAllRead = async () => {
    if (!user?.id || items.length === 0 || markAllBusy) return;
    setMarkAllBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.markAllNotificationsRead(user.id)) as { success?: boolean; error?: string };
      if (res?.success) {
        setItems([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setMarkAllBusy(false);
    }
  };

  if (!user) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {items.length > 0 && !loading ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={onMarkAllRead}
              disabled={markAllBusy}
              activeOpacity={0.85}
            >
              {markAllBusy ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.markAllText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.centerText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => String(n.id)}
            contentContainerStyle={items.length === 0 ? styles.flatEmpty : styles.flatContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EAB308" />
            }
            renderItem={({ item }) => (
              <View style={styles.rowWrap}>
                <NotificationSwipeRow
                  item={item}
                  userId={user.id}
                  categorySlug={parseNotificationCategorySlug(item.data)}
                  onDismissed={onDismissed}
                  onNavigateCategory={navigateToCategory}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  You’re up to date. New updates will appear here based on your profile.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#221015' },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B1A3D',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: { width: 40 },
  markAllButton: {
    minWidth: 112,
    maxWidth: 140,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { marginTop: 12, color: '#EAB308', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#FCA5A5', textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: '#EAB308', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  retryText: { color: '#221015', fontWeight: '800' },
  flatContent: { padding: 16, paddingBottom: 32, gap: 0 },
  flatEmpty: { flexGrow: 1, padding: 16 },
  rowWrap: { marginBottom: 12 },
  empty: { paddingTop: 48, alignItems: 'center', paddingHorizontal: 16 },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
  },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  body: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: { color: 'rgba(255,255,255,0.55)', fontSize: 11, flex: 1 },
  openHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openHintText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  swipeActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  swipeDeleteInner: {
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    flex: 1,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  swipeDeleteLabel: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});
