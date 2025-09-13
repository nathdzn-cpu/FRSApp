import { v4 as uuidv4 } from 'uuid';
import {
  mockJobs,
  mockDocuments,
  mockProfileDevices,
  mockDailyChecks,
  mockProfiles,
  Document,
  ProfileDevice,
  DailyCheck,
  JobProgressLog,
} from '@/utils/mockData';
import { delay } from '../utils/apiUtils';
import { supabase } from '../supabaseClient'; // Import supabase client

export const confirmJob = async (jobId: string, orgId: string, driverId: string, eta: string): Promise<JobProgressLog[]> => {
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const logs: JobProgressLog[] = [];

  // Add job_confirmed event to job_progress_log
  const { data: confirmedLog, error: confirmedLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'job_confirmed',
      notes: 'Driver confirmed job.',
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (confirmedLogError) console.error("Error inserting confirmed job log:", confirmedLogError);
  if (confirmedLog) logs.push(confirmedLog);

  // Add eta_set event to job_progress_log
  const { data: etaLog, error: etaLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'eta_set',
      notes: `ETA to first collection: ${eta}`,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (etaLogError) console.error("Error inserting ETA log:", etaLogError);
  if (etaLog) logs.push(etaLog);

  // Update job status to 'accepted' if it was 'assigned'
  if (job.status === 'assigned') {
    job.status = 'accepted';
    const { data: statusChangeLog, error: statusChangeLogError } = await supabase
      .from('job_progress_log')
      .insert({
        org_id: orgId,
        job_id: jobId,
        actor_id: driverId,
        actor_role: 'driver', // Driver role
        action_type: 'accepted', // Use 'accepted' as the action_type for the log
        notes: 'Job status changed to accepted by driver.',
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    if (statusChangeLogError) console.error("Error inserting status change log:", statusChangeLogError);
    if (statusChangeLog) logs.push(statusChangeLog);
  }

  return logs;
};

// Removed updateJobStage as it's replaced by updateJobProgress Edge Function

export const uploadDocument = async (
  jobId: string,
  orgId: string,
  driverId: string,
  type: 'pod' | 'cmr' | 'damage' | 'check_signature',
  storagePath: string, // Changed from base64Image to storagePath
  stopId?: string,
): Promise<Document> => {
  await delay(1000);
  // In a real app, the file would have already been uploaded to storage
  // and storagePath would be the public URL or path.

  const newDocument: Document = {
    id: uuidv4(),
    org_id: orgId,
    job_id: jobId,
    stop_id: stopId,
    type: type,
    storage_path: storagePath,
    uploaded_by: driverId,
    created_at: new Date().toISOString(),
  };
  mockDocuments.push(newDocument);

  // Add a job event for document upload to job_progress_log
  const { error: progressLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      stop_id: stopId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: type === 'pod' ? 'pod_uploaded' : 'document_uploaded', // Use specific action_type for log
      notes: `${type.replace(/_/g, ' ')} uploaded.`,
      timestamp: new Date().toISOString(),
    });
  if (progressLogError) console.error("Error inserting document upload log:", progressLogError);

  console.log(`Simulating document record for ${storagePath}.`);
  return newDocument;
};

export const addJobNote = async (jobId: string, orgId: string, driverId: string, note: string): Promise<JobProgressLog> => {
  await delay(300);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'note_added',
      notes: note,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting job note log:", insertError);
    throw new Error(insertError.message);
  }

  return newLog;
};

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<JobProgressLog> => {
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId);
  if (!job || job.status !== 'accepted') throw new Error("Job not in progress or not assigned to this driver.");

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'location_ping',
      lat: lat,
      lon: lon,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting location ping log:", insertError);
    throw new Error(insertError.message);
  }

  // Update driver's last location
  const driverProfile = mockProfiles.find(p => p.id === driverId);
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newLog;
};

export const registerPushToken = async (profileId: string, orgId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => {
  await delay(300);
  // Check for existing device for this profile and platform
  const existingDeviceIndex = mockProfileDevices.findIndex(
    d => d.profile_id === profileId && d.platform === platform
  );

  const newDevice: ProfileDevice = {
    id: uuidv4(),
    org_id: orgId,
    profile_id: profileId,
    platform: platform,
    expo_push_token: expoPushToken,
    created_at: new Date().toISOString(),
  };

  if (existingDeviceIndex > -1) {
    // Update existing device
    mockProfileDevices[existingDeviceIndex] = { ...mockProfileDevices[existingDeviceIndex], ...newDevice };
    console.log(`Updated push token for profile ${profileId} on ${platform}`);
    return mockProfileDevices[existingDeviceIndex];
  } else {
    // Add new device
    mockProfileDevices.push(newDevice);
    console.log(`Registered new push token for profile ${profileId} on ${platform}`);
    return newDevice;
  }
};

export const submitDailyCheck = async (
  orgId: string,
  driverId: string,
  checklistId: string,
  vehicleReg: string,
  answers: Record<string, string | boolean>,
  status: 'pass' | 'fail' | 'partial',
  notes?: string,
  signatureBase64?: string,
  durationSeconds?: number,
  trailerNo?: string,
): Promise<DailyCheck> => {
  await delay(1000);

  const newDailyCheck: DailyCheck = {
    id: uuidv4(),
    org_id: orgId,
    driver_id: driverId,
    checklist_id: checklistId,
    vehicle_reg: vehicleReg,
    trailer_no: trailerNo,
    started_at: new Date().toISOString(), // Assuming started now
    ended_at: new Date().toISOString(),
    duration_seconds: durationSeconds,
    status: status,
    answers: answers,
    notes: notes,
    signature_path: signatureBase64 ? `/signatures/daily_check_${uuidv4()}.png` : undefined, // Placeholder path
    created_at: new Date().toISOString(),
  };
  mockDailyChecks.push(newDailyCheck);

  // If signature provided, simulate document upload
  if (signatureBase64 && newDailyCheck.signature_path) {
    mockDocuments.push({
      id: uuidv4(),
      org_id: orgId,
      job_id: 'N/A', // Daily checks are not tied to a specific job_id in this schema
      type: 'check_signature',
      storage_path: newDailyCheck.signature_path,
      uploaded_by: driverId,
      created_at: new Date().toISOString(),
    });
  }

  // Update driver's truck_reg and trailer_no if provided
  const driverProfile = mockProfiles.find(p => p.id === driverId);
  if (driverProfile) {
    if (vehicleReg) driverProfile.truck_reg = vehicleReg;
    if (trailerNo) driverProfile.trailer_no = trailerNo;
    mockAuditLogs.push({
      id: uuidv4(),
      org_id: orgId,
      actor_id: driverId,
      entity: 'profiles',
      entity_id: driverId,
      action: 'update',
      before: { truck_reg: driverProfile.truck_reg, trailer_no: driverProfile.trailer_no },
      after: { truck_reg: vehicleReg, trailer_no: trailerNo },
      created_at: new Date().toISOString(),
    });
  }

  return newDailyCheck;
};