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
  console.log("[action]", { step: "getProfiles", tenantId });
  await delay(200);
  const profiles = mockProfiles.filter(p => p.tenant_id === tenantId);
  console.log("[action]", { step: "getProfiles", result: profiles.length });
  return profiles;
};

export const getUsersForAdmin = async (tenantId: string): Promise<Profile[]> => {
  console.log("[action]", { step: "getUsersForAdmin", tenantId });
  await delay(200);
  const profiles = mockProfiles.filter(p => p.tenant_id === tenantId);
  console.log("[action]", { step: "getUsersForAdmin", result: profiles.length });
  return profiles;
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
  console.log("[action]", { step: "createUser", tenantId, actorId, userData: { ...userData, password: '[REDACTED]' } });
  await delay(500);

  // Simulate Supabase Auth Admin API call to create user
  console.log(`[action] Simulating Supabase Auth: Creating user with email ${userData.email} and temp password.`);
  
  const generatedUserId = `${userData.role}_${slugifyName(userData.full_name)}`;
  const newAuthUserId = userData.user_id && userData.user_id.trim().length > 0 ? userData.user_id : generatedUserId;

  if (mockProfiles.some(p => p.user_id === newAuthUserId)) {
    const errorMessage = `User with ID ${newAuthUserId} already exists.`;
    console.error("[action] createUser error:", errorMessage);
    throw new Error(errorMessage);
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
    is_demo: userData.is_demo ?? false,
  };
  mockProfiles.push(newUser);
  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'profiles',
    entity_id: newUser.id,
    action: 'create',
    after: { role: userData.role, full_name: userData.full_name, user_id: newAuthUserId },
    created_at: new Date().toISOString(),
  });
  console.log("[action]", { step: "createUser", result: newUser.id });
  return newUser;
};

export const updateUser = async (tenantId: string, profileId: string, updates: Partial<Profile>, actorId: string): Promise<Profile | undefined> => {
  console.log("[action]", { step: "updateUser", tenantId, profileId, actorId, updates });
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const oldProfile = { ...mockProfiles[profileIndex] };
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
    console.log("[action]", { step: "updateUser", result: mockProfiles[profileIndex].id });
    return mockProfiles[profileIndex];
  }
  const errorMessage = "User not found in tenant.";
  console.error("[action] updateUser error:", errorMessage);
  throw new Error(errorMessage);
};

export const resetUserPassword = async (tenantId: string, userId: string, actorId: string): Promise<boolean> => {
  console.log("[action]", { step: "resetUserPassword", tenantId, userId, actorId });
  await delay(500);
  const userProfile = mockProfiles.find(p => p.user_id === userId && p.tenant_id === tenantId);
  if (!userProfile) {
    const errorMessage = "User not found.";
    console.error("[action] resetUserPassword error:", errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`[action] Simulating Supabase Auth: Sending password reset email to user ID ${userId} (profile: ${userProfile.full_name}).`);
  
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
  console.log("[action]", { step: "resetUserPassword", result: true });
  return true;
};

export const deleteUser = async (tenantId: string, profileId: string, actorId: string): Promise<boolean> => {
  console.log("[action]", { step: "deleteUser", tenantId, profileId, actorId });
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const deletedProfile = mockProfiles.splice(profileIndex, 1)[0];
    console.log(`[action] Simulating Supabase Auth: Deleting user ID ${deletedProfile.user_id} (profile: ${deletedProfile.full_name}).`);

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
    console.log("[action]", { step: "deleteUser", result: true });
    return true;
  }
  const errorMessage = "User not found.";
  console.error("[action] deleteUser error:", errorMessage);
  throw new Error(errorMessage);
};

