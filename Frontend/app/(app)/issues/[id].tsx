import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIssue, useProject, useUpdateStatus, useUpdatePriority, useUpdateAssignee, useCreateComment } from '@/src/api/hooks';
import { IssueStatus, Priority } from '@/src/types';
import { getErrorMessage } from '@/src/utils/error';
import { Avatar, PriorityBadge, StatusBadge } from '@/src/components/IssueCard';

export default function IssueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !issue) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
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
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-slate-100">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-semibold text-slate-900">{item.author.name}</Text>
        <Text className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text className="text-slate-700">{item.body}</Text>
    </View>
  );

  const renderActivity = ({ item }: { item: any }) => (
    <View className="flex-row mb-4 items-start">
      <View className="w-8 h-8 rounded-full bg-slate-200 justify-center items-center mr-3 mt-1">
        <Text className="text-xs font-bold text-slate-500">{item.actor.name.charAt(0)}</Text>
      </View>
      <View className="flex-1 bg-white p-3 rounded-lg border border-slate-100">
        <Text className="text-sm font-medium text-slate-900">{item.actor.name} <Text className="font-normal text-slate-600">{item.type.replace('_', ' ').toLowerCase()}</Text></Text>
        <Text className="text-xs text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-4 pt-6 pb-4 border-b border-slate-200">
        <Text className="text-xl font-semibold text-slate-900 mb-3">{issue.title}</Text>
        <View className="flex-row items-center gap-2 mb-4"><StatusBadge status={issue.status} /><PriorityBadge priority={issue.priority} /></View>
        <View className="flex-row items-center mb-4"><Avatar user={issue.assignee} size="medium" /><View className="ml-3"><Text className="font-semibold text-slate-900">{issue.assignee?.name ?? 'Unassigned'}</Text><Text className="text-xs text-slate-500">{issue.assignee ? 'Project member' : 'Assign a project member'}</Text></View></View>
        <Text className="text-slate-500 text-sm mb-3">Project: {issue.project.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-slate-500">STATUS</Text>{[IssueStatus.OPEN, IssueStatus.IN_REVIEW, IssueStatus.CLOSED].map((status) => <TouchableOpacity key={status} onPress={() => handleStatusChange(status)} disabled={updateStatus.isPending} className={`rounded-full px-3 py-2 ${issue.status === status ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issue.status === status ? 'text-white' : 'text-slate-600'}`}>{status.replace('_', ' ')}</Text></TouchableOpacity>)}</View></ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-slate-500">PRIORITY</Text>{[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((priority) => <TouchableOpacity key={priority} onPress={() => handlePriorityChange(priority)} disabled={updatePriority.isPending} className={`rounded-full px-3 py-2 ${issue.priority === priority ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issue.priority === priority ? 'text-white' : 'text-slate-600'}`}>{priority}</Text></TouchableOpacity>)}</View></ScrollView>
        {project && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1"><View className="flex-row gap-2"><Text className="self-center text-xs font-semibold text-slate-500">ASSIGNEE</Text><TouchableOpacity onPress={() => handleAssigneeChange(null)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-2 ${issue.assigneeId === null ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issue.assigneeId === null ? 'text-white' : 'text-slate-600'}`}>Unassigned</Text></TouchableOpacity>{project.members.map((member) => <TouchableOpacity key={member.userId} onPress={() => handleAssigneeChange(member.userId)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-2 ${issue.assigneeId === member.userId ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issue.assigneeId === member.userId ? 'text-white' : 'text-slate-600'}`}>{member.user.name}</Text></TouchableOpacity>)}</View></ScrollView>}
        
        <View className="flex-row space-x-6 border-t border-slate-100 pt-3">
          <TouchableOpacity 
            className={`pb-2 ${activeTab === 'comments' ? 'border-b-2 border-blue-600' : ''}`}
            onPress={() => setActiveTab('comments')}
          >
            <Text className={`text-sm font-medium ${activeTab === 'comments' ? 'text-blue-600' : 'text-slate-500'}`}>
              Comments ({issue.comments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`pb-2 ${activeTab === 'activity' ? 'border-b-2 border-blue-600' : ''}`}
            onPress={() => setActiveTab('activity')}
          >
            <Text className={`text-sm font-medium ${activeTab === 'activity' ? 'text-blue-600' : 'text-slate-500'}`}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        {activeTab === 'comments' ? (
          <FlatList
            data={issue.comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListEmptyComponent={<Text className="text-slate-500 text-center mt-10">No comments yet.</Text>}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        ) : (
          <FlatList
            data={issue.activities}
            keyExtractor={(item) => item.id}
            renderItem={renderActivity}
            ListEmptyComponent={<Text className="text-slate-500 text-center mt-10">No activity yet.</Text>}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        )}
      </View>

      {activeTab === 'comments' && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex-row items-center">
          <TextInput
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 mr-3 text-slate-900"
            placeholder="Add a comment..."
            value={commentBody}
            onChangeText={setCommentBody}
          />
          <TouchableOpacity 
            className="bg-blue-600 w-10 h-10 rounded-full justify-center items-center"
            onPress={handleCreateComment}
            disabled={createComment.isPending}
          >
            {createComment.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-lg">↑</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
