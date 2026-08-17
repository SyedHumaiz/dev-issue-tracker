import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#60a5fa', tabBarInactiveTintColor: dark ? '#94a3b8' : '#64748b', tabBarStyle: { backgroundColor: dark ? '#1f2937' : '#ffffff', borderTopColor: dark ? '#334155' : '#e2e8f0' }, headerStyle: { backgroundColor: dark ? '#1f2937' : '#ffffff' }, headerTintColor: dark ? '#f8fafc' : '#0f172a' }}>
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