export const purgeDemoUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  console.log("[action]", { step: "purgeDemoUsers", tenantId, actorId });
  await delay(1000);

  const removedProfiles: Profile[] = [];
  const updatedProfiles = mockProfiles.filter(p => {
    if (p.tenant_id === tenantId && p.is_demo) {
      removedProfiles.push(p);
      return false;
    }
    return true;
  });

  mockProfiles.splice(0, mockProfiles.length, ...updatedProfiles);
  const removedCount = removedProfiles.length;

  if (removedCount > 0) {
    console.log(`[action] Simulating Supabase Auth: Deleting ${removedCount} demo users.`);
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: actorId,
      action: 'delete',
      notes: `Purged ${removedCount} demo user(s).`,
      before: { count: removedCount, ids: removedProfiles.map(p => p.id) },
      after: null,
      created_at: new Date().toISOString(),
    });
  }
  console.log("[action]", { step: "purgeDemoUsers", result: { ok: true, removed: removedCount } });
  return { ok: true, removed: removedCount };
};

export const purgeAllNonAdminUsers = async (tenantId: string, actorId: string): Promise<{ ok: boolean; removed: number }> => {
  console.log("[action]", { step: "purgeAllNonAdminUsers", tenantId, actorId });
  await delay(1000);

  const removedProfiles: Profile[] = [];
  const updatedProfiles = mockProfiles.filter(p => {
    if (p.tenant_id === tenantId && p.role !== 'admin') {
      removedProfiles.push(p);
      return false;
    }
    return true;
  });

  mockProfiles.splice(0, mockProfiles.length, ...updatedProfiles);
  const removedCount = removedProfiles.length;

  if (removedCount > 0) {
    console.log(`[action] Simulating Supabase Auth: Deleting ${removedCount} non-admin users.`);
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: actorId,
      action: 'delete',
      notes: `Purged ${removedCount} non-admin user(s).`,
      before: { count: removedCount, ids: removedProfiles.map(p => p.id) },
      after: null,
      created_at: new Date().toISOString(),
    });
  }
  console.log("[action]", { step: "purgeAllNonAdminUsers", result: { ok: true, removed: removedCount } });
  return { ok: true, removed: removedCount };
};

export async function diagnosticCreateReadDelete(tenantId: string, actorId: string) {
  console.log("[action]", { step: "diagnosticCreateReadDelete", tenantId, actorId });
  await delay(500);
  const marker = "diag_" + Math.random().toString(36).slice(2, 8);
  const newProfileId = uuidv4();

  // 1) Create a dummy profile row
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "INSERT" });
  const newProfile: Profile = {
    id: newProfileId,
    tenant_id: tenantId,
    full_name: "Diag User " + marker,
    role: "driver",
    user_id: `auth_user_${marker}`,
    created_at: new Date().toISOString(),
    is_demo: true,
  };
  mockProfiles.push(newProfile);
  const ins = { id: newProfile.id, tenant_id: newProfile.tenant_id, full_name: newProfile.full_name, role: newProfile.role };
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "INSERT success", id: ins.id });

  // 2) Read it back via mockProfiles
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "SELECT" });
  const read = mockProfiles.find(p => p.id === newProfileId && p.tenant_id === tenantId);
  if (!read) {
    const errorMessage = "SELECT failed: Profile not found after insert.";
    console.error("[action] diagnosticCreateReadDelete error:", errorMessage);
    throw new Error(errorMessage);
  }
  const readResult = { id: read.id, tenant_id: read.tenant_id, full_name: read.full_name, role: read.role };
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "SELECT success", id: readResult.id });

  // 3) Delete it
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "DELETE" });
  const profileIndex = mockProfiles.findIndex(p => p.id === newProfileId && p.tenant_id === tenantId);
  let del = null;
  if (profileIndex > -1) {
    const deleted = mockProfiles.splice(profileIndex, 1)[0];
    del = { id: deleted.id };
  } else {
    const errorMessage = "DELETE failed: Profile not found for deletion.";
    console.error("[action] diagnosticCreateReadDelete error:", errorMessage);
    throw new Error(errorMessage);
  }
  console.log("[action]", { step: "diagnosticCreateReadDelete", subStep: "DELETE success", id: del.id });

  console.log("[action]", { step: "diagnosticCreateReadDelete", result: { ok: true, created: ins, read: readResult, deleted: del } });
  return { ok: true, created: ins, read: readResult, deleted: del };
}