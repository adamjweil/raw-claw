import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StoreProvider } from '../src/services/store';
import { ThemeProvider, useTheme } from '../src/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { NotificationManager } from '../src/services/notifications';

function InnerLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NotificationManager />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Settings',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: isDark ? '#fff' : colors.text,
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={isDark ? '#fff' : colors.text}
                />
              </Pressable>
            ),
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <InnerLayout />
        </ErrorBoundary>
      </ThemeProvider>
    </StoreProvider>
  );
}
