import { supabase } from '../supabaseClient';
import { callFn } from '../callFunction';
import { Job, JobStop, JobProgressLog, Document } from '@/types';

type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const getJobs = async (
  orgId: string,
  userRole: 'admin' | 'office' | 'driver',
  startDate?: string,
  endDate?: string,
  statusFilter: JobStatusFilter = 'all'
): Promise<Job[]> => {
  let query = supabase.from('jobs_with_stop_details').select('*').eq('org_id', orgId);

  if (userRole === 'driver') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq('assigned_driver_id', user.id);
    }
  }

  if (startDate) {
    query = query.gte('date_created', startDate);
  }
  if (endDate) {
    query = query.lte('date_created', endDate);
  }

  if (statusFilter === 'active') {
    query = query.not('status', 'in', '("delivered", "pod_received", "cancelled")');
  } else if (statusFilter === 'completed') {
    query = query.in('status', ['delivered', 'pod_received']);
  } else if (statusFilter === 'cancelled') {
    query = query.eq('status', 'cancelled');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
  return data as Job[];
};

export const getJobById = async (orgId: string, orderNumber: string, userRole: 'admin' | 'office' | 'driver'): Promise<Job | null> => {
  let query = supabase.from('jobs_with_stop_details').select('*').eq('org_id', orgId).eq('order_number', orderNumber);

  if (userRole === 'driver') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      query = query.eq('assigned_driver_id', user.id);
    }
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found is not an error
    console.error(`Error fetching job ${orderNumber}:`, error);
    throw error;
  }
  return data as Job;
};

export const getJobStops = async (orgId: string, jobId: string): Promise<JobStop[]> => {
  const { data, error } = await supabase
    .from('job_stops')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('seq', { ascending: true });

  if (error) {
    console.error(`Error fetching stops for job ${jobId}:`, error);
    throw error;
  }
  return data as JobStop[];
};

export const getJobProgressLogs = async (orgId: string, jobId: string): Promise<JobProgressLog[]> => {
  const { data, error } = await supabase
    .from('job_progress_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error(`Error fetching progress logs for job ${jobId}:`, error);
    throw error;
  }
  return data as JobProgressLog[];
};

export const getJobDocuments = async (orgId: string, jobId: string): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching documents for job ${jobId}:`, error);
    throw error;
  }
  return data as Document[];
};

export const createJob = async (orgId: string, jobData: any, stopsData: any[], actorId: string, actorRole: string) => {
  const payload = {
    org_id: orgId,
    actor_id: actorId,
    actor_role: actorRole,
    job_data: jobData,
    stops_data: stopsData,
  };
  return await callFn('create-job', payload);
};

export const updateJob = async (payload: any) => {
  return await callFn('update-job', payload);
};

export const cancelJob = async (jobId: string, orgId: string, actorId: string, actorRole: string) => {
  return await callFn('cancel-job', { job_id: jobId, org_id: orgId, actor_id: actorId, actor_role: actorRole });
};

export const updateJobProgress = async (payload: any) => {
  return await callFn('update-job-progress', payload);
};

export const updateJobProgressLogVisibility = async (payload: any) => {
  return await callFn('update-timeline-visibility', payload);
};

export const requestPod = async (jobId: string, orgId: string, actorId: string, userRole: string) => {
  // This function would typically trigger a notification to the driver.
  // Assuming an edge function 'request-pod' handles this logic.
  return await callFn('request-pod', { jobId, orgId, actorId, userRole });
};

export const generateJobPdf = async (jobId: string, orgId: string, actorId: string) => {
  // Assuming an edge function 'generate-job-pdf' handles this.
  return await callFn('generate-job-pdf', { jobId, orgId, actorId });
};

export const cloneJob = async (originalJobId: string, orgId: string, actorId: string, actorRole: string) => {
  // This can be handled client-side by fetching job/stops and calling createJob,
  // or by a dedicated edge function.
  return await callFn('clone-job', { originalJobId, orgId, actorId, actorRole });
};