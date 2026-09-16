import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDbIfNeeded } from '../db/schema';
import { colors, radius } from '../theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          <Stack.Screen name="about" options={{ title: 'Info & Rechtliches' }} />
          <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="search" options={{ headerShown: false }} />
          {/* Eigene Kopfzeile, damit die Tastatur den Speichern-Button nicht verdeckt. */}
          <Stack.Screen name="product/[barcode]" options={{ headerShown: false }} />
          {/* Feste Höhe statt 'fitToContents': Der Inhalt scrollt und nutzt flex: 1. */}
          <Stack.Screen
            name="entry/[id]"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetAllowedDetents: [0.92],
              sheetGrabberVisible: true,
              sheetCornerRadius: radius.lg,
            }}
          />
        </Stack>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
