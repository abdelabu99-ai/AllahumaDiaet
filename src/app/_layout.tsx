import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '../db/schema';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Zurück',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Dein Profil' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
        {/* Eigene Kopfzeile, damit die Tastatur den Speichern-Button nicht verdeckt. */}
        <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
      </Stack>
    </SQLiteProvider>
  );
}
