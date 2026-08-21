import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const nav = useNavigation<any>();

  const [name,    setName]    = useState('');
  const [userId,  setUserId]  = useState('');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && userId.trim().length >= 3;

  const handleRegister = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await register(userId.trim(), name.trim(), email.trim() || undefined);
      // AuthContext akan set user → navigation otomatis ke MainTabs
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Gagal membuat akun. Coba lagi.';
      Alert.alert('Registrasi Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoTitle}>War Tiket</Text>
          <Text style={styles.logoSub}>Buat Akun Baru</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>NAMA LENGKAP *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama lengkap kamu"
              placeholderTextColor={Colors.placeholderText}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>USER ID *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 3 karakter (huruf, angka, _)"
              placeholderTextColor={Colors.placeholderText}
              value={userId}
              onChangeText={(t) => setUserId(t.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>Dipakai untuk login. Tidak bisa diubah.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL (opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={Colors.placeholderText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.pureWhite} />
            ) : (
              <Text style={styles.btnText}>Buat Akun</Text>
            )}
          </TouchableOpacity>

          {/* Link ke Login */}
          <TouchableOpacity onPress={() => nav.navigate('Login')} activeOpacity={0.7}>
            <Text style={styles.loginLink}>
              Sudah punya akun? <Text style={styles.loginLinkBold}>Masuk</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfaceContainerLowest },
  inner: {
    flexGrow: 1, justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.stackLg,
  },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.stackLg },
  logoTitle: { ...Typography.displayTicketWar, color: Colors.pureBlack, marginBottom: 4 },
  logoSub:   { ...Typography.bodySm, color: Colors.onSurfaceVariant },

  form:  { gap: Spacing.stackMd },
  field: { gap: 6 },

  label: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  input: {
    height: 52, borderWidth: 1, borderColor: Colors.systemGrayLight,
    borderRadius: Radius.md, paddingHorizontal: Spacing.stackMd,
    ...Typography.bodyLg, color: Colors.onBackground,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  hint: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontSize: 12 },

  btn: {
    height: 56, backgroundColor: Colors.pureBlack,
    borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.stackSm,
  },
  btnDisabled: { backgroundColor: Colors.systemGrayLight },
  btnText:     { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureWhite },

  loginLink: {
    ...Typography.bodySm, color: Colors.onSurfaceVariant,
    textAlign: 'center', marginTop: Spacing.stackSm,
  },
  loginLinkBold: { fontFamily: 'Inter_600SemiBold', color: Colors.pureBlack },
});
