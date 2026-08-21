import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createPayment } from '../api/payments';
import { useAuth } from '../context/AuthContext';
import type { HomeStackParamList, PaymentMethod } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

type Nav   = NativeStackNavigationProp<HomeStackParamList, 'Checkout'>;
type Route = RouteProp<HomeStackParamList, 'Checkout'>;

function useCountdown(expiresAt: string) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return { display: `${m}:${s}`, expired: seconds === 0 };
}

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; desc: string }[] = [
  { id: 'bank_transfer', label: 'Transfer Bank',     icon: 'business-outline',  desc: 'BCA · BNI · Mandiri · BRI' },
  { id: 'credit_card',  label: 'Kartu Kredit/Debit', icon: 'card-outline',      desc: 'Visa · Mastercard · JCB' },
  { id: 'gopay',        label: 'GoPay',              icon: 'phone-portrait-outline', desc: 'Bayar via aplikasi Gojek' },
  { id: 'ovo',          label: 'OVO',                icon: 'wallet-outline',    desc: 'Bayar via aplikasi OVO' },
  { id: 'dana',         label: 'DANA',               icon: 'qr-code-outline',   desc: 'Bayar via aplikasi DANA' },
];

export default function CheckoutScreen() {
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { user } = useAuth();
  const { reservationId, expiresAt, price, categoryName, eventName } = route.params;
  const { display, expired } = useCountdown(expiresAt);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!selectedMethod || !user) return;
    setLoading(true);
    try {
      await createPayment({
        reservationId: reservationId,
        paymentMethod: selectedMethod,
        amount:        price,
        userId:        user.userId,
      });
      // Berhasil → Saga payment.confirmed via RabbitMQ → ticket CONFIRMED
      nav.replace('OrderConfirmation', { orderId: reservationId });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Pembayaran gagal. Silakan coba lagi.';
      Alert.alert('Pembayaran Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.onBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pembayaran</Text>
        {/* Countdown */}
        <View style={styles.countdownPill}>
          <Ionicons name="timer-outline" size={13} color={expired ? Colors.error : Colors.onSurfaceVariant} />
          <Text style={[styles.countdownText, expired && { color: Colors.error }]}>{display}</Text>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionLabel}>RINGKASAN PESANAN</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Event</Text>
          <Text style={styles.summaryVal} numberOfLines={2}>{eventName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>Kategori</Text>
          <Text style={styles.summaryVal}>{categoryName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryKey}>ID Reservasi</Text>
          <Text style={styles.summaryVal}>{reservationId}</Text>
        </View>
        <View style={[styles.divider, { marginBottom: Spacing.stackSm }]} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>{formatPrice(price)}</Text>
        </View>
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionLabel}>PILIH METODE PEMBAYARAN</Text>
      <View style={styles.methodList}>
        {PAYMENT_METHODS.map((m) => {
          const isSelected = selectedMethod === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.methodRow, isSelected && styles.methodRowSelected]}
              onPress={() => setSelectedMethod(m.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                <Ionicons name={m.icon as any} size={22} color={isSelected ? Colors.pureWhite : Colors.onSurfaceVariant} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>{m.label}</Text>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pay Button */}
      <TouchableOpacity
        style={[styles.payBtn, (!selectedMethod || loading || expired) && styles.payBtnDisabled]}
        onPress={handlePay}
        disabled={!selectedMethod || loading || expired}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color={Colors.pureWhite} />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={22} color={Colors.pureWhite} />
            <Text style={styles.payBtnText}>
              {expired ? 'Waktu Habis' : `Bayar ${formatPrice(price)}`}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.onSurfaceVariant} />
        <Text style={styles.infoText}>
          Pembayaran diproses aman via payment gateway. Setelah berhasil, e-ticket dengan QR code akan dikirim.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.marginMobile, paddingBottom: 48, gap: Spacing.stackMd },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: Spacing.stackSm,
  },
  headerTitle:   { ...Typography.headlineMd, color: Colors.pureBlack, flex: 1, textAlign: 'center' },
  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.countdownBackground,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  countdownText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 12 },

  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.stackMd,
    borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card,
  },
  sectionLabel: {
    ...Typography.labelCaps, color: Colors.onSurfaceVariant,
    marginBottom: Spacing.stackSm, fontSize: 11,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 9 },
  summaryKey: { ...Typography.bodySm, color: Colors.onSurfaceVariant, width: 100 },
  summaryVal: { ...Typography.bodySm, color: Colors.onBackground, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'right' },
  divider:    { height: 1, backgroundColor: Colors.divider },
  totalRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.stackSm },
  totalLabel: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.onBackground },
  totalAmount:{ ...Typography.price, color: Colors.pureBlack, fontSize: 22 },

  methodList: { gap: Spacing.stackSm },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.stackMd,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    gap: Spacing.stackMd, ...Shadows.card,
  },
  methodRowSelected: { borderColor: Colors.pureBlack, borderWidth: 2 },
  methodIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconSelected: { backgroundColor: Colors.pureBlack },
  methodInfo: { flex: 1 },
  methodLabel: { ...Typography.bodyLg, color: Colors.onBackground, fontSize: 15 },
  methodLabelSelected: { fontFamily: 'Inter_700Bold' },
  methodDesc:  { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.pureBlack },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.pureBlack },

  payBtn: {
    height: 60, backgroundColor: Colors.pureBlack,
    borderRadius: Radius.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: Spacing.stackSm,
  },
  payBtnDisabled: { backgroundColor: Colors.systemGrayLight },
  payBtnText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },

  infoBox: {
    flexDirection: 'row', gap: Spacing.stackSm, alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg, padding: Spacing.stackMd,
  },
  infoText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 20 },
});
