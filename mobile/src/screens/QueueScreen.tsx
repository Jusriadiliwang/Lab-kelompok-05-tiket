import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Easing, Alert, ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOrder } from '../api/tickets';
import type { HomeStackParamList } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

type Nav   = NativeStackNavigationProp<HomeStackParamList, 'Queue'>;
type Route = RouteProp<HomeStackParamList, 'Queue'>;

function useCountdown(expiresAt: string) {
  const [seconds, setSeconds] = useState(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return { display: `${m}:${s}`, seconds, expired: seconds === 0 };
}

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function QueueScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { reservationId, expiresAt, price, categoryName, eventName } = route.params;
  const { display, seconds, expired } = useCountdown(expiresAt);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Poll order status every 3s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const order = await getOrder(reservationId);
        if (order.status === 'CONFIRMED') {
          clearInterval(id);
          nav.replace('OrderConfirmation', { orderId: reservationId });
        } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
          clearInterval(id);
          Alert.alert('Reservasi Berakhir', 'Kursi sudah dilepas. Silakan pilih kursi lagi.', [
            { text: 'OK', onPress: () => nav.popToTop() },
          ]);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [reservationId]);

  useEffect(() => {
    if (expired) {
      Alert.alert('Waktu Habis', 'Kamu tidak menyelesaikan pembayaran dalam waktu yang ditentukan.', [
        { text: 'OK', onPress: () => nav.popToTop() },
      ]);
    }
  }, [expired]);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handleLanjutBayar = () => {
    nav.navigate('Checkout', {
      reservationId,
      expiresAt,
      price,
      categoryName,
      eventName,
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.popToTop()}>
          <Ionicons name="close" size={24} color={Colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>War Tiket</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Queue Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>You are in line.</Text>
        <Text style={styles.cardWarning}>⚠  Please do not refresh the page.</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.onSurfaceVariant} />
          <Text style={styles.secureText}>Secure Queue Connection</Text>
        </View>
      </View>

      {/* Countdown pill */}
      <View style={styles.countdownPill}>
        <Ionicons name="timer-outline" size={16} color={Colors.onSurfaceVariant} />
        <Text style={styles.countdownLabel}>RESERVATION LOCK ENDS IN</Text>
        <Text style={[styles.countdownTimer, seconds < 60 && styles.countdownUrgent]}>{display}</Text>
      </View>

      {/* Order summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Ringkasan Pesanan</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Event</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>{eventName || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Kategori</Text>
          <Text style={styles.summaryValue}>{categoryName || '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Reservasi ID</Text>
          <Text style={styles.summaryValue}>{reservationId}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryTotal}>{formatPrice(price)}</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.payBtn, expired && styles.payBtnDisabled]}
        onPress={handleLanjutBayar}
        disabled={expired}
        activeOpacity={0.88}
      >
        <Ionicons name="card-outline" size={20} color={Colors.pureWhite} />
        <Text style={styles.payBtnText}>Lanjut Bayar — {formatPrice(price)}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Kursi dikunci untuk kamu selama{' '}
        <Text style={{ fontFamily: 'Inter_700Bold' }}>{display}</Text> menit.{'\n'}
        Selesaikan pembayaran sebelum waktu habis.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingBottom: 48,
  },

  header: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, paddingBottom: Spacing.stackLg,
  },
  headerTitle: { ...Typography.headlineMd, color: Colors.pureBlack },

  card: {
    width: '100%', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.stackLg,
    alignItems: 'center', gap: Spacing.stackMd,
    borderWidth: 1, borderColor: Colors.cardBorder,
    ...Shadows.card,
    marginBottom: Spacing.stackMd,
  },
  cardHeading: { ...Typography.headlineMd, color: Colors.onBackground, fontSize: 20 },
  cardWarning: { ...Typography.bodySm, color: Colors.error, textAlign: 'center' },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: Colors.systemGrayLight, borderRadius: Radius.full, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: Colors.pureBlack, borderRadius: Radius.full },
  secureRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText:  { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 11 },

  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.countdownBackground,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.stackMd, paddingVertical: Spacing.stackSm,
    marginBottom: Spacing.stackLg,
  },
  countdownLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },
  countdownTimer: { ...Typography.countdown, color: Colors.onBackground },
  countdownUrgent:{ color: Colors.error },

  summaryCard: {
    width: '100%', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.stackMd,
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: Spacing.stackLg, ...Shadows.card,
  },
  summaryTitle: { ...Typography.headlineMd, fontSize: 16, color: Colors.onBackground, marginBottom: Spacing.stackSm },
  summaryRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10 },
  summaryLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, width: 100 },
  summaryValue: { ...Typography.bodySm, color: Colors.onBackground, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'right' },
  summaryTotal: { ...Typography.price, color: Colors.pureBlack, fontSize: 18, textAlign: 'right' },
  divider:      { height: 1, backgroundColor: Colors.divider },

  payBtn: {
    width: '100%', height: 60, backgroundColor: Colors.pureBlack,
    borderRadius: Radius.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: Spacing.stackMd,
  },
  payBtnDisabled: { backgroundColor: Colors.systemGrayLight },
  payBtnText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },

  hint: {
    ...Typography.bodySm, color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22,
  },
});

