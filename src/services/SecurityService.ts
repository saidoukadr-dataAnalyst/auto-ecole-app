import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Le même sel secret que dans le fichier admin_keygen.html
const APP_MASTER_SECRET_SALT = "AUTOECOLE_SECRET_KEY_2026_SECURE_X9#";

// Clés de stockage
const STORE_KEY_ACTIVATED = "APP_ACTIVATION_STATUS";
const STORE_KEY_USER_PIN = "APP_USER_PIN";

export class SecurityService {
  
  /**
   * Récupère l'identifiant matériel unique de l'appareil (Alternative à l'adresse MAC).
   * Retourne androidId sur Android, et identifierForVendor sur iOS.
   */
  static async getDeviceId(): Promise<string> {
    let id: string | null | undefined;
    if (Platform.OS === 'android') {
      id = Application.androidId;
    } else if (Platform.OS === 'ios') {
      id = await Application.getIosIdForVendorAsync();
    }
    
    if (!id || id.includes('UNKNOWN')) {
      id = await SecureStore.getItemAsync('APP_GENERATED_DEVICE_ID');
      if (!id) {
        id = Crypto.randomUUID();
        await SecureStore.setItemAsync('APP_GENERATED_DEVICE_ID', id);
      }
    }
    return id;
  }

  /**
   * Fonction utilitaire pour encoder un buffer en Base64 URL-Safe (identique à l'admin HTML)
   */
  private static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // Convert to base64 using a polyfill or global atob/btoa if available in RN
    // In React Native, btoa is not available globally by default, so we use a custom base64 encoder
    const base64 = this.customBtoa(binary);
    return base64.replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=+$/, '').substring(0, 16).toUpperCase();
  }

  /**
   * Simple base64 encoder for React Native
   */
  private static customBtoa(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let block, charCode, idx = 0, map = chars;
      str.charAt(idx | 0) || (map = '=', idx % 1);
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = str.charCodeAt(idx += 3 / 4);
      if (charCode > 0xFF) { throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."); }
      block = block << 8 | charCode;
    }
    return output;
  }

  /**
   * Génère le hash attendu pour vérifier une clé.
   * keyType peut être 'ACTIVATION' ou 'RECOVERY'.
   */
  static async generateExpectedHash(keyType: 'ACTIVATION' | 'RECOVERY'): Promise<string> {
    const deviceId = await this.getDeviceId();
    const payloadString = `${deviceId}_${keyType}_${APP_MASTER_SECRET_SALT}`;
    
    // Hash SHA-256 via expo-crypto
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payloadString,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    // Nettoyage pour matcher l'algorithme du HTML
    return hash.replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=+$/, '').substring(0, 16).toUpperCase();
  }

  /**
   * Vérifie si la clé d'activation saisie par le client est valide.
   */
  static async verifyActivationKey(inputKey: string): Promise<boolean> {
    const expectedKey = await this.generateExpectedHash('ACTIVATION');
    const isValid = inputKey.trim().toUpperCase() === expectedKey;
    
    if (isValid) {
      // Sauvegarder l'état d'activation dans le stockage sécurisé (chiffré)
      await SecureStore.setItemAsync(STORE_KEY_ACTIVATED, "TRUE");
    }
    return isValid;
  }

  /**
   * Vérifie si la clé de restauration saisie est valide.
   */
  static async verifyRecoveryKey(inputKey: string): Promise<boolean> {
    const expectedKey = await this.generateExpectedHash('RECOVERY');
    return inputKey.trim().toUpperCase() === expectedKey;
  }

  /**
   * Vérifie si l'application a déjà été activée par une licence valide.
   */
  static async isAppActivated(): Promise<boolean> {
    const status = await SecureStore.getItemAsync(STORE_KEY_ACTIVATED);
    return status === "TRUE";
  }

  /**
   * Sauvegarde le PIN/Mot de passe de l'utilisateur.
   */
  static async saveUserPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(STORE_KEY_USER_PIN, pin);
  }

  /**
   * Vérifie si le PIN saisi correspond au PIN sauvegardé.
   */
  static async verifyUserPin(inputPin: string): Promise<boolean> {
    const savedPin = await SecureStore.getItemAsync(STORE_KEY_USER_PIN);
    return inputPin === savedPin;
  }

  /**
   * Vérifie si un PIN est configuré.
   */
  static async hasUserPin(): Promise<boolean> {
    const savedPin = await SecureStore.getItemAsync(STORE_KEY_USER_PIN);
    return savedPin !== null && savedPin !== undefined;
  }
}
