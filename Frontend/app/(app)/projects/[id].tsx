import React, { useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProject, useProjectStats, useCreateIssue, useAddMember, useSearchUsers, useIssues, useUpdateStatus, useUpdateMemberRole, useRemoveMember, useUpdateProject } from '@/src/api/hooks';
import { useAuthStore } from '@/src/store/useAuthStore';
import { IssueListItem, IssueStatus, Priority, Role, UserSearchResult } from '@/src/types';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebounce } from '@/src/utils/useDebounce';
import { getErrorMessage } from '@/src/utils/error';
import { IssueCard } from '@/src/components/IssueCard';
import { SegmentedTabs } from '@/src/components/SegmentedTabs';
import { useProjectRoom } from '@/src/hooks/useRealtime';
import { EmptyState } from '@/src/components/EmptyState';
import Swipeable from 'react-native-gesture-handler/Swipeable';

function SwipeableIssueRow({ issue, onPress }: { issue: IssueListItem; onPress: () => void }) {
  const swipeableRef = useRef<Swipeable>(null);
  const updateStatus = useUpdateStatus(issue.id);
  const nextStatus = issue.status === IssueStatus.CLOSED ? IssueStatus.OPEN : IssueStatus.CLOSED;
  const actionLabel = nextStatus === IssueStatus.CLOSED ? 'Close' : 'Reopen';
  const actionColor = nextStatus === IssueStatus.CLOSED ? 'bg-slate-600' : 'bg-emerald-600';

  const handleStatusAction = async () => {
    swipeableRef.current?.close();
    try {
      await updateStatus.mutateAsync({ status: nextStatus });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity
          className={`mb-2 w-24 items-center justify-center rounded-r-xl ${actionColor}`}
          onPress={handleStatusAction}
          disabled={updateStatus.isPending}
          activeOpacity={0.8}
        >
          <MaterialIcons name={nextStatus === IssueStatus.CLOSED ? 'check-circle-outline' : 'replay'} size={21} color="#fff" />
          <Text className="mt-1 text-xs font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    >
      <IssueCard issue={issue} onPress={onPress} showSwipeHint />
    </Swipeable>
  );
}

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  useProjectRoom(id);
  const { data: project, isLoading, error } = useProject(id);
  const { data: issues, isLoading: isIssuesLoading } = useIssues({ projectId: id });
  const createIssue = useCreateIssue();
  const addMember = useAddMember(id);
  const currentUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'members'>('overview');
  const { data: stats, isLoading: isStatsLoading } = useProjectStats(id);
  const updateMemberRole = useUpdateMemberRole(id);
  const removeMember = useRemoveMember(id);
  const updateProject = useUpdateProject(id);
  const [projectName, setProjectName] = useState('');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  
  // Issue Creation State
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issuePriority, setIssuePriority] = useState<Priority>(Priority.MEDIUM);
  const [issueAssigneeId, setIssueAssigneeId] = useState<string | null>(null);

  // Member Addition State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Debounce the search query (~300ms)
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(debouncedQuery);

  // Filter out users who are already project members (client-side)
  const filteredResults = useMemo(() => {
    if (!searchResults || !project) return [];
    const existingMemberIds = new Set(project.members.map((m) => m.userId));
    return searchResults.filter((u) => !existingMemberIds.has(u.id));
  }, [searchResults, project]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-background-dark">
        <Text className="text-red-500">Failed to load project details.</Text>
      </View>
    );
  }

  const isOwner = project.members.some((m) => m.userId === currentUser?.id && m.role === Role.OWNER);
  const isMember = project.members.some((m) => m.userId === currentUser?.id);

  const handleCreateIssue = async () => {
    if (!issueTitle.trim()) return;
    try {
      await createIssue.mutateAsync({
        title: issueTitle,
        projectId: project.id,
        status: IssueStatus.OPEN,
        priority: issuePriority,
        assigneeId: issueAssigneeId,
      });
      setIssueTitle('');
      setIssuePriority(Priority.MEDIUM);
      setIssueAssigneeId(null);
      setIsCreatingIssue(false);
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    try {
      await addMember.mutateAsync({ userId: selectedUser.id, role: Role.MEMBER });
      setSelectedUser(null);
      setSearchQuery('');
      setIsAddingMember(false);
    } catch (err: any) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleCancelAddMember = () => {
    setIsAddingMember(false);
    setSearchQuery('');
    setSelectedUser(null);
  };

  const handleRoleToggle = (member: any) => {
    Alert.alert('Change member role', `Make ${member.user.name} a ${member.role === Role.OWNER ? 'Member' : 'Owner'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateMemberRole.mutate({ userId: member.userId, data: { role: member.role === Role.OWNER ? Role.MEMBER : Role.OWNER } }) },
    ]);
  };

  const handleRemoveMember = (member: any) => {
    Alert.alert('Remove member', `Remove ${member.user.name} from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember.mutate(member.userId) },
    ]);
  };

  const handleSaveSettings = async () => {
    if (!projectName.trim()) return;
    try {
      await updateProject.mutateAsync({ name: projectName.trim() });
      setIsEditingSettings(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleArchive = () => {
    Alert.alert('Archive project', 'This project will be hidden from the default Projects list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => {
        try {
          await updateProject.mutateAsync({ isArchived: true });
          router.back();
        } catch (err) {
          Alert.alert('Error', getErrorMessage(err));
        }
      } },
    ]);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
      case 'HIGH': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
      case 'MEDIUM': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
      case 'LOW': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' };
    }
  };

  const renderIssue = ({ item }: { item: IssueListItem }) => (
    <SwipeableIssueRow
      issue={item}
      onPress={() => router.push(`/(app)/issues/${item.id}` as any)}
    />
  );

  const renderMember = ({ item }: { item: any }) => (
    <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl mb-3 shadow-sm border border-border dark:border-border-dark flex-row justify-between items-center">
      <View>
        <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">{item.user.name}</Text>
        <Text className="text-muted dark:text-muted-dark text-xs">{item.user.email}</Text>
      </View>
      <View className="flex-row items-center gap-2">
      {isOwner && item.userId !== currentUser?.id && <TouchableOpacity onPress={() => handleRemoveMember(item)}><MaterialIcons name="person-remove" size={20} color="#dc2626" /></TouchableOpacity>}
      <TouchableOpacity disabled={!isOwner || item.userId === currentUser?.id} onPress={() => handleRoleToggle(item)} className={`px-3 py-1 rounded-full ${item.role === 'OWNER' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-blue-100 dark:bg-blue-950'}`}>
        <Text className={`text-xs font-semibold ${item.role === 'OWNER' ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`}>{item.role}</Text>
      </TouchableOpacity>
      </View>
    </View>
  );

  // Whether to show the search results dropdown
  const showSearchResults = !selectedUser && debouncedQuery.trim().length >= 2;

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="bg-surface dark:bg-surface-dark pt-6 border-b border-border dark:border-border-dark">
        <View className="px-4 pb-4">
          <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">{project.name}</Text>
          <Text className="mt-1 text-sm text-muted dark:text-muted-dark">{project.issues.length} issues · {project.members.length} members</Text>
        </View>
        <SegmentedTabs value={activeTab} onChange={setActiveTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'issues', label: 'Issues' }, { value: 'members', label: 'Members' }]} />
      </View>

      {activeTab === 'overview' && (
        <ScrollView className="flex-1 p-4">
          <View className="rounded-xl border border-border bg-surface p-5 dark:border-border-dark dark:bg-surface-dark">
            <Text className="text-sm font-semibold text-muted dark:text-muted-dark">TOTAL ISSUES</Text>
            {isStatsLoading ? <ActivityIndicator className="mt-3" color="#2563eb" /> : <Text className="mt-1 text-4xl font-bold text-foreground dark:text-foreground-dark">{stats?.total ?? 0}</Text>}
          </View>
          <View className="mt-4 flex-row gap-3">
            {[['Open', stats?.open ?? 0, 'bg-emerald-100', 'text-emerald-700'], ['In Review', stats?.inReview ?? 0, 'bg-blue-100', 'text-blue-700'], ['Closed', stats?.closed ?? 0, 'bg-slate-200', 'text-slate-700']].map(([label, value, bg, text]) => (
              <View key={label as string} className={`flex-1 rounded-xl p-3 ${bg}`}><Text className={`text-xs font-semibold ${text}`}>{label}</Text><Text className={`mt-1 text-2xl font-bold ${text}`}>{value}</Text></View>
            ))}
          </View>
          {isOwner && (
            <View className="mt-5 rounded-xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">Project settings</Text>
              {isEditingSettings ? <><TextInput className="mt-3 rounded-lg border border-border bg-slate-50 px-3 py-2 text-foreground dark:border-border-dark dark:bg-slate-800 dark:text-foreground-dark" value={projectName} onChangeText={setProjectName} /><View className="mt-3 flex-row justify-end gap-3"><TouchableOpacity onPress={() => setIsEditingSettings(false)}><Text className="text-muted">Cancel</Text></TouchableOpacity><TouchableOpacity onPress={handleSaveSettings}><Text className="font-semibold text-blue-600">Save</Text></TouchableOpacity></View></> : <TouchableOpacity className="mt-3" onPress={() => { setProjectName(project.name); setIsEditingSettings(true); }}><Text className="font-semibold text-blue-600">Edit project name</Text></TouchableOpacity>}
              <TouchableOpacity className="mt-4 border-t border-border pt-4 dark:border-border-dark" onPress={handleArchive}><Text className="font-semibold text-red-600">Archive project</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'issues' && (
        <View className="flex-1 p-4">
          {isMember && (
            isCreatingIssue ? (
              <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl mb-4 shadow-sm border border-border dark:border-border-dark">
                <TextInput
                  className="border border-border dark:border-border-dark bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 text-foreground dark:text-foreground-dark mb-3"
                  placeholderTextColor="#94a3b8"
                  placeholder="Issue Title"
                  value={issueTitle}
                  onChangeText={setIssueTitle}
                  autoFocus
                />
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Priority</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((priority) => (
                    <TouchableOpacity key={priority} onPress={() => setIssuePriority(priority)} className={`px-3 py-2 rounded-full ${issuePriority === priority ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Text className={`text-xs font-semibold ${issuePriority === priority ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{priority}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Assignee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => setIssueAssigneeId(null)} className={`px-3 py-2 rounded-full ${issueAssigneeId === null ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Text className={`text-xs font-semibold ${issueAssigneeId === null ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>Unassigned</Text>
                    </TouchableOpacity>
                    {project.members.map((member) => (
                      <TouchableOpacity key={member.userId} onPress={() => setIssueAssigneeId(member.userId)} className={`px-3 py-2 rounded-full ${issueAssigneeId === member.userId ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Text className={`text-xs font-semibold ${issueAssigneeId === member.userId ? 'text-white' : 'text-muted dark:text-muted-dark'}`}>{member.user.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <View className="flex-row justify-end space-x-3">
                  <TouchableOpacity onPress={() => setIsCreatingIssue(false)} className="px-4 py-2">
                    <Text className="text-muted dark:text-muted-dark font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleCreateIssue} 
                    className="bg-blue-600 px-4 py-2 rounded-lg"
                    disabled={createIssue.isPending}
                  >
                    {createIssue.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-white font-medium">Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-blue-600 p-3 rounded-xl mb-4 flex-row justify-center items-center"
                onPress={() => setIsCreatingIssue(true)}
              >
                <Text className="text-white font-semibold">New Issue</Text>
              </TouchableOpacity>
            )
          )}

          <FlatList
            data={issues}
            keyExtractor={(item) => item.id}
            renderItem={renderIssue}
            ListEmptyComponent={isIssuesLoading ? <View className="items-center py-12"><ActivityIndicator size="large" color="#2563eb" /><Text className="mt-3 text-sm text-muted dark:text-muted-dark">Loading issues…</Text></View> : <EmptyState icon="assignment" title="No issues yet" subtitle="Create the first issue to get started" iconColor="#2563eb" iconContainerClassName="bg-blue-50 dark:bg-blue-950" />}
          />
        </View>
      )}

      {activeTab === 'members' && (
        <View className="flex-1 p-4">
          {isOwner && (
            isAddingMember ? (
              <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl mb-4 shadow-sm border border-border dark:border-border-dark">
                {/* Search input or selected user display */}
                {selectedUser ? (
                  <View className="flex-row items-center border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 rounded-lg px-4 py-3 mb-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">{selectedUser.name}</Text>
                      <Text className="text-muted dark:text-muted-dark text-xs">{selectedUser.email}</Text>
                    </View>
                    <TouchableOpacity onPress={handleClearSelection}>
                      <MaterialIcons name="close" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TextInput
                    className="border border-border dark:border-border-dark bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 text-foreground dark:text-foreground-dark mb-1"
                    placeholderTextColor="#94a3b8"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                  />
                )}

                {/* Search results dropdown */}
                {showSearchResults && (
                  <View className="border border-border dark:border-border-dark bg-surface dark:bg-surface-dark rounded-lg mb-3 max-h-48 overflow-hidden">
                    {isSearching ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" />
                      </View>
                    ) : filteredResults.length > 0 ? (
                      <ScrollView className="max-h-48" nestedScrollEnabled>
                        {filteredResults.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            className="border-b border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark"
                            onPress={() => {
                              setSelectedUser(user);
                              setSearchQuery('');
                            }}
                          >
                            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">{user.name}</Text>
                            <Text className="text-xs text-muted dark:text-muted-dark">{user.email}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View className="py-4 items-center">
                        <Text className="text-muted dark:text-muted-dark text-sm">No users found</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Hint text when typing but not enough characters */}
                {!selectedUser && searchQuery.length > 0 && searchQuery.trim().length < 2 && (
                  <Text className="text-muted dark:text-muted-dark text-xs mb-3 px-1">Type at least 2 characters to search</Text>
                )}

                <View className="flex-row justify-end space-x-3">
                  <TouchableOpacity onPress={handleCancelAddMember} className="px-4 py-2">
                    <Text className="text-muted dark:text-muted-dark font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleAddMember} 
                    className={`px-4 py-2 rounded-lg ${selectedUser ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    disabled={!selectedUser || addMember.isPending}
                  >
                    {addMember.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className={`font-medium ${selectedUser ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-purple-600 p-3 rounded-xl mb-4 flex-row justify-center items-center"
                onPress={() => setIsAddingMember(true)}
              >
                <Text className="text-white font-semibold">Add Member</Text>
              </TouchableOpacity>
            )
          )}

          <FlatList
            data={project.members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
          />
        </View>
      )}
    </View>
  );
}
