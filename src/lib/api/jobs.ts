import { supabase } from '../supabaseClient';
import { Job, JobStop, Document, JobProgressLog } from '@/utils/mockData'; // Removed JobEvent
import { callFn } from '../callFunction'; // Import callFn

export const getJobs = async (orgId: string, role: 'admin' | 'office' | 'driver', startDate?: string, endDate?: string): Promise<Job[]> => {
  let query = supabase
    .from('jobs_with_stop_details') // Query the new view
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Apply date filters based on created_at
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching jobs:", error);
    throw new Error(error.message);
  }

  return data as Job[];
};

export const getJobById = async (orgId: string, jobId: string, role: 'admin' | 'office' | 'driver'): Promise<Job | undefined> => {
  let query = supabase
    .from('jobs_with_stop_details') // Query the new view
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .single();

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching job by ID:", error);
    throw new Error(error.message);
  }

  if (!data) return undefined;

  return data as Job;
};

export const getJobStops = async (orgId: string, jobId: string): Promise<JobStop[]> => {
  const { data, error } = await supabase
    .from('job_stops')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId)
    .order('seq', { ascending: true });

  if (error) {
    console.error("Error fetching job stops:", error);
    throw new Error(error.message);
  }
  return data as JobStop[];
};

// getJobEvents is removed as JobProgressLog will now be the unified timeline source.
// export const getJobEvents = async (orgId: string, jobId: string): Promise<JobEvent[]> => { ... }

export const getJobDocuments = async (orgId: string, jobId: string): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching job documents:", error);
    throw new Error(error.message);
  }
  return data as Document[];
};

export const getJobProgressLogs = async (orgId: string, jobId: string): Promise<JobProgressLog[]> => {
  const { data, error } = await supabase
    .from('job_progress_log')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Error fetching job progress logs:", error);
    throw new Error(error.message);
  }
  return data as JobProgressLog[];
};

interface CreateJobPayload {
  jobData: Omit<Job, 'id' | 'org_id' | 'created_at' | 'deleted_at' | 'order_number' | 'collection_name' | 'collection_city' | 'delivery_name' | 'delivery_city' | 'last_status_update_at'> & { order_number?: string | null };
  stopsData: Omit<JobStop, 'id' | 'org_id' | 'job_id' | 'created_at'>[];
  org_id: string;
  actor_id: string;
}

export const createJob = async (
  orgId: string,
  jobData: Omit<Job, 'id' | 'org_id' | 'created_at' | 'deleted_at' | 'order_number' | 'collection_name' | 'collection_city' | 'delivery_name' | 'delivery_city' | 'last_status_update_at'> & { order_number?: string | null },
  stopsData: Omit<JobStop, 'id' | 'org_id' | 'job_id' | 'created_at'>[],
  actorId: string
): Promise<Job> => {
  const payload: CreateJobPayload = {
    jobData: {
      order_number: jobData.order_number, // Pass order_number
      status: jobData.status,
      date_created: jobData.date_created,
      price: jobData.price,
      assigned_driver_id: jobData.assigned_driver_id,
      notes: jobData.notes,
    },
    stopsData,
    org_id: orgId,
    actor_id: actorId,
  };

  const result = await callFn<Job>('create-job', payload);
  return result;
};

interface UpdateJobPayload {
  job_id: string;
  org_id: string;
  actor_id: string;
  job_updates?: Partial<Omit<Job, 'id' | 'org_id' | 'created_at' | 'deleted_at' | 'collection_name' | 'collection_city' | 'delivery_name' | 'delivery_city'>>;
  stops_to_add?: Omit<JobStop, 'id' | 'org_id' | 'job_id' | 'created_at'>[];
  stops_to_update?: Partial<Omit<JobStop, 'org_id' | 'job_id' | 'created_at'>>[]; // Must include 'id'
  stops_to_delete?: string[]; // Array of stop IDs
}

export const updateJob = async (payload: UpdateJobPayload): Promise<Job> => {
  const result = await callFn<Job>('update-job', payload);
  return result;
};

interface UpdateJobProgressPayload {
  job_id: string;
  org_id: string;
  actor_id: string;
  new_status: Job['status']; // This is the job's overall status
  timestamp: string;
  notes?: string;
}

export const updateJobProgress = async (payload: UpdateJobProgressPayload): Promise<{ job: Job; log: JobProgressLog }> => {
  const result = await callFn<{ job: Job; log: JobProgressLog }>('update-job-progress', payload);
  return result;
};

