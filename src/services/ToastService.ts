import { Platform, ToastAndroid } from 'react-native';

export const showToast = (message: string, duration: 'SHORT' | 'LONG' = 'SHORT') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, duration === 'SHORT' ? ToastAndroid.SHORT : ToastAndroid.LONG);
  } else {
    // iOS fallback: just use console.log or Alert as iOS doesn't have native toast
    // For simplicity, we'll use a no-op on iOS since this app targets Android
    console.log('[Toast]', message);
  }
};
