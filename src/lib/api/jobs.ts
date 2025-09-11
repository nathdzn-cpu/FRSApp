import { supabase } from '../supabaseClient';
import { Job, Profile, Document } from '@/utils/mockData';

// Fetch all jobs for the current organization
export const getJobs = async (orgId: string, userRole: 'admin' | 'office' | 'driver' | undefined, startDate?: string, endDate?: string, statusFilter: 'all' | 'active' | 'completed' | 'cancelled' = 'all'): Promise<Job[]> => {
  let query = supabase
    .from('jobs_with_stop_details') // Use the view that includes stop details
    .select('*')
    .eq('org_id', orgId);

  if (userRole === 'driver') {
    query = query.eq('assigned_driver_id', supabase.auth.getUser().then(u => u.data.user?.id));
  }

  if (statusFilter === 'active') {
    query = query.filter('status', 'not.in', '("delivered","pod_received","cancelled")');
  } else if (statusFilter === 'completed') {
    query = query.in('status', ['delivered', 'pod_received']);
  } else if (statusFilter === 'cancelled') {
    query = query.eq('status', 'cancelled');
  }

  if (startDate) {
    query = query.gte('date_created', startDate);
  }
  if (endDate) {
    query = query.lte('date_created', endDate);
  }

  query = query.order('date_created', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching jobs:', error);
    throw new Error(error.message);
  }
  return data as Job[];
};

// Fetch a single job by its order number
export const getJobById = async (orgId: string, orderNumber: string, userRole: 'admin' | 'office' | 'driver' | undefined): Promise<Job | null> => {
  let query = supabase
    .from('jobs_with_stop_details')
    .select('*')
    .eq('org_id', orgId)
    .eq('order_number', orderNumber);

  if (userRole === 'driver') {
    query = query.eq('assigned_driver_id', supabase.auth.getUser().then(u => u.data.user?.id));
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') { // "single()" returns no rows
      return null;
    }
    console.error('Error fetching job by order number:', error);
    throw new Error(error.message);
  }
  return data as Job;
};

// Fetch job stops for a specific job
export const getJobStops = async (orgId: string, jobId: string) => {
  const { data, error } = await supabase
    .from('job_stops')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('seq', { ascending: true });

  if (error) {
    console.error('Error fetching job stops:', error);
    throw new Error(error.message);
  }
  return data;
};

// Fetch documents for a specific job
export const getJobDocuments = async (orgId: string, jobId: string): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching job documents:', error);
    throw new Error(error.message);
  }
  return data as Document[];
};

// Fetch progress logs for a specific job
export const getJobProgressLogs = async (orgId: string, jobId: string) => {
  const { data, error } = await supabase
    .from('job_progress_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('job_id', jobId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching job progress logs:', error);
    throw new Error(error.message);
  }
  return data;
};

// Update job progress
export const updateJobProgress = async (payload: {
  job_id: string;
  org_id: string;
  actor_id: string;
  actor_role: string;
  new_status: string;
  timestamp: string;
  notes?: string;
  lat?: number;
  lon?: number;
  stop_id?: string;
}) => {
  const { data, error } = await supabase.functions.invoke('update-job-progress', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error('Error updating job progress:', error);
    throw new Error(data?.error || error.message);
  }
  return data;
};

// Create a new job
export const createJob = async (
  orgId: string,
  jobData: {
    order_number: string | null;
    status: Job['status'];
    date_created: string;
    price: number | null;
    assigned_driver_id: string | null;
    notes: string | null;
  },
  stopsData: Array<{
    name: string | null;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
    type: 'collection' | 'delivery';
    seq: number;
  }>,
  actorId: string,
  actorRole: 'admin' | 'office' | 'driver'
): Promise<Job> => {
  const payload = {
    jobData,
    stopsData,
    org_id: orgId,
    actor_id: actorId,
    actor_role: actorRole,
  };

  const { data, error } = await supabase.functions.invoke('create-job', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error('Error creating job:', error);
    throw new Error(data?.error || error.message);
  }
  return data as Job;
};

// Update an existing job
export const updateJob = async (payload: {
  job_id: string;
  org_id: string;
  actor_id: string;
  actor_role: 'admin' | 'office' | 'driver';
  job_updates?: Partial<Job>;
  stops_to_add?: Array<any>;
  stops_to_update?: Array<any>;
  stops_to_delete?: Array<string>;
}): Promise<Job> => {
  const { data, error } = await supabase.functions.invoke('update-job', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error('Error updating job:', error);
    throw new Error(data?.error || error.message);
  }
  return data.job as Job;
};

// Request POD (Proof of Delivery)
export const requestPod = async (jobId: string, orgId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<boolean> => {
  const { data, error } = await supabase.rpc('request_pod_and_notify', {
    p_job_id: jobId,
    p_org_id: orgId,
    p_actor_id: actorId,
    p_actor_role: actorRole,
  });

  if (error) {
    console.error('Error requesting POD:', error);
    throw new Error(error.message);
  }
  return data;
};

// Generate Job PDF (mock implementation)
export const generateJobPdf = async (jobId: string, orgId: string, actorId: string): Promise<string> => {
  console.log(`Simulating PDF generation for job ${jobId} in org ${orgId} by actor ${actorId}`);
  // In a real application, this would trigger an Edge Function or a backend service
  // to generate a PDF and return a URL.
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
  return `https://example.com/pdfs/job_${jobId}_report.pdf?token=signed_url_token`;
};

// Clone a job (handled by createJob with default values)
export const cloneJob = async (
  orgId: string,
  jobData: {
    order_number: string | null;
    status: Job['status'];
    date_created: string;
    price: number | null;
    assigned_driver_id: string | null;
    notes: string | null;
  },
  stopsData: Array<any>,
  actorId: string,
  actorRole: 'admin' | 'office' | 'driver'
): Promise<Job> => {
  // This function is essentially a wrapper around createJob with pre-filled data.
  // The actual logic is in the createJob Edge Function.
  return createJob(orgId, jobData, stopsData, actorId, actorRole);
};

// Cancel a job
export const cancelJob = async (jobId: string, orgId: string, actorId: string, actorRole: 'admin' | 'office' | 'driver'): Promise<Job> => {
  const payload = {
    job_id: jobId,
    org_id: orgId,
    actor_id: actorId,
    actor_role: actorRole,
  };
  const { data, error } = await supabase.functions.invoke('cancel-job', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error('Error cancelling job:', error);
    throw new Error(data?.error || error.message);
  }
  return data as Job;
};

// Upload a document and log it
export const uploadDocument = async (
  jobId: string,
  orgId: string,
  actorId: string,
  documentType: 'pod' | 'cmr' | 'damage' | 'check_signature' | 'document_uploaded',
  documentUrl: string,
  actionType: string, // e.g., 'pod_uploaded', 'image_uploaded'
  stopId?: string,
): Promise<any> => {
  const payload = {
    job_id: jobId,
    org_id: orgId,
    actor_id: actorId,
    document_type: documentType,
    document_url: documentUrl,
    action_type: actionType,
    stop_id: stopId,
  };

  const { data, error } = await supabase.functions.invoke('upload-document-and-log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (error) {
    console.error('Error in uploadDocument Edge Function:', error);
    throw new Error(data?.error || error.message);
  }
  return data;
};