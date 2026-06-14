import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Vibration, Animated } from 'react-native';
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
        showToast(t('pin_storage_error'), 'error');
      } finally {
        setLoading(false);
      }
    };
    checkPinStatus();
  }, []);

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotScales[index], {
        toValue: 1.3,
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

  const processCompletedPin = async (completedPin: string, currentStep: number) => {
    if (mode === 'VERIFY') {
      const isValid = await SecurityService.verifyUserPin(completedPin);
      if (isValid) {
        onUnlocked();
      } else {
        Vibration.vibrate(300);
        showToast(t('pin_wrong'), 'error');
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
          showToast(t('pin_saved'), 'success');
          onUnlocked();
        } else {
          Vibration.vibrate(300);
          showToast(t('pin_mismatch'), 'error');
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
      showToast(t('recovery_success'), 'success');
      setRecoveryKey('');
      setMode('CREATE');
      setStep(1);
      setPin('');
      setConfirmPin('');
    } else {
      showToast(t('recovery_invalid'), 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (mode === 'RECOVERY') {
    return (
      <View style={styles.container}>
        <View style={styles.bgTop} />
        <View style={styles.bgBottom} />
        <View style={styles.content}>
          <Text style={styles.title}>{t('pin_forgot_title')}</Text>
          <Text style={styles.subtitle}>{t('pin_forgot_subtitle')}</Text>

          <View style={styles.deviceCodeContainer}>
            <Text style={styles.deviceCode}>{deviceId}</Text>
          </View>

          <TextInput
            style={styles.recoveryInput}
            placeholder={t('recovery_key_placeholder')}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={recoveryKey}
            onChangeText={setRecoveryKey}
            autoCapitalize="characters"
          />

          <TouchableOpacity style={styles.validateButton} onPress={handleRecovery}>
            <Text style={styles.validateButtonText}>{t('recovery_validate')}</Text>
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
      return step === 1 ? t('pin_create') : t('pin_confirm');
    }
    return t('pin_enter');
  };

  const keypadRows: (string | null)[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [null, '0', 'backspace'],
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />
      <View style={styles.content}>
        <Text style={styles.title}>{getTitle()}</Text>

        <View style={[styles.dotsContainer, isRTL && styles.rowReverse]}>
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
        </View>

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

        {mode === 'VERIFY' && (
          <TouchableOpacity style={styles.forgotLink} onPress={() => setMode('RECOVERY')}>
            <Text style={styles.forgotLinkText}>{t('pin_forgot')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  bgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#0f172a',
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1e293b',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 50,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyEmpty: {
    width: 75,
    height: 75,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#ffffff',
  },
  keyBackspace: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.7)',
  },
  forgotLink: {
    marginTop: 40,
  },
  forgotLinkText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
  deviceCodeContainer: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  deviceCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
  },
  recoveryInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  validateButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelLink: {
    marginTop: 24,
    padding: 10,
  },
  cancelLinkText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '600',
  },
});
