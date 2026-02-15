import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.surface,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 88,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Chat tab',
          tabBarHideOnKeyboard: true,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Memory browser tab',
        }}
      />
      <Tabs.Screen
        name="automations"
        options={{
          title: 'Automations',
          tabBarIcon: ({ color, size }) => <Ionicons name="timer" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Automations tab',
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          title: 'Skills',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="extension-puzzle" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Skills tab',
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} />,
          tabBarAccessibilityLabel: 'Status tab',
        }}
      />
    </Tabs>
  );
}
