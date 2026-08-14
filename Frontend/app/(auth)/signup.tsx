import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { authApi } from '@/src/api/endpoints';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload: any = { name, email, password };
      if (avatarUrl) payload.avatarUrl = avatarUrl;

      const res = await authApi.signup(payload);
      await login(res.data.accessToken, res.data.user);
    } catch (err: any) {
      Alert.alert('Signup Failed', err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
        <View className="mb-8">
          <Text className="text-3xl font-bold text-slate-900 mb-2">Create Account</Text>
          <Text className="text-base text-slate-500">Join Dev Issue Tracker today</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Full Name *</Text>
            <TextInput
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Email *</Text>
            <TextInput
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
              placeholder="john@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Password *</Text>
            <TextInput
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Avatar URL (Optional)</Text>
            <TextInput
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
              placeholder="https://example.com/avatar.jpg"
              autoCapitalize="none"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
            />
          </View>

          <TouchableOpacity
            className="w-full bg-blue-600 rounded-xl py-4 mt-4 flex-row justify-center items-center"
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-slate-500 text-base">Already have an account? </Text>
          <Link href={"/(auth)/login" as any} asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold text-base">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
