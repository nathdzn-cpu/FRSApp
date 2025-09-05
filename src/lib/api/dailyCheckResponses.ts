import { DailyCheckResponse } from '@/utils/mockData';
import { supabase } from '../supabaseClient';

interface SubmitDailyCheckPayload {
  truck_reg: string;
  trailer_no?: string;
  started_at: string;
  finished_at: string;
  signature?: string; // Base64 string
  items: Array<{ item_id: string; ok: boolean; notes?: string; photo_base64?: string }>;
}

export const submitDailyCheckResponse = async (payload: SubmitDailyCheckPayload): Promise<DailyCheckResponse> => {
  const { data, error } = await supabase.functions.invoke('driver-daily-check-submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error("Error submitting daily check response:", error);
    throw new Error(data?.error || "Failed to submit daily check response.");
  }
  return data;
};