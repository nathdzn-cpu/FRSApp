import { v4 as uuidv4 } from 'uuid';
import { mockProfiles, mockAuditLogs, Profile } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

export const getProfiles = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

export const getUsersForAdmin = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

export const createUser = async (tenantId: string, userData: Omit<Profile, 'id' | 'created_at' | 'tenant_id'>, actorId: string): Promise<Profile> => {
  await delay(500);
  const newUser: Profile = {
    id: uuidv4(),
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    ...userData,
  };
  mockProfiles.push(newUser);
  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'profiles',
    entity_id: newUser.id,
    action: 'create',
    after: newUser,
    created_at: new Date().toISOString(),
  });
  return newUser;
};

export const updateUser = async (tenantId: string, profileId: string, updates: Partial<Profile>, actorId: string): Promise<Profile | undefined> => {
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const oldProfile = { ...mockProfiles[profileIndex] };
    mockProfiles[profileIndex] = { ...oldProfile, ...updates };
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