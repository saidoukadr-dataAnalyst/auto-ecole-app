import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SecurityService } from '../services/SecurityService';

type PinMode = 'VERIFY' | 'CREATE' | 'RECOVERY';

export const PinScreen = ({ onUnlocked }: { onUnlocked: () => void }) => {
  const [mode, setMode] = useState('VERIFY');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1); // Step 1: enter pin, Step 2: confirm pin (for CREATE mode)
  const [loading, setLoading] = useState(true);

  // Pour la restauration
  const [recoveryKey, setRecoveryKey] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const hasPin = await SecurityService.hasUserPin();
        if (!hasPin) {
          setMode('CREATE');
        }
        const id = await SecurityService.getDeviceId();
        setDeviceId(id);
      } catch (error) {
        Alert.alert("Erreur", "Problème d'accès au stockage sécurisé.");
      } finally {
        setLoading(false);
      }
    };
    checkPinStatus();
  }, []);

  const handlePinPress = async (num: string) => {
    if (pin.length < 4 && step === 1) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        processCompletedPin(newPin, 1);
      }
    } else if (confirmPin.length < 4 && step === 2) {
      const newConfirmPin = confirmPin + num;
      setConfirmPin(newConfirmPin);
      if (newConfirmPin.length === 4) {
        processCompletedPin(newConfirmPin, 2);
      }
    }
  };

  const handleDelete = () => {
    if (step === 1 && pin.length > 0) {
      setPin(pin.slice(0, -1));
    } else if (step === 2 && confirmPin.length > 0) {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const processCompletedPin = async (completedPin: string, currentStep: number) => {
    if (mode === 'VERIFY') {
      const isValid = await SecurityService.verifyUserPin(completedPin);
      if (isValid) {
        onUnlocked();
      } else {
        Alert.alert("Code Incorrect", "Veuillez réessayer.");
        setPin('');
      }
    } else if (mode === 'CREATE') {
      if (currentStep === 1) {
        // Passer à la confirmation
        setStep(2);
      } else if (currentStep === 2) {
        // Vérifier si les deux PIN correspondent
        if (pin === completedPin) {
          await SecurityService.saveUserPin(pin);
          Alert.alert("Succès", "Votre code PIN a été enregistré.");
          onUnlocked();
        } else {
          Alert.alert("Erreur", "Les codes PIN ne correspondent pas. Réessayez.");
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
      Alert.alert("Succès", "Clé de restauration valide. Vous pouvez créer un nouveau code PIN.");
      setRecoveryKey('');
      setMode('CREATE');
      setStep(1);
      setPin('');
      setConfirmPin('');
    } else {
      Alert.alert("Clé Invalide", "La clé de restauration est incorrecte.");
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  if (mode === 'RECOVERY') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Oubli du Code PIN</Text>
        <Text style={styles.subtitle}>
          Veuillez communiquer ce code à votre administrateur pour recevoir une clé de restauration.
        </Text>
        <View style={styles.deviceCodeContainer}>
          <Text style={styles.deviceCode}>{deviceId}</Text>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Clé de Restauration"
          value={recoveryKey}
          onChangeText={setRecoveryKey}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={handleRecovery}>
          <Text style={styles.buttonText}>Valider la clé</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => setMode('VERIFY')}>
          <Text style={styles.linkText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rendu du pavé numérique (Mode CREATE ou VERIFY)
  const currentPinLength = step === 1 ? pin.length : confirmPin.length;
  const dots = [0, 1, 2, 3].map(i => (
    <View key={i} style={[styles.dot, i < currentPinLength && styles.dotFilled]} />
  ));

  const renderKeypadButton = (num: string) => (
    <TouchableOpacity key={num} style={styles.keypadButton} onPress={() => handlePinPress(num)}>
      <Text style={styles.keypadNumber}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'CREATE' ? (step === 1 ? 'Créez votre Code PIN' : 'Confirmez votre Code PIN') : 'Entrez votre Code PIN'}
      </Text>
      
      <View style={styles.dotsContainer}>{dots}</View>

      <View style={styles.keypad}>
        {['1', '2', '3'].map(renderKeypadButton)}
        {['4', '5', '6'].map(renderKeypadButton)}
        {['7', '8', '9'].map(renderKeypadButton)}
        <View style={styles.keypadButtonEmpty} />
        {renderKeypadButton('0')}
        <TouchableOpacity style={styles.keypadButton} onPress={handleDelete}>
          <Text style={styles.keypadAction}>⌫</Text>
        </TouchableOpacity>
      </View>

      {mode === 'VERIFY' && (
        <TouchableOpacity style={styles.forgotButton} onPress={() => setMode('RECOVERY')}>
          <Text style={styles.linkText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 40 },
  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 20 },
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  keypad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  keypadButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  keypadButtonEmpty: { width: 70, height: 70 },
  keypadNumber: { fontSize: 28, fontWeight: '500', color: '#0f172a' },
  keypadAction: { fontSize: 24, color: '#475569' },
  forgotButton: { marginTop: 40 },
  linkText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 20, padding: 10 },
  deviceCodeContainer: { padding: 16, backgroundColor: '#fff', borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  deviceCode: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  input: { width: '100%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 24, textAlign: 'center' },
  button: { width: '100%', backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
