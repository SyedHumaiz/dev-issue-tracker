import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useProject, useCreateIssue, useAddMember, useSearchUsers, useIssues } from '@/src/api/hooks';
import { useAuthStore } from '@/src/store/useAuthStore';
import { IssueStatus, Priority, Role, UserSearchResult } from '@/src/types';
import { MaterialIcons } from '@expo/vector-icons';
import { useDebounce } from '@/src/utils/useDebounce';
import { getErrorMessage } from '@/src/utils/error';
import { IssueCard } from '@/src/components/IssueCard';
import { SegmentedTabs } from '@/src/components/SegmentedTabs';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading, error } = useProject(id);
  const { data: issues } = useIssues({ projectId: id });
  const createIssue = useCreateIssue();
  const addMember = useAddMember(id);
  const currentUser = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'issues' | 'members'>('issues');
  
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
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
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

  const renderIssue = ({ item }: { item: any }) => {
    return (
      <Link href={`/(app)/issues/${item.id}` as any} asChild>
        <IssueCard issue={item} onPress={() => {}} />
      </Link>
    );
    const pStyle = getPriorityStyle(item.priority);
    return (
      <Link href={`/(app)/issues/${item.id}` as any} asChild>
        <TouchableOpacity className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-slate-100 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-2 space-x-2">
              <View className={`px-2 py-1 rounded flex-row items-center space-x-1.5 ${pStyle.bg}`}>
                <View className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                <Text className={`text-xs font-medium ${pStyle.text}`}>{item.priority}</Text>
              </View>
              <View className={`px-2 py-1 rounded ${item.status === 'OPEN' ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Text className={`text-xs font-medium ${item.status === 'OPEN' ? 'text-green-700' : 'text-slate-600'}`}>{item.status}</Text>
              </View>
              <Text className="text-slate-400 text-xs">•</Text>
              <Text className="text-slate-500 text-xs" numberOfLines={1}>Rep: {item.reporter.name}</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </Link>
    );
  };

  const renderMember = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-slate-100 flex-row justify-between items-center">
      <View>
        <Text className="text-base font-semibold text-slate-900">{item.user.name}</Text>
        <Text className="text-slate-500 text-xs">{item.user.email}</Text>
      </View>
      <View className={`px-3 py-1 rounded-full ${item.role === 'OWNER' ? 'bg-purple-100' : 'bg-blue-100'}`}>
        <Text className={`text-xs font-medium ${item.role === 'OWNER' ? 'text-purple-700' : 'text-blue-700'}`}>{item.role}</Text>
      </View>
    </View>
  );

  // Whether to show the search results dropdown
  const showSearchResults = !selectedUser && debouncedQuery.trim().length >= 2;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white pt-6 border-b border-slate-200">
        <View className="px-4 pb-4"><Text className="text-2xl font-semibold text-slate-900">{project.name}</Text><Text className="mt-1 text-sm text-slate-500">{project.issues.length} issues · {project.members.length} members</Text></View>
        <SegmentedTabs value={activeTab} onChange={setActiveTab} tabs={[{ value: 'issues', label: 'Issues' }, { value: 'members', label: 'Members' }]} />
      </View>

      {activeTab === 'issues' && (
        <View className="flex-1 p-4">
          {isMember && (
            isCreatingIssue ? (
              <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-slate-100">
                <TextInput
                  className="border border-slate-200 rounded-lg px-4 py-3 text-slate-900 mb-3"
                  placeholder="Issue Title"
                  value={issueTitle}
                  onChangeText={setIssueTitle}
                  autoFocus
                />
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Priority</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((priority) => (
                    <TouchableOpacity key={priority} onPress={() => setIssuePriority(priority)} className={`px-3 py-2 rounded-full ${issuePriority === priority ? 'bg-blue-600' : 'bg-slate-100'}`}>
                      <Text className={`text-xs font-semibold ${issuePriority === priority ? 'text-white' : 'text-slate-600'}`}>{priority}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Assignee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => setIssueAssigneeId(null)} className={`px-3 py-2 rounded-full ${issueAssigneeId === null ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issueAssigneeId === null ? 'text-white' : 'text-slate-600'}`}>Unassigned</Text></TouchableOpacity>
                    {project.members.map((member) => <TouchableOpacity key={member.userId} onPress={() => setIssueAssigneeId(member.userId)} className={`px-3 py-2 rounded-full ${issueAssigneeId === member.userId ? 'bg-blue-600' : 'bg-slate-100'}`}><Text className={`text-xs font-semibold ${issueAssigneeId === member.userId ? 'text-white' : 'text-slate-600'}`}>{member.user.name}</Text></TouchableOpacity>)}
                  </View>
                </ScrollView>
                <View className="flex-row justify-end space-x-3">
                  <TouchableOpacity onPress={() => setIsCreatingIssue(false)} className="px-4 py-2">
                    <Text className="text-slate-500 font-medium">Cancel</Text>
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
            ListEmptyComponent={<View className="items-center mt-12 rounded-xl border border-slate-100 bg-white p-6"><View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50"><MaterialIcons name="assignment" size={20} color="#2563eb" /></View><Text className="mt-3 font-semibold text-slate-800">No issues yet</Text><Text className="mt-1 text-center text-sm text-slate-500">Create your first issue to start tracking work.</Text></View>}
          />
        </View>
      )}

      {activeTab === 'members' && (
        <View className="flex-1 p-4">
          {isOwner && (
            isAddingMember ? (
              <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-slate-100">
                {/* Search input or selected user display */}
                {selectedUser ? (
                  <View className="flex-row items-center border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 mb-3">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-slate-900">{selectedUser.name}</Text>
                      <Text className="text-slate-500 text-xs">{selectedUser.email}</Text>
                    </View>
                    <TouchableOpacity onPress={handleClearSelection}>
                      <MaterialIcons name="close" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TextInput
                    className="border border-slate-200 rounded-lg px-4 py-3 text-slate-900 mb-1"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                  />
                )}

                {/* Search results dropdown */}
                {showSearchResults && (
                  <View className="border border-slate-200 rounded-lg mb-3 max-h-48 overflow-hidden">
                    {isSearching ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" />
                      </View>
                    ) : filteredResults.length > 0 ? (
                      <ScrollView className="max-h-48" nestedScrollEnabled>
                        {filteredResults.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            className="px-4 py-3 border-b border-slate-100"
                            onPress={() => {
                              setSelectedUser(user);
                              setSearchQuery('');
                            }}
                          >
                            <Text className="text-sm font-semibold text-slate-900">{user.name}</Text>
                            <Text className="text-xs text-slate-500">{user.email}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <View className="py-4 items-center">
                        <Text className="text-slate-400 text-sm">No users found</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Hint text when typing but not enough characters */}
                {!selectedUser && searchQuery.length > 0 && searchQuery.trim().length < 2 && (
                  <Text className="text-slate-400 text-xs mb-3 px-1">Type at least 2 characters to search</Text>
                )}

                <View className="flex-row justify-end space-x-3">
                  <TouchableOpacity onPress={handleCancelAddMember} className="px-4 py-2">
                    <Text className="text-slate-500 font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleAddMember} 
                    className={`px-4 py-2 rounded-lg ${selectedUser ? 'bg-blue-600' : 'bg-slate-300'}`}
                    disabled={!selectedUser || addMember.isPending}
                  >
                    {addMember.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className={`font-medium ${selectedUser ? 'text-white' : 'text-slate-500'}`}>Add</Text>
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