export const requestPod = async (jobId: string, orgId: string, actorId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('job_progress_log') // Insert into job_progress_log
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: actorId,
      status: 'pod_requested', // Use 'pod_requested' as the status for the log
      notes: 'POD requested by office.',
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error("Error requesting POD:", error);
    throw new Error(error.message);
  }
  return true;
};

export const generateJobPdf = async (jobId: string, orgId: string, actorId: string): Promise<string | undefined> => {
  // This would typically call an Edge Function that generates and stores the PDF.
  // For now, return a placeholder URL.
  console.log(`Simulating generate_job_pdf for job ${jobId}`);
  const mockPdfUrl = `https://example.com/pdfs/job_${jobId}_report.pdf?token=signed_url_token`;
  return mockPdfUrl;
};

export const cloneJob = async (jobId: string, orgId: string, actorId: string): Promise<Job | undefined> => {
  const { data: originalJob, error: jobError } = await supabase
    .from('jobs_with_stop_details') // Query the view
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .single();

  if (jobError || !originalJob) {
    console.error("Error fetching original job for cloning:", jobError);
    throw new Error(jobError?.message || "Original job not found.");
  }

  const { data: originalStops, error: stopsError } = await supabase
    .from('job_stops')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId);

  if (stopsError) {
    console.error("Error fetching original stops for cloning:", stopsError);
    throw new Error(stopsError.message);
  }

  // Do not generate new order_number here, let the trigger handle it for the new job
  const newJob: Omit<Job, 'id' | 'created_at' | 'order_number' | 'collection_name' | 'collection_city' | 'delivery_name' | 'delivery_city' | 'last_status_update_at'> & { order_number?: string | null } = {
    org_id: orgId,
    order_number: null, // Let trigger generate
    status: 'planned',
    date_created: originalJob.date_created,
    price: originalJob.price,
    assigned_driver_id: originalJob.assigned_driver_id,
    notes: originalJob.notes,
    deleted_at: null,
    last_status_update_at: new Date().toISOString(), // Set initial status update time
  };

  const { data: clonedJobData, error: cloneJobError } = await supabase
    .from('jobs')
    .insert(newJob)
    .select()
    .single();

  if (cloneJobError || !clonedJobData) {
    console.error("Error cloning job:", cloneJobError);
    throw new Error(cloneJobError?.message || "Failed to clone job.");
  }

  const newStops = originalStops.map(stop => ({
    org_id: orgId,
    job_id: clonedJobData.id,
    seq: stop.seq,
    type: stop.type,
    name: stop.name,
    address_line1: stop.address_line1,
    address_line2: stop.address_line2,
    city: stop.city,
    postcode: stop.postcode,
    window_from: stop.window_from,
    window_to: stop.window_to,
    notes: stop.notes,
  }));

  if (newStops.length > 0) {
    const { error: insertStopsError } = await supabase
      .from('job_stops')
      .insert(newStops);

    if (insertStopsError) {
      console.error("Error inserting cloned stops:", insertStopsError);
      throw new Error(insertStopsError.message);
    }
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: actorId,
    entity: "jobs",
    entity_id: clonedJobData.id,
    action: "create",
    notes: `Cloned from job ${jobId}`,
    after: clonedJobData,
  });
  if (auditError) {
    console.error("DEBUG: audit insert failed", auditError.message);
  }

  return clonedJobData as Job;
};

export const cancelJob = async (jobId: string, orgId: string, actorId: string): Promise<Job | undefined> => {
  const { data: oldJob, error: fetchError } = await supabase
    .from('jobs_with_stop_details') // Query the view
    .select('status')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !oldJob) {
    console.error("Error fetching job for cancellation:", fetchError);
    throw new Error(fetchError?.message || "Job not found.");
  }

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString(), last_status_update_at: new Date().toISOString() }) // Soft delete on cancel
    .eq('id', jobId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling job:", error);
    throw new Error(error.message);
  }

  // Insert into job_progress_log for cancellation
  const { error: progressLogError } = await supabase
    .from('job_progress_log')
    .insert({
      org_id: orgId,
      job_id: jobId,
      actor_id: actorId,
      status: 'cancelled',
      notes: 'Job cancelled by office.',
      timestamp: new Date().toISOString(),
    });
  if (progressLogError) {
    console.error("DEBUG: progress log insert failed for cancel job", progressLogError.message);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: actorId,
    entity: "jobs",
    entity_id: jobId,
    action: "cancel",
    before: { status: oldJob.status },
    after: { status: 'cancelled', deleted_at: data.deleted_at },
  });
  if (auditError) {
    console.error("DEBUG: audit insert failed", auditError.message);
  }

  return data as Job;
};