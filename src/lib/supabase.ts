import { supabase, callFn } from './supabaseClient'; // Import callFn
export * from './api/tenants';
export * from './api/jobs';
export * from './api/dailyChecklists';
export * from './api/driverApp';
export * from './api/edgeFunctions';
export * from './api/tenantCounters';
import { Profile } from '@/utils/mockData'; // Import Profile interface

// --- Profiles (direct client-side Supabase calls, relying on RLS) ---
export const getProfiles = async (tenantId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error(error.message);
  }
  return data as Profile[];
};

// Admin-specific function to get all users (profiles) for admin view
// This will bypass RLS if the adminClient is used, but here we're using the regular client
// and assuming RLS allows admins to see all profiles in their tenant.
export const getUsersForAdmin = async (tenantId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error("Error fetching users for admin:", error);
    throw new Error(error.message);
  }
  return data as Profile[];
};

// --- Admin User Management (via Edge Functions) ---

interface CreateUserPayload {
  kind: 'driver' | 'office';
  email: string;
  tempPassword?: string; // Optional for office, required for driver
  full_name: string;
  dob?: string; // YYYY-MM-DD
  phone: string;
  truck_reg?: string;
  trailer_no?: string;
}

export const createUser = async (tenantId: string, userData: CreateUserPayload, actorId: string): Promise<Profile> => {
  const result = await callFn<{ ok: boolean; profile?: Profile; error?: string }>('admin-users-create', userData);
  if (!result.ok) throw new Error(result.error || "Failed to create user");
  return result.profile!;
};

interface UpdateUserPayload {
  id: string;
  changes: Partial<Omit<Profile, 'id' | 'tenant_id' | 'created_at' | 'is_demo'>>;
}

export const updateUser = async (tenantId: string, userId: string, changes: Partial<Profile>, actorId: string): Promise<Profile> => {
  const result = await callFn<{ ok: boolean; profile?: Profile; error?: string }>('admin-users-update', { id: userId, changes });
  if (!result.ok) throw new Error(result.error || "Failed to update user");
  return result.profile!;
};

export const deleteUser = async (tenantId: string, userId: string, actorId: string): Promise<boolean> => {
  const result = await callFn<{ ok: boolean; error?: string }>('admin-users-delete', { id: userId });
  if (!result.ok) throw new Error(result.error || "Failed to delete user");
  return true;
};

export const resetUserPassword = async (tenantId: string, userId: string, actorId: string): Promise<boolean> => {
  const result = await callFn<{ ok: boolean; error?: string }>('admin-users-reset-password', { user_id: userId });
  if (!result.ok) throw new Error(result.error || "Failed to send password reset");
  return true;
};

export const purgeDemoUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed?: number; error?: string }> => {
  const result = await callFn<{ ok: boolean; removed?: number; error?: string }>('admin-users-purge-demo', {});
  if (!result.ok) throw new Error(result.error || "Failed to purge demo users");
  return result;
};

export const purgeAllNonAdminUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed?: number; error?: string }> => {
  const result = await callFn<{ ok: boolean; removed?: number; error?: string }>('admin-users-purge', {});
  if (!result.ok) throw new Error(result.error || "Failed to purge all non-admin users");
  return result;
};

export const diagnosticCreateReadDelete = async (tenantId: string, actorId: string): Promise<any> => {
  const result = await callFn<any>('admin-users-diag', {});
  if (!result.ok) throw new Error(result.error || "Diagnostic failed");
  return result;
};