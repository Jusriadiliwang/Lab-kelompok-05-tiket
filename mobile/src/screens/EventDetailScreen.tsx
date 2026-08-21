import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getEvent, getEventSeats, getErpEventAnalytics } from '../api/events';
import { lockSeat } from '../api/tickets';
import { useAuth } from '../context/AuthContext';
import type { Event, SeatCategory, ErpAnalytics, HomeStackParamList } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { formatDate, formatPrice, getErrorMessage } from '../utils/helpers';

type Nav   = NativeStackNavigationProp<HomeStackParamList, 'EventDetail'>;
type Route = RouteProp<HomeStackParamList, 'EventDetail'>;

export default function EventDetailScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { eventId } = route.params;
  const { user }    = useAuth();

  const [event, setEvent]       = useState<Event | null>(null);
  const [seats, setSeats]       = useState<SeatCategory[]>([]);
  const [analytics, setAnalytics] = useState<ErpAnalytics | null>(null);
  const [selected, setSelected] = useState<SeatCategory | null>(null);
  const [loading, setLoading]   = useState(true);
  const [locking, setLocking]   = useState(false);

  useEffect(() => {
    Promise.all([getEvent(eventId), getEventSeats(eventId)])
      .then(([ev, cats]) => {
        setEvent(ev);
        setSeats(cats);
      })
      .catch(() => Alert.alert('Error', 'Gagal memuat detail event.'))
      .finally(() => setLoading(false));

    // ERP analytics — live stats (tidak blokir render utama)
    getErpEventAnalytics(eventId)
      .then(setAnalytics)
      .catch(() => { /* silent — ERP optional */ });
  }, [eventId]);

  const handleBuy = async () => {
    if (!selected || !user) return;
    setLocking(true);
    try {
      const res = await lockSeat({ eventId, seatId: selected.id, userId: user.userId });
      nav.navigate('Queue', {
        reservationId: res.reservationId,
        expiresAt:     res.expiresAt,
        price:         res.price ?? selected.price,
        categoryName:  res.categoryName ?? selected.name,
        eventName:     res.eventName ?? event?.name ?? '',
        eventId,
      });
    } catch (err: any) {
      const msg = err?.isRateLimit
        ? (err.friendlyMessage ?? 'Terlalu banyak request. Tunggu sebentar.')
        : (err?.response?.data?.message ?? 'Kursi sudah dipesan orang lain.');
      Alert.alert(err?.isRateLimit ? '⏱ Rate Limit' : 'Gagal Mengunci Kursi', msg);
    } finally {
      setLocking(false);
    }
  };

  if (loading || !event) {
    return <View style={styles.center}><ActivityIndicator color={Colors.pureBlack} size="large" /></View>;
  }

  const totalSelected = selected ? formatPrice(selected.price) : '--';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroWrap}>
          {event.bannerUrl ? (
            <Image source={{ uri: event.bannerUrl }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="musical-notes" size={48} color={Colors.systemGrayDark} />
            </View>
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroLabel}>LIVE IN CONCERT</Text>
            <Text style={styles.heroTitle}>{event.name.toUpperCase()}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{formatDate(event.eventDate)}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{event.venue}</Text>
            </View>
          </View>
        </View>

        {/* ERP Live Stats — dari erp-service M4 Analytics */}
        {analytics && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{analytics.ticketsSold?.toLocaleString('id-ID') ?? '—'}</Text>
              <Text style={styles.statLabel}>Terjual</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{analytics.ticketsAvailable?.toLocaleString('id-ID') ?? '—'}</Text>
              <Text style={styles.statLabel}>Tersedia</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{analytics.conversionRate != null ? `${analytics.conversionRate.toFixed(1)}%` : '—'}</Text>
              <Text style={styles.statLabel}>Konversi</Text>
            </View>
          </View>
        )}

        {/* Select Tickets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Tickets</Text>
          <View style={styles.seatList}>
            {seats.map((cat) => {
              const isSelected  = selected?.id === cat.id;
              const isAvailable = (cat.availableSeats ?? cat.totalSeats) > 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.seatRow, isSelected && styles.seatRowSelected, !isAvailable && styles.seatRowDisabled]}
                  onPress={() => isAvailable && setSelected(cat)}
                  activeOpacity={isAvailable ? 0.8 : 1}
                >
                  <View style={styles.seatInfo}>
                    <Text style={[styles.seatName, !isAvailable && styles.seatNameDisabled]}>{cat.name}</Text>
                    <Text style={[styles.seatDesc, !isAvailable && styles.seatNameDisabled]}>
                      {cat.name === 'VIP' ? 'Front row standing, Early Entry' :
                       cat.name === 'REGULER' ? 'Standard Seating, Mid Tier' :
                       'General Admission, Floor Area'}
                    </Text>
                    <Text style={[styles.seatAvail, !isAvailable && { color: Colors.error }]}>
                      {isAvailable ? 'Available' : 'Sold Out'}
                    </Text>
                  </View>
                  <View style={styles.seatRight}>
                    <Text style={[styles.seatPrice, !isAvailable && styles.seatNameDisabled]}>
                      {formatPrice(cat.price)}
                    </Text>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>{totalSelected}</Text>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, (!selected || locking) && styles.buyBtnDisabled]}
          onPress={handleBuy}
          disabled={!selected || locking}
          activeOpacity={0.88}
        >
          {locking ? (
            <ActivityIndicator color={Colors.pureWhite} />
          ) : (
            <Text style={styles.buyBtnText}>Buy Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 100 },

  heroWrap:    { position: 'relative', height: 320 },
  heroImage:   { width: '100%', height: 320, resizeMode: 'cover' },
  heroPlaceholder: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
    backgroundColor: 'transparent',
    // gradient via opacity layer
  },
  heroInfo: {
    position: 'absolute', bottom: Spacing.stackMd, left: Spacing.marginMobile, right: Spacing.marginMobile,
  },
  heroLabel: { ...Typography.labelCaps, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: {
    ...Typography.displayTicketWar, color: Colors.pureWhite,
    fontSize: 26, lineHeight: 32, marginBottom: Spacing.stackSm,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  heroMetaText:{ ...Typography.bodySm, color: 'rgba(255,255,255,0.85)' },

  section:      { padding: Spacing.marginMobile },
  sectionTitle: { ...Typography.headlineMd, color: Colors.onBackground, marginBottom: Spacing.stackMd },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginHorizontal: Spacing.marginMobile, marginTop: Spacing.stackMd,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    paddingVertical: Spacing.stackMd, ...Shadows.card,
  },
  statItem:    { alignItems: 'center', flex: 1 },
  statNum:     { ...Typography.headlineMd, fontSize: 20, color: Colors.pureBlack },
  statLabel:   { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.divider },

  seatList: { gap: Spacing.stackMd },
  seatRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.stackMd, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.card,
  },
  seatRowSelected: { borderColor: Colors.pureBlack, borderWidth: 2 },
  seatRowDisabled: { opacity: 0.45 },
  seatInfo: { flex: 1, gap: 2 },
  seatName: { ...Typography.headlineMd, fontSize: 18, color: Colors.onBackground },
  seatNameDisabled: { color: Colors.onSurfaceVariant },
  seatDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  seatAvail:{ ...Typography.labelCaps, color: Colors.successGreen, fontSize: 10 },
  seatRight:{ alignItems: 'flex-end', gap: 8 },
  seatPrice:{ ...Typography.price, color: Colors.onBackground },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.pureBlack },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.pureBlack },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.stackMd,
    paddingBottom: 28,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1, borderTopColor: Colors.divider,
    ...Shadows.modal,
  },
  totalLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginBottom: 2 },
  totalPrice: { ...Typography.price, color: Colors.onBackground, fontSize: 20 },
  buyBtn: {
    flex: 1, marginLeft: Spacing.stackMd, height: 56,
    backgroundColor: Colors.pureBlack, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnDisabled: { backgroundColor: Colors.systemGrayLight },
  buyBtnText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },
});
