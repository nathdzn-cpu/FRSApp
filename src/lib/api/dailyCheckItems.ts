import { DailyCheckItem } from '@/utils/mockData';
import { supabase } from '../supabaseClient';
import { callFn } from '../callFunction'; // Import callFn

export const getDailyCheckItems = async (orgId: string): Promise<DailyCheckItem[]> => {
  const { data, error } = await supabase.functions.invoke('admin-daily-check-items', {
    method: 'POST', // Changed to POST to send body
    body: JSON.stringify({ op: "read", org_id: orgId }), // Pass org_id in body
  });

  if (error) {
    console.error("Error fetching daily check items:", error);
    throw new Error(data?.error || "Failed to fetch daily check items.");
  }
  return data as DailyCheckItem[];
};

export const createDailyCheckItem = async (orgId: string, itemData: Omit<DailyCheckItem, 'id' | 'org_id' | 'created_at'>): Promise<DailyCheckItem> => {
  const { data: authUser } = await supabase.auth.getUser();
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', authUser?.user?.id).single();
  if (profileError) throw new Error("Failed to fetch user role for daily check item creation.");

  const { data, error } = await supabase.functions.invoke('admin-daily-check-items', {
    method: 'POST',
    body: JSON.stringify({ op: "create", org_id: orgId, actor_role: profileData.role, ...itemData }), // Added actor_role to payload
  });

  if (error) {
    console.error("Error creating daily check item:", error);
    throw new Error(data?.error || "Failed to create daily check item.");
  }
  return data;
};

export const updateDailyCheckItem = async (orgId: string, itemId: string, updates: Partial<Omit<DailyCheckItem, 'id' | 'org_id' | 'created_at'>>): Promise<DailyCheckItem> => {
  const { data: authUser } = await supabase.auth.getUser();
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', authUser?.user?.id).single();
  if (profileError) throw new Error("Failed to fetch user role for daily check item update.");

  const { data, error } = await supabase.functions.invoke(`admin-daily-check-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ op: "update", org_id: orgId, actor_role: profileData.role, changes: updates }), // Added actor_role to payload
  });

  if (error) {
    console.error("Error updating daily check item:", error);
    throw new Error(data?.error || "Failed to update daily check item.");
  }
  return data;
};

export const deleteDailyCheckItem = async (orgId: string, itemId: string): Promise<void> => {
  const { data: authUser } = await supabase.auth.getUser();
  const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', authUser?.user?.id).single();
  if (profileError) throw new Error("Failed to fetch user role for daily check item deletion.");

  const { data, error } = await supabase.functions.invoke(`admin-daily-check-items/${itemId}`, {
    method: 'DELETE',
    body: JSON.stringify({ op: "delete", org_id: orgId, actor_role: profileData.role }), // Added actor_role to payload
  });

  if (error) {
    console.error("Error deleting daily check item:", error);
    throw new Error(data?.error || "Failed to delete daily check item.");
  }
  return data;
};