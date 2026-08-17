import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useProjects, useCreateProject } from '@/src/api/hooks';
import { ProjectListItem } from '@/src/types';
import { getErrorMessage } from '@/src/utils/error';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProjectsScreen() {
  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      await createProject.mutateAsync({ name: newProjectName });
      setIsCreating(false);
      setNewProjectName('');
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderItem = ({ item }: { item: ProjectListItem }) => (
    <Link href={`/(app)/projects/${item.id}` as any} asChild>
      <TouchableOpacity className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-slate-100 flex-row items-center">
        <View className="w-10 h-10 rounded-lg bg-blue-100 justify-center items-center mr-3"><MaterialIcons name="folder-open" size={21} color="#2563eb" /></View>
        <View className="flex-1"><Text className="text-lg font-semibold text-slate-900">{item.name}</Text>
        <Text className="text-slate-500 mt-1 text-sm">
          {item._count.issues} issues • {item._count.members} members
        </Text></View><MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
      </TouchableOpacity>
    </Link>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <Text className="text-red-500">Failed to load projects.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 p-4">
      {isCreating ? (
        <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-slate-100">
          <TextInput
            className="border border-slate-200 rounded-lg px-4 py-3 text-slate-900 mb-3"
            placeholder="Project Name"
            value={newProjectName}
            onChangeText={setNewProjectName}
            autoFocus
          />
          <View className="flex-row justify-end space-x-3">
            <TouchableOpacity onPress={() => setIsCreating(false)} className="px-4 py-2">
              <Text className="text-slate-500 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleCreate} 
              className="bg-blue-600 px-4 py-2 rounded-lg"
              disabled={createProject.isPending}
            >
              {createProject.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-medium">Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl mb-4 flex-row justify-center items-center"
          onPress={() => setIsCreating(true)}
        >
          <Text className="text-white font-semibold text-base">New Project</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="items-center mt-10">
            <Text className="text-slate-500 text-base">No projects yet. Create one!</Text>
          </View>
        }
      />
    </View>
  );
}
