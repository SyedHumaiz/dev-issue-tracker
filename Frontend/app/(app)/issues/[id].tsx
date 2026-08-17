import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useIssue, useProject, useUpdateStatus, useUpdatePriority, useUpdateAssignee, useCreateComment } from '@/src/api/hooks';
import { IssueStatus, Priority } from '@/src/types';
import { getErrorMessage } from '@/src/utils/error';
import { Avatar, PriorityBadge, StatusBadge } from '@/src/components/IssueCard';
import { SegmentedTabs } from '@/src/components/SegmentedTabs';
import { useIssueRoom } from '@/src/hooks/useRealtime';

export default function IssueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useIssueRoom(id);
  const { data: issue, isLoading, error } = useIssue(id);
  const { data: project } = useProject(issue?.projectId ?? '');
  
  const updateStatus = useUpdateStatus(id);
  const updatePriority = useUpdatePriority(id);
  const updateAssignee = useUpdateAssignee(id);
  const createComment = useCreateComment(id);

  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [commentBody, setCommentBody] = useState('');

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !issue) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <Text className="text-red-500">Failed to load issue details.</Text>
      </View>
    );
  }

  const handleStatusChange = async (status: IssueStatus) => {
    try {
      await updateStatus.mutateAsync({ status });
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };
  const handlePriorityChange = async (priority: Priority) => { try { await updatePriority.mutateAsync({ priority }); } catch (err) { Alert.alert('Error', getErrorMessage(err)); } };
  const handleAssigneeChange = async (assigneeId: string | null) => { try { await updateAssignee.mutateAsync({ assigneeId }); } catch (err) { Alert.alert('Error', getErrorMessage(err)); } };

  const handleCreateComment = async () => {
    if (!commentBody.trim()) return;
    try {
      await createComment.mutateAsync({ body: commentBody });
      setCommentBody('');
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl mb-3 shadow-sm border border-border dark:border-border-dark">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-semibold text-foreground dark:text-foreground-dark">{item.author.name}</Text>
        <Text className="text-xs text-muted dark:text-muted-dark">{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text className="text-slate-700 dark:text-slate-200">{item.body}</Text>
    </View>
  );

  const renderActivity = ({ item }: { item: any }) => (
    <View className="flex-row mb-4 items-start">
      <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 justify-center items-center mr-3 mt-1">
        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.actor.name.charAt(0)}</Text>
      </View>
      <View className="flex-1 bg-surface dark:bg-surface-dark p-3 rounded-lg border border-border dark:border-border-dark">
        <Text className="text-sm font-medium text-foreground dark:text-foreground-dark">{item.actor.name} <Text className="font-normal text-muted dark:text-muted-dark">{item.type.replace('_', ' ').toLowerCase()}</Text></Text>
        <Text className="text-xs text-muted dark:text-muted-dark mt-1">{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="bg-surface dark:bg-surface-dark px-4 pt-6 pb-4 border-b border-border dark:border-border-dark">
        <Text className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-3">{issue.title}</Text>
        <View className="flex-row items-center gap-2 mb-4"><StatusBadge status={issue.status} /><PriorityBadge priority={issue.priority} /></View>
        <View className="flex-row items-center mb-4"><Avatar user={issue.assignee} size="medium" /><View className="ml-3"><Text className="font-semibold text-foreground dark:text-foreground-dark">{issue.assignee?.name ?? 'Unassigned'}</Text><Text className="text-xs text-muted dark:text-muted-dark">{issue.assignee ? 'Project member' : 'Assign a project member'}</Text></View></View>
        <Text className="text-muted dark:text-muted-dark text-sm mb-3">Project: {issue.project.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-muted dark:text-muted-dark">STATUS</Text>{[IssueStatus.OPEN, IssueStatus.IN_REVIEW, IssueStatus.CLOSED].map((status) => <TouchableOpacity key={status} onPress={() => handleStatusChange(status)} disabled={updateStatus.isPending} className={`rounded-full px-3 py-2 ${issue.status === status ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${issue.status === status ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{status.replace('_', ' ')}</Text></TouchableOpacity>)}</View></ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-muted dark:text-muted-dark">PRIORITY</Text>{[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((priority) => <TouchableOpacity key={priority} onPress={() => handlePriorityChange(priority)} disabled={updatePriority.isPending} className={`rounded-full px-3 py-2 ${issue.priority === priority ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${issue.priority === priority ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{priority}</Text></TouchableOpacity>)}</View></ScrollView>
        {project && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-muted dark:text-muted-dark">ASSIGNEE</Text><TouchableOpacity onPress={() => handleAssigneeChange(null)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-2 ${issue.assigneeId === null ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${issue.assigneeId === null ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>Unassigned</Text></TouchableOpacity>{project.members.map((member) => <TouchableOpacity key={member.userId} onPress={() => handleAssigneeChange(member.userId)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-2 ${issue.assigneeId === member.userId ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${issue.assigneeId === member.userId ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{member.user.name}</Text></TouchableOpacity>)}</View></ScrollView>}
        
        <SegmentedTabs value={activeTab} onChange={setActiveTab} tabs={[{ value: 'comments', label: `Comments (${issue.comments.length})` }, { value: 'activity', label: 'Activity' }]} />
      </View>

      <View className="flex-1 px-4 pt-4">
        {activeTab === 'comments' ? (
          <FlatList
            data={issue.comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListEmptyComponent={<View className="mt-12 items-center"><View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950"><MaterialIcons name="chat-bubble-outline" size={19} color="#2563eb" /></View><Text className="mt-3 font-semibold text-foreground dark:text-foreground-dark">No comments yet</Text><Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">Start the conversation on this issue.</Text></View>}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        ) : (
          <FlatList
            data={issue.activities}
            keyExtractor={(item) => item.id}
            renderItem={renderActivity}
            ListEmptyComponent={<View className="mt-12 items-center"><View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"><MaterialIcons name="history" size={20} color="#64748b" /></View><Text className="mt-3 font-semibold text-foreground dark:text-foreground-dark">No activity yet</Text><Text className="mt-1 text-center text-sm text-muted dark:text-muted-dark">Updates to this issue will appear here.</Text></View>}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        )}
      </View>

      {activeTab === 'comments' && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark px-4 pb-5 pt-3 flex-row items-center">
          <TextInput
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-border dark:border-border-dark rounded-full px-4 py-3 mr-3 text-foreground dark:text-foreground-dark"
            placeholderTextColor="#94a3b8"
            placeholder="Add a comment..."
            value={commentBody}
            onChangeText={setCommentBody}
          />
          <Pressable 
            className="h-11 w-11 items-center justify-center rounded-full bg-blue-600"
            onPress={handleCreateComment}
            disabled={createComment.isPending}
          >
            {createComment.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-lg">↑</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

