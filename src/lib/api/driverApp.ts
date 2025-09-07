import { v4 as uuidv4 } from 'uuid';
import {
  mockJobs,
  mockJobEvents,
  mockDocuments,
  mockProfileDevices,
  mockDailyChecks,
  mockProfiles,
  JobEvent,
  Document,
  ProfileDevice,
  DailyCheck,
} from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

export const confirmJob = async (jobId: string, orgId: string, driverId: string, eta: string): Promise<JobEvent[]> => { // Changed tenantId to orgId
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const events: JobEvent[] = [];

  // Add job_confirmed event
  const confirmedEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    actor_id: driverId,
    event_type: 'job_confirmed',
    notes: 'Driver confirmed job.',
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(confirmedEvent);
  events.push(confirmedEvent);

  // Add eta_set event
  const etaEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    actor_id: driverId,
    event_type: 'eta_set',
    notes: `ETA to first collection: ${eta}`,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(etaEvent);
  events.push(etaEvent);

  // Update job status to 'in_progress' if it was 'assigned'
  if (job.status === 'assigned') {
    job.status = 'in_progress';
    mockJobEvents.push({
      id: uuidv4(),
      org_id: orgId, // Changed tenant_id to org_id
      job_id: jobId,
      actor_id: driverId,
      event_type: 'status_changed',
      notes: 'Job status changed to in_progress by driver.',
      created_at: new Date().toISOString(),
    });
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
    job.status = 'in_progress';
  }

  const newEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    stop_id: stopId,
    actor_id: driverId,
    event_type: eventType,
    notes: notes,
    lat: lat,
    lon: lon,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);

  // Update driver's last job status
  const driverProfile = mockProfiles.find(p => p.id === driverId);
  if (driverProfile) {
    driverProfile.last_job_status = job.status;
  }

  return newEvent;
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

  // Add a job event for document upload
  mockJobEvents.push({
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    stop_id: stopId,
    actor_id: driverId,
    event_type: type === 'pod' ? 'pod_uploaded' : 'note_added', // Generic for other types
    notes: `${type.replace(/_/g, ' ')} uploaded.`,
    created_at: new Date().toISOString(),
  });

  console.log(`Simulating image upload to ${storagePath}. Base64 length: ${base64Image.length}`);
  return newDocument;
};

export const addJobNote = async (jobId: string, orgId: string, driverId: string, note: string): Promise<JobEvent> => { // Changed tenantId to orgId
  await delay(300);
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    actor_id: driverId,
    event_type: 'note_added',
    notes: note,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);
  return newEvent;
};

export const recordLocationPing = async (jobId: string, orgId: string, driverId: string, lat: number, lon: number): Promise<JobEvent> => { // Changed tenantId to orgId
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.org_id === orgId && j.assigned_driver_id === driverId); // Changed j.tenant_id to j.org_id
  if (!job || job.status !== 'in_progress') throw new Error("Job not in progress or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    org_id: orgId, // Changed tenant_id to org_id
    job_id: jobId,
    actor_id: driverId,
    event_type: 'location_ping',
    lat: lat,
    lon: lon,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);

  // Update driver's last location
  const driverProfile = mockProfiles.find(p => p.id === driverId); // Corrected to use mockProfiles
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newEvent;
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