import { v4 as uuidv4 } from 'uuid';
import {
  mockJobs,
  mockDocuments,
  mockProfileDevices,
  mockDailyChecks,
  mockProfiles,
  JobEvent, // Still needed for type definition in confirmJob/updateJobStage return types, but not for insertion
  Document,
  ProfileDevice,
  DailyCheck,
} from '@/utils/mockData';
import { delay } from '../utils/apiUtils';
import { supabase } from '../supabaseClient'; // Import supabase client

export const confirmJob = async (jobId: string, orgId: string, driverId: string, eta: string): Promise<JobEvent[]> => { // Changed tenantId to orgId
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const events: JobEvent[] = []; // Keep for return type, but actual events go to progress log

  // Add job_confirmed event to job_progress_log
  const { data: confirmedLog, error: confirmedLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      status: 'job_confirmed',
      notes: 'Driver confirmed job.',
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (confirmedLogError) console.error("Error inserting confirmed job log:", confirmedLogError);
  if (confirmedLog) events.push({ ...confirmedLog, event_type: 'job_confirmed' }); // Mock JobEvent for return

  // Add eta_set event to job_progress_log
  const { data: etaLog, error: etaLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      status: 'eta_set',
      notes: `ETA to first collection: ${eta}`,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();
  if (etaLogError) console.error("Error inserting ETA log:", etaLogError);
  if (etaLog) events.push({ ...etaLog, event_type: 'eta_set' }); // Mock JobEvent for return

  // Update job status to 'in_progress' if it was 'assigned'
  if (job.status === 'assigned') {
    job.status = 'accepted'; // Changed to 'accepted'
    const { data: statusChangeLog, error: statusChangeLogError } = await supabase
      .from('job_progress_log')
      .insert({
        org_id: orgId,
        job_id: jobId,
        actor_id: driverId,
        status: 'accepted', // Use 'accepted' as the status for the log
        notes: 'Job status changed to accepted by driver.',
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    if (statusChangeLogError) console.error("Error inserting status change log:", statusChangeLogError);
    if (statusChangeLog) events.push({ ...statusChangeLog, event_type: 'status_changed' }); // Mock JobEvent for return
  }

  return events;
};

export const updateJobStage = async (
  jobId: string,
  orgId: string, // Changed tenantId to orgId
  driverId: string,
  eventType: 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered',
  stopId?: string,
  notes?: string,
  lat?: number,
  lon?: number,
): Promise<JobEvent | undefined> => {
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Update job status based on event type
  if (eventType === 'delivered') {
    job.status = 'delivered';
  } else if (job.status === 'assigned' || job.status === 'planned') {
    job.status = 'accepted'; // Changed to 'accepted'
  }

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      stop_id: stopId,
      actor_id: driverId,
      status: eventType, // Use eventType as the status for the log
      notes: notes,
      lat: lat,
      lon: lon,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting job stage log:", insertError);
    throw new Error(insertError.message);
  }

  // Update driver's last job status
  const driverProfile = mockProfiles.find(p => p.id === driverId);
  if (driverProfile) {
    driverProfile.last_job_status = job.status;
  }

  return { ...newLog, event_type: eventType }; // Mock JobEvent for return
};

export const uploadDocument = async (
  jobId: string,
  orgId: string, // Changed tenantId to orgId
  driverId: string,
  type: 'pod' | 'cmr' | 'damage' | 'check_signature',
  base64Image: string, // In a real app, this would be a file or blob
  stopId?: string,
): Promise<Document> => {
  await delay(1000);
  const storagePath = `/uploads/${type}s/job_${jobId}_${stopId || 'general'}_${new Date().getTime()}.jpg`;

  const newDocument: Document = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
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
      status: type === 'pod' ? 'pod_uploaded' : 'document_uploaded', // Use specific status for log
      notes: `${type.replace(/_/g, ' ')} uploaded.`,
      timestamp: new Date().toISOString(),
    });
  if (progressLogError) console.error("Error inserting document upload log:", progressLogError);

  console.log(`Simulating image upload to ${storagePath}. Base64 length: ${base64Image.length}`);
  return newDocument;
};

export const addJobNote = async (jobId: string, orgId: string, driverId: string, note: string): Promise<JobEvent> => { // Changed tenantId to orgId
  await delay(300);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      status: 'note_added', // Use 'note_added' as the status for the log
      notes: note,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting job note log:", insertError);
    throw new Error(insertError.message);
  }

  return { ...newLog, event_type: 'note_added' }; // Mock JobEvent for return
};

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<JobEvent> => { // Changed tenantId to orgId
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job || job.status !== 'accepted') throw new Error("Job not in progress or not assigned to this driver."); // Changed 'in_progress' to 'accepted'

  // Insert into job_progress_log
  const { data: newLog, error: insertError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: driverId,
      status: 'location_ping', // Use 'location_ping' as the status for the log
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
  const driverProfile = mockProfiles.find(p => p.id === driverId); // Corrected to use mockProfiles
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return { ...newLog, event_type: 'location_ping' }; // Mock JobEvent for return
};

export const registerPushToken = async (profileId: string, orgId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => { // Changed tenantId to orgId
  await delay(300);
  // Check for existing device for this profile and platform
  const existingDeviceIndex = mockProfileDevices.findIndex(
    d => d.profile_id === profileId && d.platform === platform
  );

  const newDevice: ProfileDevice = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
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
  orgId: string, // Changed tenantId to orgId
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
    org_id: orgId, // Changed tenant_id to org_id
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
      org_id: orgId, // Changed tenant_id to org_id
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
      org_id: orgId, // Changed tenant_id to org_id
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