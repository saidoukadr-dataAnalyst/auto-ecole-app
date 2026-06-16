import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Vibration, Animated, StatusBar, ScrollView } from 'react-native';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

type PinMode = 'VERIFY' | 'CREATE' | 'RECOVERY';

export const PinScreen = ({ onUnlocked }: { onUnlocked: () => void }) => {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<PinMode>('VERIFY');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);

  const [recoveryKey, setRecoveryKey] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Animated scales for 4 dots
  const dotScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const hasPin = await SecurityService.hasUserPin();
        if (!hasPin) {
          setMode('CREATE');
        }
        const id = await SecurityService.getDeviceId();
        setDeviceId(id);
      } catch {
        showToast(t('pin_storage_error'));
      } finally {
        setLoading(false);
      }
    };
    checkPinStatus();
  }, []);

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotScales[index], {
        toValue: 1.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(dotScales[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const resetDotScales = () => {
    dotScales.forEach((scale) => scale.setValue(1));
  };

  const handlePinPress = async (num: string) => {
    if (step === 1 && pin.length < 4) {
      const newPin = pin + num;
      animateDot(newPin.length - 1);
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => processCompletedPin(newPin, 1), 200);
      }
    } else if (step === 2 && confirmPin.length < 4) {
      const newConfirmPin = confirmPin + num;
      animateDot(newConfirmPin.length - 1);
      setConfirmPin(newConfirmPin);
      if (newConfirmPin.length === 4) {
        setTimeout(() => processCompletedPin(newConfirmPin, 2), 200);
      }
    }
  };

  const handleDelete = () => {
    if (step === 1 && pin.length > 0) {
      resetDotScales();
      setPin(pin.slice(0, -1));
    } else if (step === 2 && confirmPin.length > 0) {
      resetDotScales();
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleUnlock = async () => {
    if (pin.length === 4) {
      await processCompletedPin(pin, 1);
    } else {
      showToast(t('fill_required'));
    }
  };

  const processCompletedPin = async (completedPin: string, currentStep: number) => {
    if (mode === 'VERIFY') {
      const isValid = await SecurityService.verifyUserPin(completedPin);
      if (isValid) {
        onUnlocked();
      } else {
        Vibration.vibrate(300);
        shakeError();
        showToast(t('pin_wrong'));
        resetDotScales();
        setPin('');
      }
    } else if (mode === 'CREATE') {
      if (currentStep === 1) {
        resetDotScales();
        setStep(2);
      } else if (currentStep === 2) {
        if (pin === completedPin) {
          await SecurityService.saveUserPin(pin);
          showToast(t('pin_saved'));
          onUnlocked();
        } else {
          Vibration.vibrate(300);
          shakeError();
          showToast(t('pin_mismatch'));
          resetDotScales();
          setPin('');
          setConfirmPin('');
          setStep(1);
        }
      }
    }
  };

  const handleRecovery = async () => {
    if (!recoveryKey.trim()) return;
    const cleanKey = recoveryKey.replace(/-/g, '').trim().toUpperCase();
    const isValid = await SecurityService.verifyRecoveryKey(cleanKey);

    if (isValid) {
      showToast(t('recovery_success'));
      setRecoveryKey('');
      setMode('CREATE');
      setStep(1);
      setPin('');
      setConfirmPin('');
    } else {
      showToast(t('recovery_invalid'));
    }
  };

  const styles = getStyles(colors, isDark);
  const statusBarStyle = isDark ? "light-content" : "dark-content";
  // Distinct color for status bar background
  const statusBarColor = isDark ? '#111827' : '#E2E8F0';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (mode === 'RECOVERY') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} />
        <View style={styles.content}>
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>🔑</Text>
          </View>
          <Text style={styles.title}>{t('recovery_title')}</Text>
          <Text style={styles.subtitle}>{t('recovery_instruction')}</Text>

          <View style={styles.deviceCodeContainer}>
            <Text style={styles.deviceCodeLabel}>Code Appareil</Text>
            <Text style={styles.deviceCode}>{deviceId}</Text>
          </View>

          <TextInput
            style={styles.recoveryInput}
            placeholder={t('recovery_key')}
            placeholderTextColor={colors.textSecondary}
            value={recoveryKey}
            onChangeText={setRecoveryKey}
            autoCapitalize="characters"
          />

          <TouchableOpacity style={styles.unlockButton} onPress={handleRecovery}>
            <Text style={styles.unlockButtonText}>{t('validate_key')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={() => setMode('VERIFY')}>
            <Text style={styles.cancelLinkText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Keypad mode (VERIFY or CREATE)
  const currentPinLength = step === 1 ? pin.length : confirmPin.length;

  const getTitle = () => {
    if (mode === 'CREATE') {
      return step === 1 ? t('create_pin') : t('confirm_pin');
    }
    return t('enter_pin');
  };

  const getSubtitle = () => {
    if (mode === 'CREATE') {
      return step === 1 ? 'Choisissez un code à 4 chiffres' : 'Retapez le même code';
    }
    return 'Saisissez votre code pour continuer';
  };

  const keypadRows: (string | null)[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} />

      <View style={styles.topSection}>
        <View style={styles.lockIconContainer}>
          <Text style={styles.lockIcon}>🔐</Text>
        </View>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>{getSubtitle()}</Text>

        {/* PIN dots */}
        <Animated.View style={[styles.dotsContainer, isRTL && styles.rowReverse, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i < currentPinLength && styles.dotFilled,
                { transform: [{ scale: dotScales[i] }] },
              ]}
            />
          ))}
        </Animated.View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.keypadCard}>
          <View style={styles.keypad}>
            {keypadRows.map((row, rowIndex) => (
              <View key={rowIndex} style={[styles.keypadRow, isRTL && styles.rowReverse]}>
                {row.map((key, colIndex) => {
                  if (key === null) {
                    return <View key={`empty-${colIndex}`} style={styles.keyEmpty} />;
                  }
                  if (key === 'backspace') {
                    return (
                      <TouchableOpacity
                        key="backspace"
                        style={styles.keyButton}
                        onPress={handleDelete}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.keyBackspace}>⌫</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.keyButton}
                      onPress={() => handlePinPress(key)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.keyText}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Explicit Unlock Button */}
          {mode === 'VERIFY' && (
            <TouchableOpacity
              style={[styles.unlockButton, currentPinLength < 4 && styles.unlockButtonDisabled]}
              onPress={handleUnlock}
              disabled={currentPinLength < 4}
              activeOpacity={0.8}
            >
              <Text style={styles.unlockButtonText}>🔓  {t('unlock') || 'Déverrouiller'}</Text>
            </TouchableOpacity>
          )}

          {mode === 'VERIFY' && (
            <TouchableOpacity style={styles.forgotLink} onPress={() => setMode('RECOVERY')}>
              <Text style={styles.forgotLinkText}>{t('forgot_pin')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#111827' : '#E2E8F0', // Distinct background
  },
  container: {
    flex: 1,
    backgroundColor: isDark ? '#111827' : '#E2E8F0', // Distinct elegant background for the whole page
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 20,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: isDark ? '#4F46E5' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: isDark ? 1 : 0,
    borderColor: 'rgba(79, 70, 229, 0.4)',
  },
  lockIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: isDark ? '#ffffff' : '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: isDark ? '#9ca3af' : '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 10,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: isDark ? '#4b5563' : '#cbd5e1',
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  keypadCard: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    paddingVertical: 32,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
  },
  keypad: {
    width: 280,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
  },
  keyEmpty: {
    width: 76,
    height: 76,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
  },
  keyBackspace: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  unlockButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockButtonDisabled: {
    backgroundColor: isDark ? '#374151' : '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotLink: {
    marginTop: 20,
    padding: 8,
  },
  forgotLinkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  deviceCodeContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
    alignItems: 'center',
    width: '100%',
  },
  deviceCodeLabel: {
    fontSize: 12,
    color: isDark ? '#fca5a5' : '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  deviceCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.danger,
    textAlign: 'center',
    letterSpacing: 1,
  },
  recoveryInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: colors.surface,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cancelLink: {
    marginTop: 24,
    padding: 12,
  },
  cancelLinkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
