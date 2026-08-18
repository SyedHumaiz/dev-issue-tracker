import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { NotificationBell } from '@/src/components/NotificationBell';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#60a5fa', tabBarInactiveTintColor: dark ? '#A1A1AA' : '#64748b', tabBarStyle: { backgroundColor: dark ? '#171718' : '#ffffff', borderTopColor: dark ? '#2A2A2C' : '#e2e8f0' }, headerStyle: { backgroundColor: dark ? '#171718' : '#ffffff' }, headerTintColor: dark ? '#F5F5F5' : '#0f172a', headerRight: () => <NotificationBell /> }}>
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <MaterialIcons name="folder" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-work"
        options={{ title: 'My Work', tabBarIcon: ({ color }) => <MaterialIcons name="assignment" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
