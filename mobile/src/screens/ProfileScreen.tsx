import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getUserOrders } from '../api/tickets';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import { formatPrice, isOrderConfirmed } from '../utils/helpers';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, confirmed: 0, revenue: 0 });

  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const orders    = await getUserOrders(user.userId);
      const confirmed = orders.filter((o) => isOrderConfirmed(o.status));
      const revenue   = confirmed.reduce((s, o) => s + (o.price ?? 0), 0);
      setStats({ total: orders.length, confirmed: confirmed.length, revenue });
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color={Colors.systemGrayLight} />
        <Text style={styles.emptyTitle}>Belum Login</Text>
        <Text style={styles.emptySub}>Login untuk melihat profil kamu.</Text>
      </View>
    );
  }

  const initials = (user.name ?? user.userId).slice(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.heroSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{user.name ?? user.userId}</Text>
        <Text style={styles.userId}>@{user.userId}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Pesanan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Tiket Aktif</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum} numberOfLines={1}>{formatPrice(stats.revenue)}</Text>
          <Text style={styles.statLabel}>Total Bayar</Text>
        </View>
      </View>

      {/* Info akun */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INFORMASI AKUN</Text>
        <View style={styles.card}>
          <Row icon="person-outline"          label="Nama"        value={user.name ?? user.userId} />
          <View style={styles.divider} />
          <Row icon="at-outline"              label="User ID"     value={user.userId} />
          <View style={styles.divider} />
          <Row icon="shield-checkmark-outline" label="Role"       value={user.role} />
        </View>
      </View>

      {/* Info sistem */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SISTEM</Text>
        <View style={styles.card}>
          <Row icon="server-outline"     label="API Gateway"    value="localhost:3000" />
          <View style={styles.divider} />
          <Row icon="analytics-outline"  label="ERP Analytics"  value="via Gateway /erp" />
          <View style={styles.divider} />
          <Row icon="git-branch-outline" label="Architecture"   value="6 Microservices" />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
        <Ionicons name="log-out-outline" size={20} color={Colors.pureWhite} />
        <Text style={styles.logoutText}>Keluar dari Akun</Text>
      </TouchableOpacity>
      <Text style={styles.version}>War Tiket v2.0 · Kelompok 5 · Unismuh Makassar</Text>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.onSurfaceVariant} style={{ marginRight: 12 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },
  center:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },

  heroSection: {
    alignItems: 'center', paddingTop: Spacing.stackLg, paddingBottom: Spacing.stackMd,
    gap: Spacing.stackSm, backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.pureBlack, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText:  { ...Typography.headlineMd, color: Colors.pureWhite, fontSize: 30 },
  displayName: { ...Typography.headlineMd, fontSize: 20, color: Colors.onBackground },
  userId:      { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  roleBadge:   { backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, marginBottom: Spacing.stackSm },
  roleText:    { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 11 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    margin: Spacing.marginMobile,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.cardBorder,
    paddingVertical: Spacing.stackMd, ...Shadows.card,
  },
  statBox:     { alignItems: 'center', flex: 1 },
  statNum:     { ...Typography.headlineMd, fontSize: 18, color: Colors.pureBlack },
  statLabel:   { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.divider },

  section:      { paddingHorizontal: Spacing.marginMobile, marginBottom: Spacing.stackMd },
  sectionLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginBottom: Spacing.stackSm, fontSize: 11 },
  card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.cardBorder, ...Shadows.card },
  row:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.stackMd },
  rowLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, width: 100 },
  rowValue: { ...Typography.bodySm, color: Colors.onBackground, fontFamily: 'Inter_600SemiBold', flex: 1 },
  divider:  { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing.stackMd },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: Spacing.marginMobile, marginTop: Spacing.stackSm,
    height: 56, backgroundColor: Colors.pureBlack, borderRadius: Radius.lg,
  },
  logoutText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },
  version:    { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textAlign: 'center', fontSize: 10, marginVertical: Spacing.stackLg },

  emptyTitle: { ...Typography.headlineMd, color: Colors.onBackground },
  emptySub:   { ...Typography.bodySm, color: Colors.onSurfaceVariant },
});
