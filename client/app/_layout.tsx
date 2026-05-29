import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, LogBox, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

// Prevent native splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if already hidden
});

LogBox.ignoreLogs([
  '[expo-av]: Expo AV has been deprecated',
  'Due to changes in Androids permission requirements, Expo Go can no longer provide full access',
  'Value being stored in SecureStore is larger than 2048 bytes',
]);

import { AuthProvider } from '@/providers/auth-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashAnimationComplete, setSplashAnimationComplete] = useState(false);
  
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: '#09090B',
      card: '#09090B',
    },
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void NavigationBar.setVisibilityAsync('hidden');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#09090B' }}>
      <AuthProvider>
        <ThemeProvider value={navTheme}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#09090B' },
              animation: 'fade',
            }}
          >
            <Stack.Screen
              name="(auth)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="emergency"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="chat/[id]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="snap"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="profile/[section]"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'transparentModal',
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'fade',
              }}
            />
          </Stack>
          <StatusBar hidden style="light" />
        </ThemeProvider>
      </AuthProvider>

      {!isSplashAnimationComplete && (
        <AnimatedSplashScreen 
          onAnimationComplete={() => setSplashAnimationComplete(true)} 
        />
      )}
    </View>
  );
}
