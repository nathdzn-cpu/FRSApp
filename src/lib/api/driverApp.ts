import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';
import { callFn } from '../callFunction';
import { Document, ProfileDevice, DailyCheck, JobProgressLog } from '@/utils/mockData';

const updateJobProgress = async (payload: any) => {
  return await callFn('update-job-progress', payload);
};

export const confirmJob = async (jobId: string, orgId: string, driverId: string, eta: string): Promise<JobProgressLog[]> => {
  const timestamp = new Date().toISOString();
  const commonPayload = {
    job_id: jobId,
    org_id: orgId,
    actor_id: driverId,
    actor_role: 'driver',
    timestamp,
  };

  // These are now individual, non-atomic calls as a temporary step.
  // A future refactor will combine these into a single atomic Edge Function.
  const confirmPromise = updateJobProgress({ ...commonPayload, action: 'job_confirmed', notes: 'Driver confirmed job.' });
  const etaPromise = updateJobProgress({ ...commonPayload, action: 'eta_set', notes: `ETA to first collection: ${eta}` });
  const acceptPromise = updateJobProgress({ ...commonPayload, action: 'accepted', notes: 'Job status changed to accepted by driver.' });

  const results = await Promise.all([confirmPromise, etaPromise, acceptPromise]);
  return results.map(r => r.log);
};

export const uploadDocument = async (
  jobId: string,
  orgId: string,
  driverId: string,
  type: 'pod' | 'cmr' | 'damage' | 'check_signature',
  storagePath: string,
  stopId?: string,
): Promise<Document> => {
  const newDocument = {
    id: uuidv4(),
    org_id: orgId,
    job_id: jobId,
    stop_id: stopId,
    type: type,
    storage_path: storagePath,
    uploaded_by: driverId,
    created_at: new Date().toISOString(),
  };

  // 1. Insert the document record into the database
  const { data: insertedDocument, error: insertError } = await supabase
    .from('documents')
    .insert(newDocument)
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting document record:", insertError);
    throw new Error(insertError.message);
  }

  // 2. Log the event using the edge function
  await updateJobProgress({
    job_id: jobId,
    org_id: orgId,
    stop_id: stopId,
    actor_id: driverId,
    actor_role: 'driver',
    action: type === 'pod' ? 'pod_uploaded' : 'document_uploaded',
    notes: `${type.replace(/_/g, ' ')} uploaded.`,
    timestamp: new Date().toISOString(),
  });

  return insertedDocument as Document;
};

export const addJobNote = async (jobId: string, orgId: string, driverId: string, note: string): Promise<JobProgressLog> => {
  const result = await updateJobProgress({
    job_id: jobId,
    org_id: orgId,
    actor_id: driverId,
    actor_role: 'driver',
    action: 'note_added',
    notes: note,
    timestamp: new Date().toISOString(),
  });
  return result.log;
};

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<JobProgressLog> => {
  const result = await updateJobProgress({
    job_id: jobId,
    org_id: orgId,
    actor_id: driverId,
    actor_role: 'driver',
    action: 'location_ping',
    lat,
    lon,
    timestamp: new Date().toISOString(),
  });
  return result.log;
};

export const registerPushToken = async (profileId: string, orgId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => {
  const { data: existingDevice, error: searchError } = await supabase
    .from('profile_devices')
    .select('id')
    .eq('profile_id', profileId)
    .eq('platform', platform)
    .maybeSingle();

  if (searchError) {
    console.error("Error searching for existing push token device:", searchError);
    throw searchError;
  }

  const deviceData = {
    org_id: orgId,
    profile_id: profileId,
    platform: platform,
    expo_push_token: expoPushToken,
  };

  if (existingDevice) {
    // Update existing device
    const { data: updatedDevice, error: updateError } = await supabase
      .from('profile_devices')
      .update(deviceData)
      .eq('id', existingDevice.id)
      .select()
      .single();
    if (updateError) throw updateError;
    console.log(`Updated push token for profile ${profileId} on ${platform}`);
    return updatedDevice as ProfileDevice;
  } else {
    // Add new device
    const { data: newDevice, error: insertError } = await supabase
      .from('profile_devices')
      .insert(deviceData)
      .select()
      .single();
    if (insertError) throw insertError;
    console.log(`Registered new push token for profile ${profileId} on ${platform}`);
    return newDevice as ProfileDevice;
  }
};

export const submitDailyCheck = async (
  orgId: string,
  driverId: string,
  truckReg: string,
  items: any[], // Assuming items is an array of check answers
  signature: string,
  startedAt: string,
  finishedAt: string,
  actorRole: 'driver',
  trailerNo?: string,
): Promise<DailyCheck> => {
  const payload = {
    org_id: orgId,
    driver_id: driverId,
    truck_reg: truckReg,
    trailer_no: trailerNo,
    items: items,
    signature: signature,
    started_at: startedAt,
    finished_at: finishedAt,
    actor_role: actorRole,
  };

  // Call the dedicated edge function for submitting daily checks
  const result = await callFn('driver-daily-check-submit', payload);
  return result as DailyCheck;
};