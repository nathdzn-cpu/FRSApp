import { supabase } from '../supabaseClient';
import { Organisation } from '@/utils/mockData';

export const getOrganisationDetails = async (orgId: string): Promise<Organisation | null> => {
  const { data, error } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching organisation details:', error);
    throw new Error(error.message);
  }
  return data;
};

export const updateOrganisationDetails = async (orgId: string, updates: Partial<Organisation>): Promise<Organisation> => {
    const { data, error } = await supabase
        .from('orgs')
        .update(updates)
        .eq('id', orgId)
        .select()
        .single();

    if (error) {
        console.error('Error updating organisation details:', error);
        throw new Error(error.message);
    }
    return data;
};

export const uploadLogo = async (orgId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
    return data.publicUrl;
};