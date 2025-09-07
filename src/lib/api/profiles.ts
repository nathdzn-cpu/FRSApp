import { v4 as uuidv4 } from 'uuid';
import { mockProfiles, mockAuditLogs, Profile } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';
import { callFn } from '../callFunction'; // Import callFn

export const getProfiles = async (orgId: string): Promise<Profile[]> => {
  const result = await callFn<Profile[]>('admin-users-management', { op: "read_all", org_id: orgId });
  return result;
};

export const getProfileByAuthId = async (authUserId: string): Promise<Profile | undefined> => {
  // This function is currently only used by AuthContext and relies on client-side RLS.
  // For now, we'll keep it as a direct Supabase call, assuming RLS is set up for individual profile access.
  // If this needs to be admin-only, it would also go through the Edge Function.
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", authUserId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error("Error fetching profile by auth ID:", error);
    throw new Error(error.message);
  }
  return data as Profile | undefined;
};

export const getUsersForAdmin = async (orgId: string): Promise<Profile[]> => {
  const result = await callFn<Profile[]>('admin-users-management', { op: "read_all", org_id: orgId });
  return result;
};

interface CreateUserData {
  full_name: string;
  dob?: string;
  phone?: string;
  role: 'driver' | 'office' | 'admin';
  email: string;
  password?: string;
  is_demo?: boolean;
}

export const createUser = async (orgId: string, userData: CreateUserData, actorId: string): Promise<Profile> => {
  const payload = {
    op: "create",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    ...userData,
  };
  const result = await callFn<Profile>('admin-users-management', payload);
  return result;
};

export const updateUser = async (orgId: string, profileId: string, updates: Partial<Profile>, actorId: string): Promise<Profile | undefined> => {
  const payload = {
    op: "update",
    org_id: orgId,
    profile_id: profileId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    updates: updates,
  };
  const result = await callFn<Profile>('admin-users-management', payload);
  return result;
};

export const resetUserPassword = async (orgId: string, userId: string, actorId: string): Promise<boolean> => {
  const payload = {
    op: "reset_password",
    org_id: orgId,
    user_id: userId,
    actor_id: actorId, // Passed for audit logging in Edge Function
  };
  await callFn('admin-users-management', payload);
  return true;
};

export const deleteUser = async (orgId: string, profileId: string, actorId: string): Promise<boolean> => {
  const payload = {
    op: "delete",
    org_id: orgId,
    profile_id: profileId,
    actor_id: actorId, // Passed for audit logging in Edge Function
  };
  await callFn('admin-users-management', payload);
  return true;
};

export const purgeDemoUsers = async (orgId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  const payload = {
    op: "purge_demo",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
  };
  const result = await callFn<{ ok: boolean; removed: number }>('admin-users-management', payload);
  return result;
};

export const purgeAllNonAdminUsers = async (orgId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  const payload = {
    op: "purge_all_non_admin",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
  };
  const result = await callFn<{ ok: boolean; removed: number }>('admin-users-management', payload);
  return result;
};