import { supabase } from '../supabaseClient';
import { Job, Profile, Document } from '@/utils/mockData';

// Fetch all jobs for the current organization
export const getJobs = async (orgId: string): Promise<Job[]> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('Error fetching jobs:', error);
    throw new Error(error.message);
  }
  return data as Job[];
};

// Fetch all profiles for the current organization
export const getProfiles = async (orgId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error(error.message);
  }
  return data as Profile[];
};

// Fetch a single job by its order number
export const getJobByOrderNumber = async (orgId: string, orderNumber: string): Promise<Job | null> => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId)
    .eq('order_number', orderNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // "single()" returns no rows
      return null;
    }
    console.error('Error fetching job by order number:', error);
    throw new Error(error.message);
  }
  return data as Job;
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
  const { data, error } = await supabase.rpc('update_job_status_and_log', {
    p_job_id: payload.job_id,
    p_org_id: payload.org_id,
    p_new_status: payload.new_status,
    p_actor_id: payload.actor_id,
    p_actor_role: payload.actor_role,
    p_timestamp: payload.timestamp,
    p_notes: payload.notes,
    p_lat: payload.lat,
    p_lon: payload.lon,
    p_stop_id: payload.stop_id,
  });

  if (error) {
    console.error('Error updating job progress:', error);
    throw new Error(error.message);
  }
  return data;
};

// Upload a document and log it
export const uploadDocument = async (
  jobId: string,
  orgId: string,
  actorId: string,
  documentType: string,
  documentUrl: string,
  actionType: string,
  stopId?: string
) => {
  const { data, error } = await supabase.rpc('upload_document_and_log', {
    p_job_id: jobId,
    p_org_id: orgId,
    p_actor_id: actorId,
    p_document_type: documentType,
    p_document_url: documentUrl,
    p_action_type: actionType,
    p_stop_id: stopId,
  });

  if (error) {
    console.error('Error in uploadDocument RPC:', error);
    throw new Error(error.message);
  }
  return data;
};

// Update visibility of a progress log event
export const updateJobProgressLogVisibility = async (payload: {
  log_id: string;
  org_id: string;
  actor_id: string;
  actor_role: string;
  visible_in_timeline: boolean;
}) => {
  const { data, error } = await supabase.rpc('update_log_visibility_and_audit', {
    p_log_id: payload.log_id,
    p_org_id: payload.org_id,
    p_actor_id: payload.actor_id,
    p_actor_role: payload.actor_role,
    p_visible: payload.visible_in_timeline,
  });

  if (error) {
    console.error('Error updating log visibility:', error);
    throw new Error(error.message);
  }
  return data;
};

// Cancel a job
export const cancelJob = async (payload: {
  job_id: string;
  org_id: string;
  actor_id: string;
  actor_role: string;
  actor_name: string;
}) => {
  const { data, error } = await supabase.rpc('cancel_job_and_log', {
    p_job_id: payload.job_id,
    p_org_id: payload.org_id,
    p_actor_id: payload.actor_id,
    p_actor_role: payload.actor_role,
    p_actor_name: payload.actor_name,
  });

  if (error) {
    console.error('Error cancelling job:', error);
    throw new Error(error.message);
  }
  return data;
};