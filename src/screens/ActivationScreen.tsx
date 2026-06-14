import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

export const ActivationScreen = ({ onActivated }: { onActivated: () => void }) => {
  const { t } = useLanguage();
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
        showToast(t('activation_device_error'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadDeviceId();
  }, []);

  const handleVerify = async () => {
    if (!inputKey.trim()) {
      showToast(t('activation_key_empty'), 'error');
      return;
    }

    setVerifying(true);
    const cleanKey = inputKey.replace(/-/g, '').trim().toUpperCase();
    const isValid = await SecurityService.verifyActivationKey(cleanKey);
    setVerifying(false);

    if (isValid) {
      showToast(t('activation_success'), 'success');
      onActivated();
    } else {
      showToast(t('activation_invalid_key'), 'error');
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(deviceId);
    showToast(t('activation_copied'), 'success');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  deviceCodeContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  deviceCodeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  deviceCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 16,
  },
  copyButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
