import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView, Pressable, KeyboardAvoidingView, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIssue, useProject, useUpdateStatus, useUpdatePriority, useUpdateAssignee, useCreateComment } from '@/src/api/hooks';
import { Comment, IssueStatus, Priority } from '@/src/types';
import { getErrorMessage } from '@/src/utils/error';
import { Avatar, PriorityBadge, StatusBadge } from '@/src/components/IssueCard';
import { SegmentedTabs } from '@/src/components/SegmentedTabs';
import { useIssueRoom } from '@/src/hooks/useRealtime';
import { useAuthStore } from '@/src/store/useAuthStore';
import { EmptyState } from '@/src/components/EmptyState';

export default function IssueDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useIssueRoom(id);
  const { data: issue, isLoading, error } = useIssue(id);
  const { data: project } = useProject(issue?.projectId ?? '');
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  
  const updateStatus = useUpdateStatus(id);
  const updatePriority = useUpdatePriority(id);
  const updateAssignee = useUpdateAssignee(id);
  const createComment = useCreateComment(id);

  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [commentBody, setCommentBody] = useState('');
  const [isPropertiesModalVisible, setPropertiesModalVisible] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#2563eb" />
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

  const renderComment = ({ item }: { item: Comment }) => {
    const isMine = item.authorId === currentUserId;

    return (
      <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <Text className="mb-1 px-1 text-xs font-semibold text-foreground dark:text-foreground-dark">
            {item.author.name}
          </Text>
        )}
        <View
          className={`rounded-xl p-4 shadow-sm ${
            isMine
              ? 'bg-blue-600'
              : 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
          }`}
          style={{ maxWidth: '85%' }}
        >
          <Text className={isMine ? 'text-white' : 'text-slate-700 dark:text-slate-200'}>
            {item.body}
          </Text>
        </View>
        <Text
          className={`mt-1 px-1 text-xs ${
            isMine ? 'text-right text-muted dark:text-muted-dark' : 'text-left text-muted dark:text-muted-dark'
          }`}
        >
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    );
  };

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Header Section with Top Safe Area Inset */}
        <View 
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="bg-surface dark:bg-surface-dark px-4 pb-4 border-b border-border dark:border-border-dark"
        >
          {/* Header row with back button and screen title */}
          <View className="flex-row items-center mb-3">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mr-3 p-1 rounded-full bg-slate-100 dark:bg-slate-800"
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="arrow-back" size={22} color="#60a5fa" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-foreground dark:text-foreground-dark flex-1" numberOfLines={1}>
              {issue.title}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setPropertiesModalVisible(true)}
            activeOpacity={0.7}
            className="mb-3 flex-row items-center rounded-xl border border-border bg-slate-50 px-3 py-2.5 dark:border-border-dark dark:bg-slate-800"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <StatusBadge status={issue.status} />
                <PriorityBadge priority={issue.priority} />
              </View>
              <Text className="mt-1 text-xs text-muted dark:text-muted-dark">Tap to update issue properties</Text>
            </View>
            <Avatar user={issue.assignee} size="small" />
            <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-muted dark:text-muted-dark text-sm mb-3">Project: {issue.project.name}</Text>
          
          <SegmentedTabs value={activeTab} onChange={setActiveTab} tabs={[{ value: 'comments', label: `Comments (${issue.comments.length})` }, { value: 'activity', label: 'Activity' }]} />
        </View>

        {/* Scrollable Content Area */}
        <View className="flex-1 px-4 pt-3">
          {activeTab === 'comments' ? (
            <FlatList
              data={issue.comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              ListEmptyComponent={<EmptyState compact icon="chat-bubble-outline" title="No comments yet" subtitle="Be the first to comment" iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <FlatList
              data={issue.activities}
              keyExtractor={(item) => item.id}
              renderItem={renderActivity}
              ListEmptyComponent={<EmptyState compact icon="history" title="No activity yet" subtitle="Updates to this issue will appear here" iconColor="#64748b" iconContainerClassName="bg-slate-100 dark:bg-slate-800" />}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>

        {/* Bottom Comment Bar with Bottom Safe Area Inset & In-Flow Flex Layout */}
        {activeTab === 'comments' && (
          <View 
            style={{ 
              paddingBottom: Math.max(insets.bottom, 12),
              paddingTop: 10,
              paddingHorizontal: 16
            }}
            className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex-row items-center"
          >
            <TextInput
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-border dark:border-border-dark rounded-2xl px-4 py-2.5 mr-3 text-foreground dark:text-foreground-dark"
              placeholderTextColor="#94a3b8"
              placeholder="Add a comment..."
              value={commentBody}
              onChangeText={setCommentBody}
              multiline
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
      </KeyboardAvoidingView>
      <Modal
        visible={isPropertiesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPropertiesModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable className="absolute inset-0" onPress={() => setPropertiesModalVisible(false)} />
          <View
            className="max-h-[80%] rounded-t-3xl bg-surface px-5 pt-5 dark:bg-surface-dark"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground dark:text-foreground-dark">Issue properties</Text>
              <TouchableOpacity onPress={() => setPropertiesModalVisible(false)} className="p-1">
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text className="mb-2 text-xs font-semibold text-muted dark:text-muted-dark">STATUS</Text>
              <View className="mb-5 flex-row flex-wrap gap-2">
                {[IssueStatus.OPEN, IssueStatus.IN_REVIEW, IssueStatus.CLOSED].map((status) => (
                  <TouchableOpacity key={status} onPress={() => handleStatusChange(status)} disabled={updateStatus.isPending} className={`rounded-full px-3 py-1.5 ${issue.status === status ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text className={`text-xs font-semibold ${issue.status === status ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{status.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="mb-2 text-xs font-semibold text-muted dark:text-muted-dark">PRIORITY</Text>
              <View className="mb-5 flex-row flex-wrap gap-2">
                {[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((priority) => (
                  <TouchableOpacity key={priority} onPress={() => handlePriorityChange(priority)} disabled={updatePriority.isPending} className={`rounded-full px-3 py-1.5 ${issue.priority === priority ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text className={`text-xs font-semibold ${issue.priority === priority ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{priority}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {project && <>
                <Text className="mb-2 text-xs font-semibold text-muted dark:text-muted-dark">ASSIGNEE</Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity onPress={() => handleAssigneeChange(null)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-1.5 ${issue.assigneeId === null ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text className={`text-xs font-semibold ${issue.assigneeId === null ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>Unassigned</Text>
                  </TouchableOpacity>
                  {project.members.map((member) => (
                    <TouchableOpacity key={member.userId} onPress={() => handleAssigneeChange(member.userId)} disabled={updateAssignee.isPending} className={`rounded-full px-3 py-1.5 ${issue.assigneeId === member.userId ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Text className={`text-xs font-semibold ${issue.assigneeId === member.userId ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{member.user.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>}
              <TouchableOpacity onPress={() => setPropertiesModalVisible(false)} className="mt-6 items-center rounded-xl bg-blue-600 py-3">
                <Text className="font-semibold text-white">Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
