import { DailyCheckItem } from '@/utils/mockData';
import { supabase } from '../supabaseClient';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/admin-daily-check-items';

export const getDailyCheckItems = async (): Promise<DailyCheckItem[]> => {
  const { data, error } = await supabase.functions.invoke('admin-daily-check-items', {
    method: 'GET',
  });

  if (error) {
    console.error("Error fetching daily check items:", error);
    throw new Error(data?.error || "Failed to fetch daily check items.");
  }
  return data;
};

export const createDailyCheckItem = async (itemData: Omit<DailyCheckItem, 'id' | 'org_id' | 'created_at'>): Promise<DailyCheckItem> => {
  const { data, error } = await supabase.functions.invoke('admin-daily-check-items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });

  if (error) {
    console.error("Error creating daily check item:", error);
    throw new Error(data?.error || "Failed to create daily check item.");
  }
  return data;
};

export const updateDailyCheckItem = async (itemId: string, updates: Partial<Omit<DailyCheckItem, 'id' | 'org_id' | 'created_at'>>): Promise<DailyCheckItem> => {
  const { data, error } = await supabase.functions.invoke(`admin-daily-check-items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  if (error) {
    console.error("Error updating daily check item:", error);
    throw new Error(data?.error || "Failed to update daily check item.");
  }
  return data;
};

export const deleteDailyCheckItem = async (itemId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke(`admin-daily-check-items/${itemId}`, {
    method: 'DELETE',
  });

  if (error) {
    console.error("Error deleting daily check item:", error);
    throw new Error(data?.error || "Failed to delete daily check item.");
  }
  return data;
};