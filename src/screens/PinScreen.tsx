import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Vibration, Animated, StatusBar } from 'react-native';
import { SecurityService } from '../services/SecurityService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

type PinMode = 'VERIFY' | 'CREATE' | 'RECOVERY';

export const PinScreen = ({ onUnlocked }: { onUnlocked: () => void }) => {
  const { t, isRTL } = useLanguage();
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
        toValue: 1.4,
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0F4FF" />
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (mode === 'RECOVERY') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0F4FF" />
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
            placeholderTextColor="#94a3b8"
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
      </View>
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4FF" />

      {/* Top section with icon and title */}
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

      {/* Bottom section with keypad */}
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

          {/* Unlock button */}
          {mode === 'VERIFY' && (
            <TouchableOpacity
              style={[styles.unlockButton, currentPinLength < 4 && styles.unlockButtonDisabled]}
              onPress={handleUnlock}
              disabled={currentPinLength < 4}
              activeOpacity={0.8}
            >
              <Text style={styles.unlockButtonText}>🔓  Déverrouiller</Text>
            </TouchableOpacity>
          )}

          {mode === 'VERIFY' && (
            <TouchableOpacity style={styles.forgotLink} onPress={() => setMode('RECOVERY')}>
              <Text style={styles.forgotLinkText}>{t('forgot_pin')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  lockIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 16,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#C8D6E5',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  keypadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  keypad: {
    width: 260,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  keyEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  keyBackspace: {
    fontSize: 22,
    color: '#94a3b8',
  },
  unlockButton: {
    width: '100%',
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockButtonDisabled: {
    backgroundColor: '#B0C8E8',
    shadowOpacity: 0,
    elevation: 0,
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  forgotLink: {
    marginTop: 16,
    padding: 6,
  },
  forgotLinkText: {
    color: '#4A90D9',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceCodeContainer: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  deviceCodeLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  deviceCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
  },
  recoveryInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  cancelLink: {
    marginTop: 20,
    padding: 10,
  },
  cancelLinkText: {
    color: '#4A90D9',
    fontSize: 15,
    fontWeight: '600',
  },
});
