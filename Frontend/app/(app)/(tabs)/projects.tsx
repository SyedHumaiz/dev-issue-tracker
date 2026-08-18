import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { Link } from 'expo-router';
import { useProjects, useCreateProject } from '@/src/api/hooks';
import { ProjectListItem } from '@/src/types';
import { getErrorMessage } from '@/src/utils/error';
import { MaterialIcons } from '@expo/vector-icons';
import { EmptyState } from '@/src/components/EmptyState';

export default function ProjectsScreen() {
  const { data: projects, isLoading, error, refetch, isRefetching } = useProjects();
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
      <Pressable className="mb-3 flex-row items-center rounded-xl border border-border bg-surface p-4 shadow-sm dark:border-border-dark dark:bg-surface-dark">
        <View className="w-10 h-10 rounded-lg bg-blue-100 justify-center items-center mr-3"><MaterialIcons name="folder-open" size={21} color="#2563eb" /></View>
        <View className="flex-1"><Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">{item.name}</Text>
        <Text className="text-muted dark:text-muted-dark mt-1 text-sm">
          {item._count.issues} issues • {item._count.members} members
        </Text></View><MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
      </Pressable>
    </Link>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading projects…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <Text className="text-red-500">Could not load projects.</Text>
        <Pressable className="mt-4 rounded-lg bg-blue-600 px-4 py-2" onPress={() => refetch()}><Text className="font-semibold text-white">Retry</Text></Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark p-4">
      {isCreating ? (
        <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl mb-4 shadow-sm border border-border dark:border-border-dark">
          <TextInput
            className="border border-border dark:border-border-dark bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 text-foreground dark:text-foreground-dark mb-3"
            placeholderTextColor="#94a3b8"
            placeholder="Project Name"
            value={newProjectName}
            onChangeText={setNewProjectName}
            autoFocus
          />
          <View className="flex-row justify-end space-x-3">
            <Pressable onPress={() => setIsCreating(false)} className="px-4 py-2.5">
              <Text className="text-muted dark:text-muted-dark font-medium">Cancel</Text>
            </Pressable>
            <Pressable 
              onPress={handleCreate} 
              className="bg-blue-600 px-4 py-2.5 rounded-lg"
              disabled={createProject.isPending}
            >
              {createProject.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-medium">Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          className="bg-blue-600 px-4 py-3.5 rounded-xl mb-4 flex-row justify-center items-center"
          onPress={() => setIsCreating(true)}
        >
          <MaterialIcons name="add" size={20} color="#fff" /><Text className="text-white font-semibold text-base ml-1">New Project</Text>
        </Pressable>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />}
        ListEmptyComponent={<EmptyState icon="folder-open" title="No projects yet" subtitle="Create your first project to start tracking issues." iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
      />
    </View>
  );
}
