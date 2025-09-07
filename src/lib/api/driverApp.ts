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

  // Fetch driver's full name for the note
  const { data: driverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', driverId)
    .single();

  if (profileError || !driverProfile) {
    console.error("Error fetching driver profile for job confirmation:", profileError);
    throw new Error(profileError?.message || "Driver profile not found.");
  }

  const logs: JobProgressLog[] = [];
  const currentTimestamp = new Date().toISOString();

  // Add job_confirmed event to job_progress_log
  const { data: confirmedLog, error: confirmedLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'job_confirmed',
      notes: `${driverProfile.full_name} confirmed job '${job.order_number}'.`,
      timestamp: currentTimestamp,
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
      notes: `${driverProfile.full_name} set ETA to first collection: ${eta}.`,
      timestamp: currentTimestamp,
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
        notes: `${driverProfile.full_name} accepted job '${job.order_number}'.`,
        timestamp: currentTimestamp,
      })
      .select()
      .single();
    if (statusChangeLogError) console.error("Error inserting status change log:", statusChangeLogError);
    if (statusChangeLog) logs.push(statusChangeLog);
  }

  return logs;
};

export const updateJobStage = async (
  jobId: string,
  orgId: string,
  driverId: string,
  actionType: 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered' | 'on_route_collection' | 'on_route_delivery' | 'loaded', // Renamed eventType to actionType
  stopId?: string,
  notes?: string,
  lat?: number,
  lon?: number,
): Promise<JobProgressLog | undefined> => {
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Fetch driver's full name for the note
  const { data: driverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', driverId)
    .single();

  if (profileError || !driverProfile) {
    console.error("Error fetching driver profile for job stage update:", profileError);
    throw new Error(profileError?.message || "Driver profile not found.");
  }

  // Update job status based on actionType
  job.status = actionType; // Directly set job status to actionType
  const currentTimestamp = new Date().toISOString();

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      stop_id: stopId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: actionType, // Use actionType as the action_type for the log
      notes: notes || `${driverProfile.full_name} marked job '${job.order_number}' as '${actionType.replace(/_/g, ' ')}'.`,
      lat: lat,
      lon: lon,
      timestamp: currentTimestamp,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting job stage log:", insertError);
    throw new Error(insertError.message);
  }

  // Update driver's last job status
  const driverProfileMock = mockProfiles.find(p => p.id === driverId);
  if (driverProfileMock) {
    driverProfileMock.last_job_status = job.status;
  }

  return newLog;
};

export const uploadDocument = async (
  jobId: string,
  orgId: string,
  driverId: string,
  type: 'pod' | 'cmr' | 'damage' | 'check_signature',
  base64Image: string, // In a real app, this would be a file or blob
  stopId?: string,
): Promise<Document> => {
  await delay(1000);
  const storagePath = `/uploads/${type}s/job_${jobId}_${stopId || 'general'}_${new Date().getTime()}.jpg`;

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

  // Fetch driver's full name for the note
  const { data: driverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', driverId)
    .single();

  if (profileError || !driverProfile) {
    console.error("Error fetching driver profile for document upload:", profileError);
    throw new Error(profileError?.message || "Driver profile not found.");
  }

  const currentTimestamp = new Date().toISOString();

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
      notes: `${driverProfile.full_name} uploaded a ${type.replace(/_/g, ' ')}.`,
      timestamp: currentTimestamp,
    });
  if (progressLogError) console.error("Error inserting document upload log:", progressLogError);

  console.log(`Simulating image upload to ${storagePath}. Base64 length: ${base64Image.length}`);
  return newDocument;
};

export const addJobNote = async (jobId: string, orgId: string, driverId: string, note: string): Promise<JobProgressLog> => {
  await delay(300);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Fetch driver's full name for the note
  const { data: driverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', driverId)
    .single();

  if (profileError || !driverProfile) {
    console.error("Error fetching driver profile for job note:", profileError);
    throw new Error(profileError?.message || "Driver profile not found.");
  }

  const currentTimestamp = new Date().toISOString();

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'note_added',
      notes: `${driverProfile.full_name} added a note: "${note}".`,
      timestamp: currentTimestamp,
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

  // Fetch driver's full name for the note
  const { data: driverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', driverId)
    .single();

  if (profileError || !driverProfile) {
    console.error("Error fetching driver profile for location ping:", profileError);
    throw new Error(profileError?.message || "Driver profile not found.");
  }

  const currentTimestamp = new Date().toISOString();

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      actor_role: 'driver', // Driver role
      action_type: 'location_ping',
      notes: `${driverProfile.full_name} reported location at Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}.`,
      lat: lat,
      lon: lon,
      timestamp: currentTimestamp,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting location ping log:", insertError);
    throw new Error(insertError.message);
  }

  // Update driver's last location
  const driverProfileMock = mockProfiles.find(p => p.id === driverId);
  if (driverProfileMock) {
    driverProfileMock.last_location = { lat, lon, timestamp: currentTimestamp };
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