import { createClient } from '@supabase/supabase-js';
import {
  mockJobs,
  mockProfiles,
  mockJobStops,
  mockJobEvents,
  mockDocuments,
  mockDailyChecklists,
  mockAuditLogs,
  mockProfileDevices, 
  mockDailyChecks,    
  Job,
  Profile,
  JobStop,
  JobEvent,
  Document,
  DailyChecklist,
  AuditLog,
  Tenant,
  mockTenants,
  ProfileDevice, 
  DailyCheck,    
} from '@/utils/mockData';
import { v4 as uuidv4 } from 'uuid'; 

const supabaseUrl = 'https://hrastslmlkkfwsdsbbcn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // Using VITE_ prefix for Vite environment variables

if (!supabaseKey) {
  console.error("SUPABASE_KEY is not set in environment variables. Please create a .env.local file.");
  // You might want to render a friendly message in the UI or handle this more gracefully
  // For now, we'll proceed, but operations requiring auth will fail.
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'YOUR_ANON_KEY_HERE'); // Fallback for development if key is missing

// --- Mock Supabase Data Fetching Functions ---
// These functions simulate fetching data from Supabase, using client-side mock data.
// In a real application, these would make actual API calls to Supabase.

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getTenants = async (): Promise<Tenant[]> => {
  await delay(200);
  return mockTenants;
};

export const getProfiles = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

export const getJobs = async (tenantId: string, role: 'admin' | 'office' | 'driver', driverId?: string): Promise<Job[]> => {
  await delay(300);
  let jobs = mockJobs.filter(job => job.tenant_id === tenantId);

  if (role === 'driver' && driverId) {
    jobs = jobs.filter(job => job.assigned_driver_id === driverId);
    // Simulate RLS: remove price for drivers
    return jobs.map(({ price, ...rest }) => rest as Job);
  }
  return jobs;
};

export const getJobById = async (tenantId: string, jobId: string, role: 'admin' | 'office' | 'driver', driverId?: string): Promise<Job | undefined> => {
  await delay(300);
  let job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId);

  if (job && role === 'driver' && driverId && job.assigned_driver_id !== driverId) {
    return undefined; // Driver can only see their assigned jobs
  }

  if (job && role === 'driver') {
    // Simulate RLS: remove price for drivers
    const { price, ...rest } = job;
    return rest as Job;
  }
  return job;
};

export const getJobStops = async (tenantId: string, jobId: string): Promise<JobStop[]> => {
  await delay(200);
  return mockJobStops.filter(stop => stop.tenant_id === tenantId && stop.job_id === jobId);
};

export const getJobEvents = async (tenantId: string, jobId: string): Promise<JobEvent[]> => {
  await delay(200);
  return mockJobEvents.filter(event => event.tenant_id === tenantId && event.job_id === jobId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const getJobDocuments = async (tenantId: string, jobId: string): Promise<Document[]> => {
  await delay(200);
  return mockDocuments.filter(doc => doc.tenant_id === tenantId && doc.job_id === jobId);
};

export const getDailyChecklists = async (tenantId: string): Promise<DailyChecklist[]> => {
  await delay(200);
  return mockDailyChecklists.filter(cl => cl.tenant_id === tenantId);
};

export const updateDailyChecklist = async (tenantId: string, checklistId: string, items: DailyChecklist['items'], actorId: string): Promise<DailyChecklist | undefined> => {
  await delay(500);
  const checklistIndex = mockDailyChecklists.findIndex(cl => cl.id === checklistId && cl.tenant_id === tenantId);
  if (checklistIndex > -1) {
    const oldChecklist = { ...mockDailyChecklists[checklistIndex] };
    mockDailyChecklists[checklistIndex] = { ...oldChecklist, items, created_at: new Date().toISOString() }; // Update created_at for simplicity
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'daily_checklists',
      entity_id: checklistId,
      action: 'update',
      before: { items: oldChecklist.items },
      after: { items: items },
      created_at: new Date().toISOString(),
    });
    return mockDailyChecklists[checklistIndex];
  }
  return undefined;
};

export const getUsersForAdmin = async (tenantId: string): Promise<Profile[]> => {
  await delay(200);
  return mockProfiles.filter(p => p.tenant_id === tenantId);
};

export const createUser = async (tenantId: string, userData: Omit<Profile, 'id' | 'created_at' | 'tenant_id'>, actorId: string): Promise<Profile> => {
  await delay(500);
  const newUser: Profile = {
    id: uuidv4(),
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    ...userData,
  };
  mockProfiles.push(newUser);
  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'profiles',
    entity_id: newUser.id,
    action: 'create',
    after: newUser,
    created_at: new Date().toISOString(),
  });
  return newUser;
};

