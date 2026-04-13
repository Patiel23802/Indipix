/**
 * In-app template sharing (conversations + catalog templates only). Backend: /api/template-share.
 * Not linked from the home tab bar for now; kept for a future release. Use Contact tab for user feedback.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { ArrowLeft, MessageCirclePlus, Send, Users, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';

const HOME_TEXT = '#1F2937';

type OtherUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo_url?: string | null;
};

type ConversationRow = {
  conversation_id: string;
  other_user_id: string;
  other_user: OtherUser;
  updated_at: string;
  last_message: {
    template_id: string;
    template_name?: string | null;
    file_url?: string | null;
    sender_id: string;
    created_at: string;
  } | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  template_id: string;
  created_at: string;
  template_name?: string | null;
  file_url?: string | null;
};

type TemplatePick = {
  id: string;
  name: string;
  file_url?: string | null;
};

const PRIMARY = '#8B1A3D';
const SUB = '#6B7280';

function displayName(u: OtherUser | null | undefined) {
  if (!u) return 'User';
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || `User ${u.id.slice(0, 6)}`;
}

type ServerContactMatch = {
  user: OtherUser;
  phone_last10: string;
  phone_full_norm: string;
};

function normalizeDigitsLocal(s: string) {
  return String(s || '').replace(/\D/g, '');
}

function linkContactsToAccounts(
  contactRows: { name: string; phones: string[] }[],
  serverMatches: ServerContactMatch[]
): { contactLabel: string; user: OtherUser }[] {
  const findMatch = (d: string): ServerContactMatch | undefined => {
    if (d.length < 8) return undefined;
    const byFull = serverMatches.find((m) => m.phone_full_norm === d);
    if (byFull) return byFull;
    const l10 = d.slice(-10);
    return serverMatches.find((m) => m.phone_last10 === l10);
  };
  const byUserId = new Map<string, { user: OtherUser; contactLabel: string }>();
  for (const row of contactRows) {
    for (const raw of row.phones) {
      const d = normalizeDigitsLocal(raw);
      const m = findMatch(d);
      if (!m) continue;
      if (!byUserId.has(m.user.id)) {
        byUserId.set(m.user.id, { user: m.user, contactLabel: row.name });
      }
    }
  }
  return Array.from(byUserId.values()).sort((a, b) =>
    a.contactLabel.localeCompare(b.contactLabel, undefined, { sensitivity: 'base' })
  );
}

export function TemplateShareInbox({
  userId,
  getFileUrl,
  onOpenTemplate,
}: {
  userId: string;
  getFileUrl: (path: string) => string;
  onOpenTemplate: (templateId: string) => void;
}) {
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadOther, setThreadOther] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const [newModal, setNewModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [openBusy, setOpenBusy] = useState(false);
  const [contactsScanBusy, setContactsScanBusy] = useState(false);
  const [contactAccountMatches, setContactAccountMatches] = useState<
    { contactLabel: string; user: OtherUser }[]
  >([]);

  const closeNewModal = () => {
    setNewModal(false);
    setPhoneInput('');
    setContactAccountMatches([]);
  };

  const [pickModal, setPickModal] = useState(false);
  const [pickList, setPickList] = useState<TemplatePick[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const loadConversations = useCallback(async () => {
    setListError(null);
    try {
      const res = (await api.getTemplateShareConversations(userId)) as {
        success?: boolean;
        data?: ConversationRow[];
        error?: string;
      };
      if (res?.success && Array.isArray(res.data)) {
        setConversations(res.data);
      } else {
        const err = (res as { error?: string })?.error;
        setListError(err || 'Could not load conversations. Is template sharing enabled on the server?');
        setConversations([]);
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Network error');
      setConversations([]);
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (view === 'list') {
      setListLoading(true);
      loadConversations();
    }
  }, [view, loadConversations]);

  const openThread = useCallback(
    async (convId: string, other: OtherUser) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setThreadId(convId);
      setThreadOther(other);
      setView('thread');
      setMsgLoading(true);
      setMessages([]);
      try {
        const res = (await api.getTemplateShareMessages(convId, userId)) as {
          success?: boolean;
          data?: MessageRow[];
        };
        if (res?.success && Array.isArray(res.data)) {
          setMessages(res.data);
        }
      } finally {
        setMsgLoading(false);
      }
    },
    [userId]
  );

  const backToList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setView('list');
    setThreadId(null);
    setThreadOther(null);
    setMessages([]);
    loadConversations();
  };

  const handleOpenNew = async () => {
    const phone = phoneInput.trim();
    if (!phone) return;
    setOpenBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.openTemplateShareConversation({
        userId,
        otherPhone: phone,
      })) as {
        success?: boolean;
        data?: { conversation_id: string; other_user: OtherUser };
        error?: string;
      };
      if (res?.success && res.data?.conversation_id) {
        closeNewModal();
        await openThread(res.data.conversation_id, res.data.other_user || { id: '' });
      } else {
        setListError((res as { error?: string }).error || 'Could not start chat');
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setOpenBusy(false);
    }
  };

  const handleOpenWithUserId = async (otherUser: OtherUser) => {
    setOpenBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = (await api.openTemplateShareConversation({
        userId,
        otherUserId: otherUser.id,
      })) as {
        success?: boolean;
        data?: { conversation_id: string; other_user: OtherUser };
        error?: string;
      };
      if (res?.success && res.data?.conversation_id) {
        closeNewModal();
        await openThread(res.data.conversation_id, res.data.other_user || otherUser);
      } else {
        setListError((res as { error?: string }).error || 'Could not start chat');
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setOpenBusy(false);
    }
  };

  const scanDeviceContactsForAccounts = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not available on web',
        'Contact matching works in the iOS and Android apps. Enter a phone number manually below.'
      );
      return;
    }
    const perm = await Contacts.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Contacts access needed',
        'Allow access to your address book so we can match people who use indipix with the same phone number they registered.'
      );
      return;
    }
    setContactsScanBusy(true);
    setContactAccountMatches([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      const allPhones: string[] = [];
      const contactRows: { name: string; phones: string[] }[] = [];
      for (const c of data) {
        const nums = (c.phoneNumbers || []).map((p) => p.number || '').filter(Boolean);
        if (nums.length === 0) continue;
        const name =
          [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
          (typeof c.name === 'string' ? c.name : '') ||
          'Contact';
        contactRows.push({ name, phones: nums });
        allPhones.push(...nums);
      }
      if (allPhones.length === 0) {
        Alert.alert('No numbers found', 'None of your contacts have phone numbers on this device.');
        return;
      }
      const res = (await api.matchTemplateShareContacts(userId, allPhones)) as {
        success?: boolean;
        data?: { matches?: ServerContactMatch[] };
        error?: string;
      };
      if (!res?.success) {
        Alert.alert('Could not match contacts', res?.error || 'Server error');
        return;
      }
      const serverMatches = res.data?.matches || [];
      const linked = linkContactsToAccounts(contactRows, serverMatches);
      setContactAccountMatches(linked);
      if (linked.length === 0) {
        Alert.alert(
          'No matches yet',
          'None of your contacts are registered on indipix with these numbers. You can still invite someone by typing their registered phone number below.'
        );
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to read contacts');
    } finally {
      setContactsScanBusy(false);
    }
  };

  const openPickTemplate = async () => {
    if (!threadId) return;
    setPickModal(true);
    setPickLoading(true);
    setPickList([]);
    try {
      const res = (await api.getTemplatesWithLikes({ userId, sort: 'trending', limit: 40 })) as {
        success?: boolean;
        data?: TemplatePick[];
      };
      const raw = res?.data;
      setPickList(Array.isArray(raw) ? raw : []);
    } finally {
      setPickLoading(false);
    }
  };

  const sendTemplate = async (templateId: string) => {
    if (!threadId) return;
    setSendBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const res = (await api.sendTemplateShareMessage(threadId, userId, templateId)) as {
        success?: boolean;
        data?: MessageRow;
      };
      if (res?.success && res.data) {
        setMessages((prev) => [...prev, res.data as MessageRow]);
        setPickModal(false);
      }
    } finally {
      setSendBusy(false);
    }
  };

  const renderConversation = ({ item }: { item: ConversationRow }) => {
    const thumb = item.last_message?.file_url;
    return (
      <TouchableOpacity
        style={styles.convRow}
        onPress={() => openThread(item.conversation_id, item.other_user)}
        activeOpacity={0.85}
      >
        <View style={styles.convAvatar}>
          {item.other_user?.profile_photo_url ? (
            <Image
              source={{ uri: getFileUrl(item.other_user.profile_photo_url) }}
              style={styles.convAvatarImg}
            />
          ) : (
            <Text style={styles.convAvatarTxt}>{displayName(item.other_user).charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.convBody}>
          <Text style={styles.convName} numberOfLines={1}>
            {displayName(item.other_user)}
          </Text>
          <Text style={styles.convPreview} numberOfLines={1}>
            {item.last_message
              ? item.last_message.template_name || 'Template'
              : 'No templates yet — send one'}
          </Text>
        </View>
        {thumb ? (
          <Image source={{ uri: getFileUrl(thumb) }} style={styles.convThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.convThumb, styles.convThumbPlaceholder]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: MessageRow }) => {
    const mine = String(item.sender_id) === String(userId);
    const thumb = item.file_url;
    return (
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs]}>
        <TouchableOpacity
          style={styles.msgBubble}
          onPress={() => onOpenTemplate(item.template_id)}
          activeOpacity={0.9}
        >
          {thumb ? (
            <Image source={{ uri: getFileUrl(thumb) }} style={styles.msgImg} resizeMode="cover" />
          ) : (
            <View style={[styles.msgImg, styles.msgImgPh]}>
              <Text style={styles.msgImgPhTxt}>Template</Text>
            </View>
          )}
          <Text style={styles.msgCaption} numberOfLines={2}>
            {item.template_name || 'Tap to open template'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (view === 'thread' && threadId) {
    return (
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.threadTop}>
          <TouchableOpacity onPress={backToList} style={styles.iconBtn}>
            <ArrowLeft size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.threadTitle} numberOfLines={1}>
            {displayName(threadOther)}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.threadHint}>Only catalog templates can be shared in this chat</Text>
        {msgLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={PRIMARY} />
        ) : (
          <FlatList
            style={styles.flex1}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            ListEmptyComponent={
              <Text style={styles.emptyThread}>No templates yet. Send one below.</Text>
            }
          />
        )}
        <TouchableOpacity style={styles.sendTemplateBtn} onPress={openPickTemplate} activeOpacity={0.9}>
          <Send size={18} color="#fff" />
          <Text style={[styles.sendTemplateBtnTxt, { marginLeft: 8 }]}>Send a template</Text>
        </TouchableOpacity>

        <Modal visible={pickModal} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Choose template</Text>
                <TouchableOpacity onPress={() => setPickModal(false)}>
                  <X size={24} color={SUB} />
                </TouchableOpacity>
              </View>
              {pickLoading ? (
                <ActivityIndicator color={PRIMARY} style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={pickList}
                  keyExtractor={(t) => t.id}
                  numColumns={2}
                  columnWrapperStyle={styles.pickCol}
                  renderItem={({ item: t }) => (
                    <TouchableOpacity
                      style={styles.pickCard}
                      disabled={sendBusy}
                      onPress={() => sendTemplate(t.id)}
                    >
                      {t.file_url ? (
                        <Image
                          source={{ uri: getFileUrl(t.file_url) }}
                          style={styles.pickImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.pickImg, styles.pickImgPh]} />
                      )}
                      <Text numberOfLines={2} style={styles.pickName}>
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.flex1}>
      <View style={styles.listHead}>
        <View>
          <Text style={styles.listTitle}>Template inbox</Text>
          <Text style={styles.listSub}>
            Share templates with people in your contacts who use indipix, or enter their registered phone
          </Text>
        </View>
        <TouchableOpacity style={styles.newChatBtn} onPress={() => setNewModal(true)}>
          <MessageCirclePlus size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {listError ? <Text style={styles.bannerErr}>{listError}</Text> : null}
      {listLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={PRIMARY} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.conversation_id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConversations();
              }}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyList}>
              No conversations yet. Tap + to match contacts with accounts or enter a phone number.
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={newModal} transparent animationType="fade" onRequestClose={closeNewModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.newConvSheet}>
            <View style={styles.newConvSheetHeader}>
              <Text style={styles.modalTitle}>New conversation</Text>
              <TouchableOpacity onPress={closeNewModal} hitSlop={12}>
                <X size={24} color={SUB} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.newConvScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.scanContactsBtn}
                onPress={scanDeviceContactsForAccounts}
                disabled={contactsScanBusy || openBusy}
                activeOpacity={0.85}
              >
                {contactsScanBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.scanContactsBtnInner}>
                    <Users size={20} color="#fff" />
                    <Text style={styles.scanContactsBtnTxt}>Find people from contacts</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.modalSub}>
                We only show contacts whose phone number matches a indipix account (same number they signed up
                with). Your contact list stays on your device; the app sends numbers to the server only to check
                for matches.
              </Text>

              {contactAccountMatches.length > 0 ? (
                <View style={styles.matchedBlock}>
                  <Text style={styles.matchedTitle}>On indipix</Text>
                  {contactAccountMatches.map(({ contactLabel, user: u }) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.matchedRow}
                      onPress={() => handleOpenWithUserId(u)}
                      disabled={openBusy}
                      activeOpacity={0.85}
                    >
                      <View style={styles.convAvatar}>
                        {u.profile_photo_url ? (
                          <Image
                            source={{ uri: getFileUrl(u.profile_photo_url) }}
                            style={styles.convAvatarImg}
                          />
                        ) : (
                          <Text style={styles.convAvatarTxt}>
                            {displayName(u).charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.convBody}>
                        <Text style={styles.convName} numberOfLines={1}>
                          {contactLabel}
                        </Text>
                        <Text style={styles.matchedAccountLine} numberOfLines={1}>
                          Account: {displayName(u)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.modalSub, { marginTop: 16 }]}>Or enter their registered phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor={SUB}
                keyboardType="phone-pad"
                value={phoneInput}
                onChangeText={setPhoneInput}
              />
              <TouchableOpacity
                style={[styles.modalGoWide, openBusy && { opacity: 0.6 }]}
                disabled={openBusy || !phoneInput.trim()}
                onPress={handleOpenNew}
              >
                {openBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalGoTxt}>Start chat</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  listHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listTitle: { fontSize: 20, fontWeight: '700', color: HOME_TEXT },
  listSub: { fontSize: 12, color: SUB, marginTop: 4, maxWidth: '85%' },
  newChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerErr: {
    marginHorizontal: 20,
    marginBottom: 8,
    color: '#b91c1c',
    fontSize: 13,
  },
  listContent: { paddingBottom: 24 },
  emptyList: { textAlign: 'center', color: SUB, marginTop: 48, paddingHorizontal: 32, fontSize: 14 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  convAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  convAvatarImg: { width: 48, height: 48 },
  convAvatarTxt: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  convBody: { flex: 1, marginLeft: 12 },
  convName: { fontSize: 16, fontWeight: '600', color: HOME_TEXT },
  convPreview: { fontSize: 13, color: SUB, marginTop: 2 },
  convThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6' },
  convThumbPlaceholder: { borderWidth: 1, borderColor: '#e5e7eb' },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  threadTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: HOME_TEXT, textAlign: 'center' },
  threadHint: {
    fontSize: 11,
    color: SUB,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  msgList: { padding: 16, paddingBottom: 100 },
  emptyThread: { textAlign: 'center', color: SUB, marginTop: 24 },
  msgRow: { marginBottom: 12, maxWidth: '88%' },
  msgRowMine: { alignSelf: 'flex-end' },
  msgRowTheirs: { alignSelf: 'flex-start' },
  msgBubble: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxWidth: 220,
  },
  msgImg: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#f3f4f6' },
  msgImgPh: { alignItems: 'center', justifyContent: 'center' },
  msgImgPhTxt: { color: SUB, fontSize: 13 },
  msgCaption: { padding: 8, fontSize: 13, color: HOME_TEXT },
  sendTemplateBtn: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendTemplateBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '78%',
    paddingBottom: 24,
  },
  modalCard: {
    margin: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  newConvSheet: {
    marginHorizontal: 16,
    marginVertical: 48,
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  newConvSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  newConvScroll: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  scanContactsBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  scanContactsBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanContactsBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  matchedBlock: {
    marginTop: 20,
  },
  matchedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_TEXT,
    marginBottom: 8,
  },
  matchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  matchedAccountLine: {
    fontSize: 12,
    color: SUB,
    marginTop: 2,
  },
  modalGoWide: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: HOME_TEXT },
  modalSub: { fontSize: 13, color: SUB, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: HOME_TEXT,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelTxt: { color: SUB, fontSize: 16 },
  modalGo: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalGoTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
  pickCol: { gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  pickCard: { flex: 1, maxWidth: '48%', backgroundColor: '#f9fafb', borderRadius: 10, overflow: 'hidden' },
  pickImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#e5e7eb' },
  pickImgPh: {},
  pickName: { fontSize: 12, padding: 8, color: HOME_TEXT },
});
