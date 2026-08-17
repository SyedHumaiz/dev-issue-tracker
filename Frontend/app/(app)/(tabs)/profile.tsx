import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuthStore } from '@/src/store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useUpdateProfile } from '@/src/api/hooks';
import { getErrorMessage } from '@/src/utils/error';
import { ThemeMode, useThemeStore } from '@/src/store/useThemeStore';
import { ProfileRedesign } from '@/src/components/ProfileRedesign';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)!;
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useUpdateProfile();
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    jobTitle: user?.jobTitle || '',
    bio: user?.bio || '',
    skills: user?.skills?.join(', ') || '',
    githubUrl: user?.githubUrl || '',
    linkedinUrl: user?.linkedinUrl || '',
    yearsExperience: user?.yearsExperience?.toString() || '',
    location: user?.location || '',
  });

  const handleEditOpen = () => {
    setEditForm({
      jobTitle: user?.jobTitle || '',
      bio: user?.bio || '',
      skills: user?.skills?.join(', ') || '',
      githubUrl: user?.githubUrl || '',
      linkedinUrl: user?.linkedinUrl || '',
      yearsExperience: user?.yearsExperience?.toString() || '',
      location: user?.location || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        jobTitle: editForm.jobTitle.trim() || undefined,
        bio: editForm.bio.trim() || undefined,
        skills: editForm.skills ? editForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        githubUrl: editForm.githubUrl.trim() || undefined,
        linkedinUrl: editForm.linkedinUrl.trim() || undefined,
        yearsExperience: editForm.yearsExperience ? parseInt(editForm.yearsExperience, 10) : undefined,
        location: editForm.location.trim() || undefined,
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const openLink = (url: string | null | undefined) => {
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open URL'));
    }
  };

  if (!user) return null;

  return <ProfileRedesign user={user} onLogout={logout} />;

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 px-6">
        {/* Header section */}
        <View className="items-center mb-6 mt-6">
          <View className="w-24 h-24 bg-blue-100 rounded-full justify-center items-center mb-4">
            <Text className="text-blue-600 text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-foreground dark:text-foreground-dark text-center">{user.name}</Text>
          <Text className="text-blue-600 font-medium text-base mt-1 text-center">{user.jobTitle}</Text>
          <Text className="text-muted dark:text-muted-dark mt-1 text-center">{user.email}</Text>
          
          <TouchableOpacity 
            onPress={handleEditOpen}
            className="mt-4 bg-slate-200 dark:bg-slate-700 px-6 py-2 rounded-full flex-row items-center space-x-2"
          >
            <MaterialIcons name="edit" size={16} color="#475569" />
            <Text className="text-slate-700 dark:text-slate-100 font-medium">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View className="space-y-4 mb-8">
          <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Appearance</Text>
            <View className="flex-row rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => <TouchableOpacity key={mode} onPress={() => setThemeMode(mode)} className={`flex-1 rounded-md py-2 items-center ${themeMode === mode ? 'bg-surface dark:bg-surface-dark shadow-sm' : ''}`}><Text className={`text-xs font-semibold capitalize ${themeMode === mode ? 'text-blue-600 dark:text-blue-400' : 'text-muted dark:text-muted-dark'}`}>{mode}</Text></TouchableOpacity>)}
            </View>
          </View>
          {user.bio ? (
            <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bio</Text>
              <Text className="text-slate-700 dark:text-slate-200 leading-5">{user.bio}</Text>
            </View>
          ) : null}

          {user.skills && user.skills.length > 0 ? (
            <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Skills</Text>
              <View className="flex-row flex-wrap">
                {user.skills.map((skill, i) => (
                  <View key={i} className="bg-blue-50 px-3 py-1.5 rounded-full mr-2 mb-2 border border-blue-100">
                    <Text className="text-blue-700 text-sm font-medium">{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {(user.location || user.yearsExperience != null) ? (
            <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark flex-row justify-between">
              {user.location && (
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</Text>
                  <View className="flex-row items-center space-x-1">
                    <MaterialIcons name="location-pin" size={16} color="#64748b" />
                    <Text className="text-slate-700 dark:text-slate-200">{user.location}</Text>
                  </View>
                </View>
              )}
              {user.yearsExperience != null && (
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</Text>
                  <View className="flex-row items-center space-x-1">
                    <MaterialIcons name="work" size={16} color="#64748b" />
                    <Text className="text-slate-700 dark:text-slate-200">{user.yearsExperience} {user.yearsExperience === 1 ? 'year' : 'years'}</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {(user.githubUrl || user.linkedinUrl) ? (
            <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark flex-row space-x-4">
              {user.githubUrl && (
                <TouchableOpacity onPress={() => openLink(user.githubUrl)} className="flex-row items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark">
                  <FontAwesome name="github" size={20} color="#0f172a" />
                  <Text className="text-slate-700 dark:text-slate-200 font-medium">GitHub</Text>
                </TouchableOpacity>
              )}
              {user.linkedinUrl && (
                <TouchableOpacity onPress={() => openLink(user.linkedinUrl)} className="flex-row items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark">
                  <FontAwesome name="linkedin-square" size={20} color="#0077b5" />
                  <Text className="text-slate-700 dark:text-slate-200 font-medium">LinkedIn</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 p-4 rounded-xl flex-row items-center justify-center space-x-2 border border-red-100"
          onPress={() => logout()}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text className="text-red-500 font-semibold text-lg">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-border dark:border-border-dark">
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text className="text-slate-500 font-medium text-base px-2">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? (
                <ActivityIndicator size="small" color="#2563eb" className="px-2" />
              ) : (
                <Text className="text-blue-600 font-bold text-base px-2">Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView className="flex-1 px-6 py-4" keyboardShouldPersistTaps="handled">
            <View className="space-y-5 mb-12">
              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Job Title / Role</Text>
                <TextInput
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  value={editForm.jobTitle}
                  onChangeText={(val) => setEditForm({ ...editForm, jobTitle: val })}
                  placeholder="e.g. Software Engineer"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Bio</Text>
                <TextInput
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  value={editForm.bio}
                  onChangeText={(val) => setEditForm({ ...editForm, bio: val })}
                  placeholder="A short professional bio..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">Skills (comma separated)</Text>
                <TextInput
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  value={editForm.skills}
                  onChangeText={(val) => setEditForm({ ...editForm, skills: val })}
                  placeholder="React, TypeScript, Node.js"
                />
              </View>

              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Location</Text>
                  <TextInput
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                    value={editForm.location}
                    onChangeText={(val) => setEditForm({ ...editForm, location: val })}
                    placeholder="City, Country"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-700 mb-1">Years of Exp</Text>
                  <TextInput
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                    value={editForm.yearsExperience}
                    onChangeText={(val) => setEditForm({ ...editForm, yearsExperience: val })}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">GitHub URL</Text>
                <TextInput
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  value={editForm.githubUrl}
                  onChangeText={(val) => setEditForm({ ...editForm, githubUrl: val })}
                  placeholder="https://github.com/username"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-slate-700 mb-1">LinkedIn URL</Text>
                <TextInput
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900"
                  value={editForm.linkedinUrl}
                  onChangeText={(val) => setEditForm({ ...editForm, linkedinUrl: val })}
                  placeholder="https://linkedin.com/in/username"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