export const updateUser = async (tenantId: string, profileId: string, updates: Partial<Profile>, actorId: string): Promise<Profile | undefined> => {
  await delay(500);
  const profileIndex = mockProfiles.findIndex(p => p.id === profileId && p.tenant_id === tenantId);
  if (profileIndex > -1) {
    const oldProfile = { ...mockProfiles[profileIndex] };
    mockProfiles[profileIndex] = { ...oldProfile, ...updates };
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'profiles',
      entity_id: profileId,
      action: 'update',
      before: oldProfile,
      after: mockProfiles[profileIndex],
      created_at: new Date().toISOString(),
    });
    return mockProfiles[profileIndex];
  }
  return undefined;
};

// --- New Driver App Supporting Functions ---

export const confirmJob = async (jobId: string, tenantId: string, driverId: string, eta: string): Promise<JobEvent[]> => {
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const events: JobEvent[] = [];

  // Add job_confirmed event
  const confirmedEvent: JobEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
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
    tenant_id: tenantId,
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
      tenant_id: tenantId,
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
  tenantId: string,
  driverId: string,
  eventType: 'at_collection' | 'departed_collection' | 'at_delivery' | 'delivered',
  stopId?: string,
  notes?: string,
  lat?: number,
  lon?: number,
): Promise<JobEvent | undefined> => {
  await delay(500);
  const job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  // Update job status based on event type
  if (eventType === 'delivered') {
    job.status = 'delivered';
  } else if (job.status === 'assigned' || job.status === 'planned') {
    job.status = 'in_progress';
  }

  const newEvent: JobEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
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
  tenantId: string,
  driverId: string,
  type: 'pod' | 'cmr' | 'damage' | 'check_signature',
  base64Image: string, // In a real app, this would be a file or blob
  stopId?: string,
): Promise<Document> => {
  await delay(1000);
  const storagePath = `/uploads/${type}s/job_${jobId}_${stopId || 'general'}_${new Date().getTime()}.jpg`;

  const newDocument: Document = {
    id: uuidv4(),
    tenant_id: tenantId,
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
    tenant_id: tenantId,
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

export const addJobNote = async (jobId: string, tenantId: string, driverId: string, note: string): Promise<JobEvent> => {
  await delay(300);
  const job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId && j.assigned_driver_id === driverId);
  if (!job) throw new Error("Job not found or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
    job_id: jobId,
    actor_id: driverId,
    event_type: 'note_added',
    notes: note,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);
  return newEvent;
};

export const recordLocationPing = async (jobId: string, tenantId: string, driverId: string, lat: number, lon: number): Promise<JobEvent> => {
  await delay(100); // Very quick for frequent pings
  const job = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId && j.assigned_driver_id === driverId);
  if (!job || job.status !== 'in_progress') throw new Error("Job not in progress or not assigned to this driver.");

  const newEvent: JobEvent = {
    id: uuidv4(),
    tenant_id: tenantId,
    job_id: jobId,
    actor_id: driverId,
    event_type: 'location_ping',
    lat: lat,
    lon: lon,
    created_at: new Date().toISOString(),
  };
  mockJobEvents.push(newEvent);

  // Update driver's last location
  const driverProfile = mockProfiles.find(p => p.id === driverId);
  if (driverProfile) {
    driverProfile.last_location = { lat, lon, timestamp: new Date().toISOString() };
  }

  return newEvent;
};

