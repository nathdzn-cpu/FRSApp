import { supabase } from '../supabaseClient';
import { Quote } from '@/utils/mockData';

export const getQuotes = async (orgId: string): Promise<Quote[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching quotes:", error);
    throw new Error(error.message);
  }
  return data as Quote[];
};

interface CreateQuotePayload {
  from_location: string;
  to_location: string;
  customer: string;
  price: number | null;
  mileage: number | null;
  drops: number;
}

export const createQuote = async (orgId: string, payload: CreateQuotePayload): Promise<Quote> => {
  const { data, error } = await supabase
    .from('quotes')
    .insert({ ...payload, org_id: orgId })
    .select()
    .single();

  if (error) {
    console.error("Error creating quote:", error);
    throw new Error(error.message);
  }
  return data as Quote;
};

interface UpdateQuotePayload {
  from_location?: string;
  to_location?: string;
  customer?: string;
  price?: number | null;
  mileage?: number | null;
  drops?: number;
}

export const updateQuote = async (quoteId: string, orgId: string, payload: UpdateQuotePayload): Promise<Quote> => {
  const { data, error } = await supabase
    .from('quotes')
    .update(payload)
    .eq('id', quoteId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    console.error("Error updating quote:", error);
    throw new Error(error.message);
  }
  return data as Quote;
};

export const deleteQuote = async (quoteId: string, orgId: string): Promise<void> => {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('org_id', orgId);

  if (error) {
    console.error("Error deleting quote:", error);
    throw new Error(error.message);
  }
};