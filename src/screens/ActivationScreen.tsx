import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { SecurityService } from '../services/SecurityService';

export const ActivationScreen = ({ onActivated }: { onActivated: () => void }) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    // Récupérer l'identifiant unique au montage
    const loadDeviceId = async () => {
      try {
        const id = await SecurityService.getDeviceId();
        setDeviceId(id);
      } catch (error) {
        Alert.alert("Erreur", "Impossible de récupérer l'identifiant matériel.");
      } finally {
        setLoading(false);
      }
    };
    loadDeviceId();
  }, []);

  const handleVerify = async () => {
    if (!inputKey.trim()) {
      Alert.alert("Erreur", "Veuillez entrer une clé d'activation.");
      return;
    }

    setVerifying(true);
    // Format the key to match visual presentation before passing
    const cleanKey = inputKey.replace(/-/g, '').trim().toUpperCase();
    
    // Le hash généré est sans tirets
    const isValid = await SecurityService.verifyActivationKey(cleanKey);
    setVerifying(false);

    if (isValid) {
      Alert.alert("Succès", "Application activée avec succès !");
      onActivated();
    } else {
      Alert.alert("Clé Invalide", "La clé saisie ne correspond pas à cet appareil.");
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(deviceId);
    Alert.alert("Copié !", "Code appareil copié dans le presse-papiers.");
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
      <Text style={styles.title}>🔒 Activation Requise</Text>
      <Text style={styles.subtitle}>
        Cette application est protégée. Veuillez transmettre le Code Appareil ci-dessous à l'administrateur pour obtenir votre clé d'activation.
      </Text>

      <View style={styles.deviceCodeContainer}>
        <Text style={styles.deviceCodeLabel}>CODE APPAREIL :</Text>
        <Text style={styles.deviceCode}>{deviceId}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <Text style={styles.copyButtonText}>Copier le code</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Saisissez votre Clé d'Activation :</Text>
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
          <Text style={styles.buttonText}>Déverrouiller l'Application</Text>
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
