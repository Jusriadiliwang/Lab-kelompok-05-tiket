import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getCatalog } from '../api/events';
import type { CatalogEvent } from '../types';
import type { HomeStackParamList } from '../types';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

const CATEGORIES = ['Semua', 'Konser', 'Festival', 'Sport', 'Theater', 'Comedy'] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [events, setEvents]     = useState<CatalogEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('Semua');

  const load = useCallback(async () => {
    try {
      const data = await getCatalog();
      setEvents(data);
    } catch {
      // show fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter((e) => {
    const matchCat = category === 'Semua' || e.name.toLowerCase().includes(category.toLowerCase());
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.pureBlack} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>War Tiket</Text>
        <Ionicons name="search-outline" size={24} color={Colors.onBackground} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.placeholderText} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari konser, artis, venue..."
          placeholderTextColor={Colors.placeholderText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Pills */}
      <View style={styles.catRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catPill, category === c && styles.catPillActive]}
              onPress={() => setCategory(c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.catPillText, category === c && styles.catPillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Event List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada event ditemukan</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('EventDetail', { eventId: item.id })}
            activeOpacity={0.92}
          >
            {/* Hero image */}
            <View style={styles.cardImageWrap}>
              {item.bannerUrl ? (
                <Image source={{ uri: item.bannerUrl }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Ionicons name="musical-notes" size={32} color={Colors.systemGrayLight} />
                </View>
              )}
              {item.status === 'PUBLISHED' && (
                <View style={styles.onSaleBadge}>
                  <Text style={styles.onSaleText}>ON SALE NOW</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={13} color={Colors.onSurfaceVariant} />
                <Text style={styles.cardMetaText}>{formatDate(item.eventDate)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={13} color={Colors.onSurfaceVariant} />
                <Text style={styles.cardMetaText} numberOfLines={1}>{item.venue}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>
                  {item.availableSeats === 0 ? 'Habis Terjual' : `Mulai dari ${formatPrice(item.minPrice)}`}
                </Text>
                <View style={[styles.availBadge, item.availableSeats === 0 && styles.availBadgeSoldOut]}>
                  <Text style={styles.availBadgeText}>
                    {item.availableSeats === 0 ? 'Sold Out' : `${item.availableSeats} kursi`}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },
  center:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: 12, paddingBottom: 8,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  headerTitle: { ...Typography.headlineMd, color: Colors.pureBlack },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.marginMobile, marginVertical: Spacing.stackMd,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.full, paddingHorizontal: Spacing.stackMd,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, ...Typography.bodySm, color: Colors.onBackground,
  },

  catRow:  { marginBottom: Spacing.stackMd },
  catList: { paddingHorizontal: Spacing.marginMobile, gap: 8 },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.systemGrayLight,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  catPillActive: { backgroundColor: Colors.pureBlack, borderColor: Colors.pureBlack },
  catPillText: { ...Typography.bodySm, color: Colors.onBackground },
  catPillTextActive: { color: Colors.pureWhite },

  list: { paddingHorizontal: Spacing.marginMobile, paddingBottom: 32, gap: Spacing.stackMd },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.cardBorder,
    ...Shadows.card,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardImagePlaceholder: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  onSaleBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.pureBlack, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  onSaleText: { ...Typography.labelCaps, color: Colors.pureWhite, fontSize: 10 },

  cardBody: { padding: Spacing.stackMd, gap: 6 },
  cardTitle: { ...Typography.headlineMd, color: Colors.onBackground, fontSize: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { ...Typography.price, color: Colors.onBackground },
  availBadge: {
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  availBadgeSoldOut: { backgroundColor: Colors.systemGrayLight },
  availBadgeText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...Typography.bodyLg, color: Colors.onSurfaceVariant },
});
