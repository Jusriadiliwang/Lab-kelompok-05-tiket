import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getOrder } from '../api/tickets';
import type { Order, HomeStackParamList } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

type Nav   = NativeStackNavigationProp<HomeStackParamList, 'OrderConfirmation'>;
type Route = RouteProp<HomeStackParamList, 'OrderConfirmation'>;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function OrderConfirmationScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(orderId)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.pureBlack} size="large" /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Gagal memuat konfirmasi pesanan.</Text>
      </View>
    );
  }

  const isConfirmed = order.status === 'CONFIRMED';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Status Icon */}
      <View style={[styles.iconCircle, isConfirmed ? styles.iconSuccess : styles.iconPending]}>
        <Ionicons
          name={isConfirmed ? 'checkmark' : 'time-outline'}
          size={40}
          color={isConfirmed ? Colors.pureWhite : Colors.onSurfaceVariant}
        />
      </View>

      <Text style={styles.title}>
        {isConfirmed ? 'Pesanan Terkonfirmasi!' : 'Pesanan Diproses'}
      </Text>
      <Text style={styles.subtitle}>
        {isConfirmed
          ? 'E-tiket kamu siap. Tunjukkan QR code ini di pintu masuk.'
          : 'Pembayaran sedang diproses. Refresh halaman ini sebentar lagi.'}
      </Text>

      {/* Order Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Event</Text>
          <Text style={styles.rowValue} numberOfLines={2}>{order.eventName ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Tanggal</Text>
          <Text style={styles.rowValue}>{order.eventDate ? formatDate(order.eventDate) : '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Venue</Text>
          <Text style={styles.rowValue}>{order.venue ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Kategori</Text>
          <Text style={styles.rowValue}>{order.categoryName ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Kode Kursi</Text>
          <Text style={styles.rowValue}>{order.seatCode ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Status</Text>
          <View style={[styles.statusBadge, isConfirmed ? styles.statusBadgeSuccess : styles.statusBadgePending]}>
            <Text style={[styles.statusBadgeText, isConfirmed && styles.statusBadgeTextSuccess]}>
              {order.status}
            </Text>
          </View>
        </View>
      </View>

      {/* QR Code */}
      {isConfirmed && (
        <View style={styles.qrCard}>
          <Text style={styles.qrLabel}>E-TICKET QR CODE</Text>
          <View style={styles.qrWrap}>
            <QRCode
              value={order.id}
              size={180}
              color={Colors.pureBlack}
              backgroundColor={Colors.pureWhite}
            />
          </View>
          <Text style={styles.qrId}>{order.id.slice(0, 16).toUpperCase()}</Text>
        </View>
      )}

      {/* Action */}
      <TouchableOpacity style={styles.homeBtn} onPress={() => nav.popToTop()} activeOpacity={0.88}>
        <Text style={styles.homeBtnText}>Kembali ke Beranda</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: {
    alignItems: 'center', padding: Spacing.marginMobile,
    paddingTop: Spacing.stackLg, paddingBottom: 48,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...Typography.bodyLg, color: Colors.onSurfaceVariant },

  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.stackMd,
  },
  iconSuccess: { backgroundColor: Colors.pureBlack },
  iconPending: { backgroundColor: Colors.systemGrayLight },

  title: { ...Typography.headlineLg, color: Colors.onBackground, textAlign: 'center', marginBottom: 8 },
  subtitle: {
    ...Typography.bodySm, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginBottom: Spacing.stackLg, lineHeight: 22,
  },

  card: {
    width: '100%', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.stackMd,
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: Spacing.stackLg, ...Shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  rowValue: { ...Typography.bodySm, color: Colors.onBackground, fontFamily: 'Inter_600SemiBold', flex: 2, textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.divider },

  statusBadge: {
    borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: Colors.systemGrayLight,
  },
  statusBadgePending: { backgroundColor: Colors.systemGrayLight },
  statusBadgeSuccess: { backgroundColor: Colors.pureBlack },
  statusBadgeText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },
  statusBadgeTextSuccess: { color: Colors.pureWhite },

  qrCard: {
    width: '100%', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.stackLg,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: Spacing.stackLg, ...Shadows.card,
  },
  qrLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginBottom: Spacing.stackMd },
  qrWrap: {
    padding: Spacing.stackMd, backgroundColor: Colors.pureWhite,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  qrId: {
    ...Typography.labelCaps, color: Colors.onSurfaceVariant,
    marginTop: Spacing.stackMd, letterSpacing: 2,
  },

  homeBtn: {
    width: '100%', height: 56, backgroundColor: Colors.pureBlack,
    borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  homeBtnText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },
});
