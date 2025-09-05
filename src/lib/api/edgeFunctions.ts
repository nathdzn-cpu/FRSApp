import { v4 as uuidv4 } from 'uuid';
import { mockJobs, mockJobEvents, mockAuditLogs, mockJobStops, mockProfileDevices, Job } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

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