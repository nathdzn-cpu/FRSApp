import { mockJobs, mockJobStops, mockJobEvents, mockDocuments, Job, JobStop, JobEvent, Document } from '@/utils/mockData';
import { delay } from '../utils/apiUtils';

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