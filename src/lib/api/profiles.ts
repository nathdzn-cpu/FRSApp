import { supabase } from '../supabaseClient';
import { Profile } from '@/types';
import { callFn } from '../callFunction';

export const getProfiles = async (orgId: string, role?: 'driver' | 'office' | 'admin'): Promise<Profile[]> => {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('org_id', orgId);

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }

  return data as Profile[];
};

export const createUser = async (userData: any) => {
    const { data, error } = await callFn('admin-users-management', {
        action: 'CREATE_USER',
        userData,
    });

    if (error) {
        console.error('Error creating user:', error);
        throw error;
    }
    return data;
};

export const updateUser = async (userId: string, orgId: string, updates: Partial<Profile>) => {
    const { data, error } = await callFn('admin-users-management', {
        action: 'UPDATE_USER',
        userId,
        orgId,
        updates,
    });

    if (error) {
        console.error('Error updating user:', error);
        throw error;
    }
    return data;
};