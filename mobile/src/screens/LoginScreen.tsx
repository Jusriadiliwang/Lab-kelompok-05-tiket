import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const nav = useNavigation<any>();
  const [userId, setUserId]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await login(trimmed);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Periksa User ID kamu dan coba lagi.';
      Alert.alert('Login Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoTitle}>War Tiket</Text>
          <Text style={styles.logoSub}>Platform Tiket Konser</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>USER ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan User ID kamu"
            placeholderTextColor={Colors.placeholderText}
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.btn, (!userId.trim() || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!userId.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.pureWhite} />
            ) : (
              <Text style={styles.btnText}>Masuk</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => nav.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>Buat Akun Baru</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Belum punya akun? Daftar gratis dan mulai beli tiket konser.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.stackLg + 16,
  },
  logoTitle: {
    ...Typography.displayTicketWar,
    color: Colors.pureBlack,
    marginBottom: 4,
  },
  logoSub: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  form: {
    gap: Spacing.stackMd,
  },
  label: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    marginBottom: -Spacing.stackSm,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: Colors.systemGrayLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.stackMd,
    ...Typography.bodyLg,
    color: Colors.onBackground,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  btn: {
    height: 56,
    backgroundColor: Colors.pureBlack,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.stackSm,
  },
  btnDisabled: {
    backgroundColor: Colors.systemGrayLight,
  },
  btnText: {
    ...Typography.bodyLg,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.pureWhite,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.stackSm,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.systemGrayLight },
  dividerText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  registerBtn: {
    height: 52, borderWidth: 1.5, borderColor: Colors.pureBlack,
    borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  registerBtnText: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.pureBlack },
});
