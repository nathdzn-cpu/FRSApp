import { v4 as uuidv4 } from 'uuid';
import { mockProfiles, mockAuditLogs, Profile } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';
import { callFn } from '../callFunction'; // Import callFn
import { supabase } from '../supabaseClient'; // Import supabase client for direct queries

export const getProfiles = async (orgId: string, userRole: 'admin' | 'office' | 'driver' | undefined): Promise<Profile[]> => {
  if (userRole === 'driver') {
    // Drivers should only see their own profile, which RLS will enforce.
    // We still need to fetch profiles to get the assigned driver's name for the jobs table.
    // RLS on 'profiles' table should ensure a driver only sees their own profile.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, org_id, full_name, dob, phone, role, user_id, truck_reg, trailer_no, created_at, last_location, last_job_status, is_demo, avatar_url")
      .eq("org_id", orgId); // RLS will filter this further to just the driver's own profile

    if (error) {
      console.error("Error fetching profiles for driver:", error);
      throw new Error(error.message);
    }
    return data as Profile[];
  } else if (userRole === 'admin' || userRole === 'office') {
    // Admin and office users use the Edge Function to get all profiles in their org
    const result = await callFn<Profile[]>('admin-users-management', { op: "read_all", org_id: orgId });
    return result;
  }
  return []; // Should not happen if user is authenticated and has a role
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
  is_demo?: boolean;
}

export const createUser = async (orgId: string, userData: CreateUserData, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<Profile> => { // Added actorRole
  const payload = {
    op: "create",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
    ...userData,
  };
  const result = await callFn<Profile>('admin-users-management', payload);
  return result;
};

export const updateUser = async (orgId: string, profileId: string, updates: Partial<Profile>, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<Profile | undefined> => { // Added actorRole
  const payload = {
    op: "update",
    org_id: orgId,
    profile_id: profileId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
    updates: updates,
  };
  const result = await callFn<Profile>('admin-users-management', payload);
  return result;
};

export const resetUserPassword = async (orgId: string, userId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<boolean> => { // Added actorRole
  const payload = {
    op: "reset_password",
    org_id: orgId,
    user_id: userId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
  };
  await callFn('admin-users-management', payload);
  return true;
};

export const deleteUser = async (orgId: string, profileId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<boolean> => { // Added actorRole
  const payload = {
    op: "delete",
    org_id: orgId,
    profile_id: profileId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
  };
  await callFn('admin-users-management', payload);
  return true;
};

export const purgeDemoUsers = async (orgId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<{ ok: boolean; removed: number }> => { // Added actorRole
  const payload = {
    op: "purge_demo",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
  };
  const result = await callFn<{ ok: boolean; removed: number }>('admin-users-management', payload);
  return result;
};

export const purgeAllNonAdminUsers = async (orgId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<{ ok: boolean; removed: number }> => { // Added actorRole
  const payload = {
    op: "purge_all_non_admin",
    org_id: orgId,
    actor_id: actorId, // Passed for audit logging in Edge Function
    actor_role: actorRole, // Pass actor_role
  };
  const result = await callFn<{ ok: boolean; removed: number }>('admin-users-management', payload);
  return result;
};

export const uploadAvatar = async (profileId: string, file: File): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${profileId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
    return data.publicUrl;
};

export const updateProfile = async (profileId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        throw new Error(error.message);
    }
    return data;
};