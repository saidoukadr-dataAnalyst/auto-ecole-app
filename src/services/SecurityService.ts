import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Le même sel secret que dans le fichier admin_keygen.html
const APP_MASTER_SECRET_SALT = "AUTOECOLE_SECRET_KEY_2026_SECURE_X9#";

// Clés de stockage
const STORE_KEY_ACTIVATED = "APP_ACTIVATION_STATUS";
const STORE_KEY_USER_PIN = "APP_USER_PIN";
const STORE_KEY_SCHOOL_NAME = "APP_SCHOOL_NAME";
const STORE_KEY_GOOGLE_EMAIL = "APP_GOOGLE_EMAIL";

export class SecurityService {
  
  /**
   * Récupère le nom de l'auto-école (par défaut : "Auto-École")
   */
  static async getSchoolName(): Promise<string> {
    const name = await this.getItemSafe(STORE_KEY_SCHOOL_NAME);
    return name || "Auto-École";
  }

  /**
   * Sauvegarde le nom de l'auto-école
   */
  static async saveSchoolName(name: string): Promise<void> {
    await this.setItemSafe(STORE_KEY_SCHOOL_NAME, name);
  }

  /**
   * Récupère l'adresse Google Gmail enregistrée
   */
  static async getGoogleEmail(): Promise<string> {
    const email = await this.getItemSafe(STORE_KEY_GOOGLE_EMAIL);
    return email || "";
  }

  /**
   * Sauvegarde l'adresse Google Gmail
   */
  static async saveGoogleEmail(email: string): Promise<void> {
    await this.setItemSafe(STORE_KEY_GOOGLE_EMAIL, email);
  }
  
  /**
   * Wrapper pour supporter le Web (localStorage) en plus de iOS/Android (SecureStore)
   */
  private static async setItemSafe(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (e) {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        } catch (err) {}
      }
    }
  }

  private static async getItemSafe(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    } else {
      try {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      } catch (e) {}
      try {
        if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      } catch (err) {}
      return null;
    }
  }

  /**
   * Récupère l'identifiant matériel unique de l'appareil (Alternative à l'adresse MAC).
   * Retourne androidId sur Android, et identifierForVendor sur iOS.
   */
  static async getDeviceId(): Promise<string> {
    let id: string | null | undefined;
    try {
      if (Platform.OS === 'android') {
        id = (Application as any).androidId || (Application as any).getAndroidId?.();
      } else if (Platform.OS === 'ios') {
        id = await Application.getIosIdForVendorAsync();
      }
    } catch (e) {}
    
    if (!id || id.includes('UNKNOWN')) {
      id = await this.getItemSafe('APP_GENERATED_DEVICE_ID');
      if (!id) {
        id = Crypto.randomUUID();
        await this.setItemSafe('APP_GENERATED_DEVICE_ID', id);
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
    const base64 = this.customBtoa(binary);
    return base64.replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=+$/, '').substring(0, 16).toUpperCase();
  }

  /**
   * Simple base64 encoder for React Native
   */
  private static customBtoa(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    for (let block = 0, charCode, idx = 0, map = chars;
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
      // Sauvegarder l'état d'activation
      await this.setItemSafe(STORE_KEY_ACTIVATED, "TRUE");
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
    const status = await this.getItemSafe(STORE_KEY_ACTIVATED);
    return status === "TRUE";
  }

  /**
   * Hache le PIN avec un sel propre à l'appareil et à la clé maître
   */
  private static async hashPin(pin: string): Promise<string> {
    const deviceId = await this.getDeviceId();
    const payload = `${pin}_${deviceId}_${APP_MASTER_SECRET_SALT}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payload,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  /**
   * Sauvegarde le PIN de l'utilisateur sous forme de hash SHA-256 sécurisé.
   */
  static async saveUserPin(pin: string): Promise<void> {
    const hashedPin = await this.hashPin(pin);
    await this.setItemSafe(STORE_KEY_USER_PIN, hashedPin);
  }

  /**
   * Vérifie si le PIN saisi correspond au PIN sauvegardé (supporte la migration automatique).
   */
  static async verifyUserPin(inputPin: string): Promise<boolean> {
    const savedPin = await this.getItemSafe(STORE_KEY_USER_PIN);
    if (!savedPin) return false;

    const hashedInput = await this.hashPin(inputPin);
    if (savedPin === hashedInput) {
      return true;
    }

    // Migration transparente pour les anciens PINs stockés en clair
    if (savedPin === inputPin) {
      await this.saveUserPin(inputPin);
      return true;
    }

    return false;
  }

  /**
   * Vérifie si un PIN est configuré.
   */
  static async hasUserPin(): Promise<boolean> {
    const savedPin = await this.getItemSafe(STORE_KEY_USER_PIN);
    return savedPin !== null && savedPin !== undefined && savedPin !== '';
  }
}
