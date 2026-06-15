import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { SecurityService } from './src/services/SecurityService';
import { DatabaseService } from './src/services/DatabaseService';
import { LanguageProvider } from './src/services/i18n';

// Écrans
import { ActivationScreen } from './src/screens/ActivationScreen';
import { PinScreen } from './src/screens/PinScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { InputExpenseScreen } from './src/screens/InputExpenseScreen';
import { InputIncomeScreen } from './src/screens/InputIncomeScreen';

import { StudentsScreen } from './src/screens/StudentsScreen';
import { VehiclesScreen } from './src/screens/VehiclesScreen';
import { StaffScreen } from './src/screens/StaffScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        await DatabaseService.initDB();
        const activated = await SecurityService.isAppActivated();
        setIsActivated(activated);
      } catch (error) {
        console.error("Erreur d'initialisation", error);
      } finally {
        setIsReady(true);
      }
    }
    initApp();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  let content;
  if (!isActivated) {
    content = <ActivationScreen onActivated={() => setIsActivated(true)} />;
  } else if (!isUnlocked) {
    content = <PinScreen onUnlocked={() => setIsUnlocked(true)} />;
  } else {
    content = (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Dashboard">
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Students" component={StudentsScreen} options={{ title: 'Élèves' }} />
          <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'Véhicules' }} />
          <Stack.Screen name="Staff" component={StaffScreen} options={{ title: 'Personnel' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Historique' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres & Export' }} />
          
          <Stack.Screen name="InputExpense" options={{ title: 'Nouvelle Dépense', presentation: 'modal' }}>
            {({ navigation }) => <InputExpenseScreen onSaveSuccess={() => navigation.goBack()} onCancel={() => navigation.goBack()} />}
          </Stack.Screen>
          <Stack.Screen name="InputIncome" options={{ title: 'Nouvel Encaissement', presentation: 'modal' }}>
            {({ navigation }) => <InputIncomeScreen onSaveSuccess={() => navigation.goBack()} onCancel={() => navigation.goBack()} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <LanguageProvider>
      {content}
    </LanguageProvider>
  );
}
