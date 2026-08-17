import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { authApi } from '@/src/api/endpoints';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getErrorMessage } from '@/src/utils/error';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.login({ email, password });
      await login(res.data.accessToken, res.data.user);
    } catch (err: any) {
      Alert.alert('Login Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark justify-center px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-foreground dark:text-foreground-dark mb-2">Welcome Back</Text>
        <Text className="text-base text-muted dark:text-muted-dark">Sign in to Dev Issue Tracker</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email</Text>
          <TextInput
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-foreground dark:text-foreground-dark"
            placeholderTextColor="#94a3b8"
            placeholder="john@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Password</Text>
          <TextInput
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-foreground dark:text-foreground-dark"
            placeholderTextColor="#94a3b8"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className="w-full bg-blue-600 rounded-xl py-4 mt-4 flex-row justify-center items-center"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-muted dark:text-muted-dark text-base">Don't have an account? </Text>
        <Link href={"/(auth)/signup" as any} asChild>
          <TouchableOpacity>
            <Text className="text-blue-600 font-semibold text-base">Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
