import { supabase } from "@/lib/supabaseClient";

export async function getJobByOrderNumber(orderNumber: string, orgId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("order_number", orderNumber)
    .eq("org_id", orgId)
    .single();

  if (error) throw error;
  return data;
}