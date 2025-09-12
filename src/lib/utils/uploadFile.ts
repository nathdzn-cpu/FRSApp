import { supabase } from '@/lib/supabaseClient';

export const uploadFile = async (
  bucketName: string,
  filePath: string,
  file: File | Blob,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
    contentType?: string;
  }
) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
      contentType: options?.contentType || file.type,
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file.');
  }

  return publicUrlData.publicUrl;
};