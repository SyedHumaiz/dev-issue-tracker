import React from 'react';
import { useAuthStore } from '@/src/store/useAuthStore';
import { ProfileRedesign } from '@/src/components/ProfileRedesign';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  if (!user) return null;

  return <ProfileRedesign user={user} onLogout={logout} />;
}

