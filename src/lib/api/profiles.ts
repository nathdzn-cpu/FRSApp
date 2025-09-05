import { v4 as uuidv4 } from 'uuid';
import { mockProfiles, mockAuditLogs, Profile } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 64);
}

export const getProfiles = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

export const getUsersForAdmin = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

interface CreateUserData {
  full_name: string;
  dob?: string;
  phone?: string;
  role: 'driver' | 'office' | 'admin';
  user_id?: string; // Made optional for auto-generation
  truck_reg?: string;
  trailer_no?: string;
  email: string; // For Supabase Auth Admin API
  password?: string; // For Supabase Auth Admin API
  is_demo?: boolean; // Allow setting is_demo on creation
}

export const createUser = async (tenantId: string, userData: CreateUserData, actorId: string): Promise<Profile> => {
  await delay(500);

  // Simulate Supabase Auth Admin API call to create user
  console.log(`Simulating Supabase Auth: Creating user with email ${userData.email} and temp password.`);
  // In a real app, this would be:
  // const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  //   email: userData.email,
  //   password: userData.password,
  //   email_confirm: true,
  // });
  // if (authError) throw authError;
  // const newAuthUserId = authUser.user.id;

  // For mock, ensure user_id is unique or generated if not provided for office
  const generatedUserId = `${userData.role}_${slugifyName(userData.full_name)}`;
  const newAuthUserId = userData.user_id && userData.user_id.trim().length > 0 ? userData.user_id : generatedUserId;

  if (mockProfiles.some(p => p.user_id === newAuthUserId)) {
    throw new Error(`User with ID ${newAuthUserId} already exists.`);
  }

  const newUser: Profile = {
    id: uuidv4(),
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    full_name: userData.full_name,
    dob: userData.dob,
    phone: userData.phone,
    role: userData.role,
    user_id: newAuthUserId,
    truck_reg: userData.truck_reg,
    trailer_no: userData.trailer_no,
    is_demo: userData.is_demo ?? false, // Default to false if not provided
  };
  mockProfiles.push(newUser);
  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'profiles',
    entity_id: newUser.id,
    action: 'create',
    after: { role: userData.role, full_name: userData.full_name, user_id: newAuthUserId }, // Include email for audit context, but not in profile table
    created_at: new Date().toISOString(),
  });
  return newUser;
};

export const updateUser = async (tenantId: string, profileId: string, updates: Partial<Profile>, actorId: string): Promise<Profile | undefined> => {
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const oldProfile = { ...mockProfiles[profileIndex] };
    // Ensure user_id is not updated if it's empty or not provided
    const safeUpdates = { ...updates };
    if ("user_id" in safeUpdates && (safeUpdates.user_id ?? "").trim().length === 0) {
      delete safeUpdates.user_id;
    }

    mockProfiles[profileIndex] = { ...oldProfile, ...safeUpdates };
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: profileId,
      action: 'update',
      before: oldProfile,
      after: mockProfiles[profileIndex],
      created_at: new Date().toISOString(),
    });
    return mockProfiles[profileIndex];
  }
  return undefined;
};

export const resetUserPassword = async (tenantId: string, userId: string, actorId: string): Promise<boolean> => {
  await delay(500);
  const userProfile = mockProfiles.find(p => p.user_id === userId && p.tenant_id === tenantId);
  if (!userProfile) throw new Error("User not found.");

  // Simulate Supabase Auth Admin API call to send password reset email
  console.log(`Simulating Supabase Auth: Sending password reset email to user ID ${userId} (profile: ${userProfile.full_name}).`);
  // In a real app, this would be:
  // const { data, error } = await supabase.auth.admin.generateLink({
  //   type: 'password_reset',
  //   email: userProfile.email, // Assuming email is stored or retrievable
  // });
  // if (error) throw error;

  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'auth',
    entity_id: userId,
    action: 'reset_password',
    notes: `Password reset email simulated for user ${userProfile.full_name}.`,
    created_at: new Date().toISOString(),
  });
  return true;
};

export const deleteUser = async (tenantId: string, profileId: string, actorId: string): Promise<boolean> => {
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const deletedProfile = mockProfiles.splice(profileIndex, 1)[0];
    // Simulate Supabase Auth Admin API call to delete user
    console.log(`Simulating Supabase Auth: Deleting user ID ${deletedProfile.user_id} (profile: ${deletedProfile.full_name}).`);

    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: profileId,
      action: 'delete',
      before: deletedProfile,
      created_at: new Date().toISOString(),
    });
    return true;
  }
  return false;
};

export const purgeDemoUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  await delay(1000); // Simulate API call delay

  const removedProfiles: Profile[] = [];

  // Filter out demo users for the given tenant
  const updatedProfiles = mockProfiles.filter(p => {
    if (p.tenant_id === tenantId && p.is_demo) {
      removedProfiles.push(p);
      return false; // Remove this profile
    }
    return true; // Keep this profile
  });

  // Update the mockProfiles array
  mockProfiles.splice(0, mockProfiles.length, ...updatedProfiles);

  const removedCount = removedProfiles.length;

  if (removedCount > 0) {
    console.log(`Simulating Supabase Auth: Deleting ${removedCount} demo users.`);
    // In a real app, you'd iterate removedProfiles and call supabase.auth.admin.deleteUser(p.user_id)

    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: actorId, // Actor is performing the purge
      action: 'delete',
      notes: `Purged ${removedCount} demo user(s).`,
      before: { count: removedCount, ids: removedProfiles.map(p => p.id) },
      after: null,
      created_at: new Date().toISOString(),
    });
  }

  return { ok: true, removed: removedCount };
};

export const purgeAllNonAdminUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  await delay(1000); // Simulate API call delay

  const removedProfiles: Profile[] = [];

  // Filter out all non-admin users for the given tenant
  const updatedProfiles = mockProfiles.filter(p => {
    if (p.tenant_id === tenantId && p.role !== 'admin') {
      removedProfiles.push(p);
      return false; // Remove this profile
    }
    return true; // Keep this profile
  });

  // Update the mockProfiles array
  mockProfiles.splice(0, mockProfiles.length, ...updatedProfiles);

  const removedCount = removedProfiles.length;

  if (removedCount > 0) {
    console.log(`Simulating Supabase Auth: Deleting ${removedCount} non-admin users.`);
    // In a real app, you'd iterate removedProfiles and call supabase.auth.admin.deleteUser(p.user_id)

    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: actorId, // Actor is performing the purge
      action: 'delete',
      notes: `Purged ${removedCount} non-admin user(s).`,
      before: { count: removedCount, ids: removedProfiles.map(p => p.id) },
      after: null,
      created_at: new Date().toISOString(),
    });
  }

  return { ok: true, removed: removedCount };
};