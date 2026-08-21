import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getUserOrders, releaseOrder } from '../api/tickets';
import { cancelPayment, getPayment } from '../api/payments';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { formatDate, formatPrice, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, isOrderCancellable, isOrderConfirmed, getErrorMessage } from '../utils/helpers';

export default function MyTicketsScreen() {
  const { user } = useAuth();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { const data = await getUserOrders(user.userId); setOrders(data); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (item: Order) => {
    Alert.alert(
      'Batalkan Pesanan?',
      `Kursi ${item.categoryName ?? ''} untuk "${item.eventName ?? 'event ini'}" akan dilepas.`,
      [
        { text: 'Tidak', style: 'cancel' },
        { text: 'Ya, Batalkan', style: 'destructive', onPress: async () => {
          setCancelling(item.id);
          try {
            await releaseOrder(item.id);
            try { const pay = await getPayment(item.id); if (pay?.status === 'PENDING') await cancelPayment(item.id); } catch {}
            setOrders((prev) => prev.map((o) => o.id === item.id ? { ...o, status: 'CANCELLED' as any } : o));
            Alert.alert('✅ Berhasil', 'Pesanan berhasil dibatalkan. Kursi sudah dilepas.');
          } catch (err: any) {
            Alert.alert('Gagal', getErrorMessage(err, 'Gagal membatalkan pesanan.'));
          } finally { setCancelling(null); }
        }},
      ]
    );
  };

  if (!user) return (
    <View style={styles.center}>
      <Ionicons name="ticket-outline" size={48} color={Colors.systemGrayLight} />
      <Text style={styles.emptyTitle}>Belum Login</Text>
      <Text style={styles.emptySubtitle}>Login untuk melihat tiket kamu.</Text>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.pureBlack} size="large" /></View>;

  const confirmed = orders.filter((o) => isOrderConfirmed(o.status));

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <Text style={styles.headerSub}>{confirmed.length} tiket aktif</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="ticket-outline" size={48} color={Colors.systemGrayLight} />
            <Text style={styles.emptyTitle}>Belum ada pesanan</Text>
            <Text style={styles.emptySubtitle}>Tiket yang kamu beli akan muncul di sini.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded === item.id;
          const isCancelling = cancelling === item.id;
          const canCancel = isOrderCancellable(item.status);
          const statusColor = ORDER_STATUS_COLOR[item.status] ?? Colors.outline;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.9}>
              <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.eventName} numberOfLines={1}>{item.eventName ?? 'Event'}</Text>
                    {item.eventDate && <Text style={styles.meta}>{formatDate(item.eventDate)}</Text>}
                    {item.venue && <Text style={styles.meta} numberOfLines={1}>{item.venue}</Text>}
                    {item.categoryName && <Text style={styles.category}>{item.categoryName}</Text>}
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{ORDER_STATUS_LABEL[item.status] ?? item.status}</Text>
                    </View>
                    {item.price ? <Text style={styles.price}>{formatPrice(item.price)}</Text> : null}
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.onSurfaceVariant} />
                  </View>
                </View>
                {isOpen && isOrderConfirmed(item.status) && (
                  <View style={styles.qrSection}>
                    <View style={styles.divider} />
                    <Text style={styles.qrLabel}>E-TICKET QR CODE</Text>
                    <View style={styles.qrWrap}>
                      <QRCode value={item.id} size={150} color={Colors.pureBlack} backgroundColor={Colors.pureWhite} />
                    </View>
                    <Text style={styles.qrId}>{item.id.toUpperCase()}</Text>
                    {item.eventDate && <Text style={styles.ticketMeta}>{formatDate(item.eventDate, 'long')}</Text>}
                  </View>
                )}
                {isOpen && canCancel && (
                  <View style={styles.expandedInfo}>
                    <View style={styles.divider} />
                    <Text style={styles.expandedNote}>Kursi dikunci. Selesaikan pembayaran sebelum waktu habis.</Text>
                    <Text style={styles.orderId}>ID: {item.id}</Text>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)} disabled={isCancelling} activeOpacity={0.8}>
                      {isCancelling ? <ActivityIndicator color={Colors.error} size="small" /> : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                          <Text style={styles.cancelBtnText}>Batalkan Pesanan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {isOpen && !isOrderConfirmed(item.status) && !canCancel && (
                  <View style={styles.expandedInfo}>
                    <View style={styles.divider} />
                    <Text style={styles.expandedNote}>
                      {item.status === 'EXPIRED'   ? '⏱ Reservasi berakhir. Waktu pembayaran habis.' : '✕ Pesanan dibatalkan.'}
                    </Text>
                    <Text style={styles.orderId}>ID: {item.id}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },
  center:{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.marginMobile },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  header: { paddingHorizontal: Spacing.marginMobile, paddingTop: 12, paddingBottom: Spacing.stackMd, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.surfaceContainerLowest, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  headerTitle: { ...Typography.headlineMd, color: Colors.pureBlack },
  headerSub:   { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  list: { padding: Spacing.marginMobile, gap: Spacing.stackMd, paddingBottom: 32 },
  card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder, flexDirection: 'row', ...Shadows.card },
  statusStrip: { width: 4 },
  cardContent: { flex: 1, padding: Spacing.stackMd },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo:    { flex: 1, gap: 3 },
  eventName:   { ...Typography.headlineMd, fontSize: 16, color: Colors.onBackground },
  meta:        { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  category:    { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10, marginTop: 2 },
  cardRight:   { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statusText:  { ...Typography.labelCaps, fontSize: 10 },
  price:       { ...Typography.bodySm, color: Colors.onBackground, fontFamily: 'Inter_600SemiBold' },
  divider:     { height: 1, backgroundColor: Colors.divider, width: '100%', marginVertical: Spacing.stackSm },
  qrSection:   { alignItems: 'center', gap: Spacing.stackSm },
  qrLabel:     { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  qrWrap:      { padding: Spacing.stackMd, backgroundColor: Colors.pureWhite, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  qrId:        { ...Typography.labelCaps, color: Colors.onSurfaceVariant, letterSpacing: 1, fontSize: 9 },
  ticketMeta:  { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },
  expandedInfo:  { gap: 8 },
  expandedNote:  { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  orderId:       { ...Typography.labelCaps, color: Colors.systemGrayDark, fontSize: 9 },
  cancelBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.error, borderRadius: Radius.lg, paddingVertical: 8, paddingHorizontal: 16, marginTop: 4 },
  cancelBtnText: { ...Typography.bodySm, color: Colors.error, fontFamily: 'Inter_600SemiBold' },
  emptyTitle:    { ...Typography.headlineMd, color: Colors.onBackground },
  emptySubtitle: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
