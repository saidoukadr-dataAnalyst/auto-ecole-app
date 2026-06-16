import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export const ActivationScreen = ({ onActivated }: { onActivated: () => void }) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [deviceId, setDeviceId] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        const id = await SecurityService.getDeviceId();
        setDeviceId(id);
      } catch {
        showToast(t('activation_device_error'));
      } finally {
        setLoading(false);
      }
    };
    loadDeviceId();
  }, []);

  const handleVerify = async () => {
    if (!inputKey.trim()) {
      showToast(t('activation_key_empty'));
      return;
    }

    setVerifying(true);
    const cleanKey = inputKey.replace(/-/g, '').trim().toUpperCase();
    const isValid = await SecurityService.verifyActivationKey(cleanKey);
    setVerifying(false);

    if (isValid) {
      showToast(t('activation_success'));
      onActivated();
    } else {
      showToast(t('activation_invalid_key'));
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(deviceId);
    showToast(t('activation_copied'));
  };

  const styles = getStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>🔒 {t('activation_title')}</Text>
        <Text style={styles.subtitle}>{t('activation_subtitle')}</Text>

        <View style={styles.deviceCodeContainer}>
          <Text style={styles.deviceCodeLabel}>{t('activation_device_label')}</Text>
          <Text style={styles.deviceCode}>{deviceId}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Text style={styles.copyButtonText}>{t('activation_copy')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>{t('activation_key_label')}</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: ABCD-EFGH-IJKL-MNOP"
          placeholderTextColor={colors.textSecondary}
          value={inputKey}
          onChangeText={setInputKey}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, verifying && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('activation_unlock')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  deviceCodeContainer: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
  },
  deviceCodeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  deviceCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 16,
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: isDark ? '#374151' : '#93c5fd',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
