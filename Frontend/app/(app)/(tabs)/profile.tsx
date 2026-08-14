import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/src/store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-8">
      <View className="items-center mb-10 mt-6">
        <View className="w-24 h-24 bg-blue-100 rounded-full justify-center items-center mb-4">
          <Text className="text-blue-600 text-3xl font-bold">
            {user?.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900">{user?.name}</Text>
        <Text className="text-slate-500 mt-1">{user?.email}</Text>
      </View>

      <TouchableOpacity
        className="bg-red-50 p-4 rounded-xl flex-row items-center justify-center space-x-2"
        onPress={() => logout()}
      >
        <MaterialIcons name="logout" size={20} color="#ef4444" />
        <Text className="text-red-500 font-semibold text-lg">Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
