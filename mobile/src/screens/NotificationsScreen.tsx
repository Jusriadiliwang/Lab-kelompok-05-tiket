import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserNotifications } from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import type { Notification } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { formatDate, NOTIF_LABEL, NOTIF_ICON } from '../utils/helpers';

const POLL_INTERVAL = 30_000;

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifs, setNotifs]           = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    try {
      const data = await getUserNotifications(user.userId);
      setNotifs(data);
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      setUnreadCount(data.filter((n) => n.sentAt && new Date(n.sentAt).getTime() > yesterday).length);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  if (!user) return (
    <View style={styles.center}>
      <Ionicons name="notifications-off-outline" size={48} color={Colors.systemGrayLight} />
      <Text style={styles.emptyTitle}>Belum Login</Text>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.pureBlack} size="large" /></View>;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
          <Text style={styles.headerSub}>{notifs.length} total</Text>
        </View>
      </View>
      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={48} color={Colors.systemGrayLight} />
            <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
            <Text style={styles.emptySub}>Notifikasi tiket dan pembayaran akan muncul di sini.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta     = NOTIF_ICON[item.type] ?? { icon: 'notifications-outline', color: Colors.outline };
          const label    = NOTIF_LABEL[item.type] ?? item.type;
          const isFailed = item.type === 'FAILED_PAYMENT' || item.type === 'ORDER_CANCELLED';
          return (
            <View style={[styles.card, isFailed && styles.cardFailed]}>
              <View style={[styles.iconWrap, { backgroundColor: isFailed ? '#FFDAD6' : Colors.surfaceContainerHigh }]}>
                <Ionicons name={meta.icon as any} size={22} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardType}>{label}</Text>
                  <Text style={styles.cardTime}>{formatDate(item.sentAt, 'time')}</Text>
                </View>
                {item.payload?.event_name && <Text style={styles.cardEvent} numberOfLines={1}>{item.payload.event_name}</Text>}
                {item.payload?.message    && <Text style={styles.cardMsg} numberOfLines={2}>{item.payload.message}</Text>}
                <View style={styles.cardFooter}>
                  <View style={styles.channelBadge}>
                    <Ionicons name={item.channel === 'EMAIL' ? 'mail-outline' : 'phone-portrait-outline'} size={11} color={Colors.onSurfaceVariant} />
                    <Text style={styles.channelText}>{item.channel}</Text>
                  </View>
                  <View style={[styles.statusDot, item.status === 'SENT' ? styles.dotSent : item.status === 'FAILED' ? styles.dotFailed : styles.dotQueued]} />
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.marginMobile, gap: 8 },
  header: { paddingHorizontal: Spacing.marginMobile, paddingTop: 12, paddingBottom: Spacing.stackMd, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.surfaceContainerLowest, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:  { ...Typography.headlineMd, color: Colors.pureBlack },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSub:    { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  badge:        { backgroundColor: Colors.error, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:    { ...Typography.labelCaps, color: Colors.pureWhite, fontSize: 10 },
  list:         { padding: Spacing.marginMobile, gap: Spacing.stackSm, paddingBottom: 32 },
  card:         { flexDirection: 'row', gap: Spacing.stackMd, backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, padding: Spacing.stackMd, borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card },
  cardFailed:   { borderColor: '#FFDAD6' },
  iconWrap:     { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody:     { flex: 1, gap: 4 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardType:     { ...Typography.bodySm, fontFamily: 'Inter_600SemiBold', color: Colors.onBackground },
  cardTime:     { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },
  cardEvent:    { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  cardMsg:      { ...Typography.bodySm, color: Colors.onSurfaceVariant, lineHeight: 20 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  channelBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  channelText:  { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9 },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  dotSent:      { backgroundColor: Colors.successGreen },
  dotFailed:    { backgroundColor: Colors.error },
  dotQueued:    { backgroundColor: Colors.outline },
  emptyTitle:   { ...Typography.headlineMd, color: Colors.onBackground, textAlign: 'center' },
  emptySub:     { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});

