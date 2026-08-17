import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { authApi } from '@/src/api/endpoints';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getErrorMessage } from '@/src/utils/error';

const JOB_TITLES = [
  'Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile Developer',
  'React Native Developer',
  'DevOps Engineer',
  'QA Engineer',
  'UI/UX Designer',
  'Other'
];

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Job Title Modal State
  const [isJobModalVisible, setJobModalVisible] = useState(false);
  const [customJobTitle, setCustomJobTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !jobTitle) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const payload = { name, email, password, jobTitle };

      const res = await authApi.signup(payload);
      await login(res.data.accessToken, res.data.user);
    } catch (err: any) {
      Alert.alert('Signup Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectJobTitle = (title: string) => {
    if (title !== 'Other') {
      setJobTitle(title);
      setJobModalVisible(false);
    } else {
      setJobTitle('Other');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground dark:text-foreground-dark mb-2">Create Account</Text>
          <Text className="text-base text-muted dark:text-muted-dark">Join Dev Issue Tracker today</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Full Name *</Text>
            <TextInput
              className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-foreground dark:text-foreground-dark"
              placeholderTextColor="#94a3b8"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email *</Text>
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
            <Text className="text-sm font-medium text-slate-700 mb-1">Job Title / Role *</Text>
            {jobTitle === 'Other' ? (
              <View className="flex-row items-center space-x-2">
                <TextInput
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                  placeholder="Enter your role"
                  value={customJobTitle}
                  onChangeText={(val) => {
                    setCustomJobTitle(val);
                    setJobTitle(val); // implicitly update jobTitle but keeping "Other" conceptually handled
                  }}
                  autoFocus
                />
                <TouchableOpacity onPress={() => setJobTitle('')} className="bg-slate-200 p-3 rounded-xl">
                  <MaterialIcons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center"
                onPress={() => setJobModalVisible(true)}
              >
                <Text className={jobTitle ? "text-slate-900" : "text-slate-400"}>
                  {jobTitle || "Select your role"}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Password *</Text>
            <View className="w-full bg-white border border-slate-200 rounded-xl flex-row items-center px-4">
              <TextInput
                className="flex-1 py-3 text-slate-900"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-slate-700 mb-1">Confirm Password *</Text>
            <View className="w-full bg-white border border-slate-200 rounded-xl flex-row items-center px-4">
              <TextInput
                className="flex-1 py-3 text-slate-900"
                placeholder="••••••••"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2">
                <MaterialIcons name={showConfirmPassword ? "visibility" : "visibility-off"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
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
          <Text className="text-muted dark:text-muted-dark text-base">Already have an account? </Text>
          <Link href={"/(auth)/login" as any} asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-semibold text-base">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>

      {/* Job Title Selector Modal */}
      <Modal visible={isJobModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-foreground dark:text-foreground-dark">Select Role</Text>
              <TouchableOpacity onPress={() => setJobModalVisible(false)} className="p-2">
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {JOB_TITLES.map((title) => (
                <TouchableOpacity
                  key={title}
                  className="py-4 border-b border-border dark:border-border-dark"
                  onPress={() => selectJobTitle(title)}
                >
                  <Text className="text-base text-slate-800 dark:text-slate-100">{title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