export const registerPushToken = async (profileId: string, tenantId: string, platform: 'ios' | 'android', expoPushToken: string): Promise<ProfileDevice> => {
  await delay(300);
  // Check for existing device for this profile and platform
  const existingDeviceIndex = mockProfileDevices.findIndex(
    d => d.profile_id === profileId && d.platform === platform
  );

  const newDevice: ProfileDevice = {
    id: uuidv4(),
    tenant_id: tenantId,
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
  tenantId: string,
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
    tenant_id: tenantId,
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
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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

// --- Edge Function Simulations (Client-side) ---
// These functions simulate calling Supabase Edge Functions.
// In a real application, these would make actual HTTP calls to your Edge Functions.

export const requestPod = async (jobId: string, tenantId: string, actorId: string): Promise<boolean> => {
  await delay(1000);
  console.log(`Simulating request_pod for job ${jobId}`);
  // Simulate inserting job_event
  mockJobEvents.push({
    id: uuidv4(),
    tenant_id: tenantId,
    job_id: jobId,
    actor_id: actorId,
    event_type: 'pod_requested',
    notes: 'POD requested by office.',
    created_at: new Date().toISOString(),
  });
  // Simulate sending push notification
  const job = mockJobs.find(j => j.id === jobId);
  if (job?.assigned_driver_id) {
    const driverDevices = mockProfileDevices.filter(d => d.profile_id === job.assigned_driver_id);
    if (driverDevices.length > 0) {
      console.log(`Simulating Expo push notification to driver ${job.assigned_driver_id} for job ${jobId}. Tokens: ${driverDevices.map(d => d.expo_push_token).join(', ')}`);
      // In a real app, this would call an Expo Push API or similar.
    } else {
      console.log(`No registered devices for driver ${job.assigned_driver_id}.`);
    }
  } else {
    console.log(`Job ${jobId} not assigned to a driver, cannot send POD request notification.`);
  }
  return true;
};

export const generateJobPdf = async (jobId: string, tenantId: string, actorId: string): Promise<string | undefined> => {
  await delay(2000);
  console.log(`Simulating generate_job_pdf for job ${jobId}`);
  // In a real scenario, this would call an Edge Function that generates and stores the PDF.
  // For now, return a placeholder URL.
  const mockPdfUrl = `https://example.com/pdfs/job_${jobId}_report.pdf?token=signed_url_token`;
  // Simulate storing in Storage and returning signed URL
  return mockPdfUrl;
};

export const cloneJob = async (jobId: string, tenantId: string, actorId: string): Promise<Job | undefined> => {
  await delay(1000);
  const originalJob = mockJobs.find(j => j.id === jobId && j.tenant_id === tenantId);
  if (!originalJob) return undefined;

  const newJobId = uuidv4();
  const clonedJob: Job = {
    ...originalJob,
    id: newJobId,
    ref: `${originalJob.ref}-CLONE-${Math.floor(Math.random() * 100)}`,
    status: 'planned',
    scheduled_date: new Date().toISOString().split('T')[0], // Set to today
    created_by: actorId,
    assigned_driver_id: undefined,
    created_at: new Date().toISOString(),
  };
  mockJobs.push(clonedJob);

  // Clone stops
  const originalStops = mockJobStops.filter(s => s.job_id === jobId);
  originalStops.forEach(stop => {
    mockJobStops.push({
      ...stop,
      id: uuidv4(),
      job_id: newJobId,
    });
  });

  mockAuditLogs.push({
    id: uuidv4(),
    tenant_id: tenantId,
    actor_id: actorId,
    entity: 'jobs',
    entity_id: newJobId,
    action: 'create',
    notes: `Cloned from job ${jobId}`,
    after: clonedJob,
    created_at: new Date().toISOString(),
  });

  return clonedJob;
};

export const cancelJob = async (jobId: string, tenantId: string, actorId: string): Promise<Job | undefined> => {
  await delay(500);
  const jobIndex = mockJobs.findIndex(j => j.id === jobId && j.tenant_id === tenantId);
  if (jobIndex > -1) {
    const oldJob = { ...mockJobs[jobIndex] };
    mockJobs[jobIndex] = { ...oldJob, status: 'cancelled', created_at: new Date().toISOString() };
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'jobs',
      entity_id: jobId,
      action: 'cancel',
      before: { status: oldJob.status },
      after: { status: 'cancelled' },
      created_at: new Date().toISOString(),
    });
    return mockJobs[jobIndex];
  }
  return undefined;
};

export const assignDriverToJob = async (jobId: string, tenantId: string, driverId: string, actorId: string): Promise<Job | undefined> => {
  await delay(500);
  const jobIndex = mockJobs.findIndex(j => j.id === jobId && j.tenant_id === tenantId);
  if (jobIndex > -1) {
    const oldJob = { ...mockJobs[jobIndex] };
    mockJobs[jobIndex] = { ...oldJob, assigned_driver_id: driverId, status: 'assigned', created_at: new Date().toISOString() };
    mockAuditLogs.push({
      id: uuidv4(),
      tenant_id: tenantId,
      actor_id: actorId,
      entity: 'jobs',
      entity_id: jobId,
      action: 'update',
      before: { assigned_driver_id: oldJob.assigned_driver_id, status: oldJob.status },
      after: { assigned_driver_id: driverId, status: 'assigned' },
      created_at: new Date().toISOString(),
    });
    return mockJobs[jobIndex];
  }
  return undefined;
};