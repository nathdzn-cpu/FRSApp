import { supabase } from '../supabaseClient';
import { Job, JobStop, JobEvent, Document } from '@/utils/mockData';
import { callFn } from '../callFunction'; // Import callFn

export const getJobs = async (orgId: string, role: 'admin' | 'office' | 'driver', driverId?: string, startDate?: string, endDate?: string): Promise<Job[]> => {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null) // Filter out soft-deleted jobs
    .order('created_at', { ascending: false });
    // Removed .limit(50) as per request

  if (role === 'driver' && driverId) {
    query = query.eq('assigned_driver_id', driverId);
  }

  // Apply date filters
  if (startDate) {
    query = query.gte('scheduled_date', startDate.split('T')[0]); // Compare only date part
  }
  if (endDate) {
    query = query.lte('scheduled_date', endDate.split('T')[0]); // Compare only date part
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching jobs:", error);
    throw new Error(error.message);
  }

  // Simulate RLS for price if role is driver (though RLS should handle this on DB)
  if (role === 'driver') {
    return (data as Job[]).map(({ price, ...rest }) => ({ ...rest, price: null } as Job));
  }

  return data as Job[];
};

export const getJobById = async (orgId: string, jobId: string, role: 'admin' | 'office' | 'driver', driverId?: string): Promise<Job | undefined> => {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null) // Ensure not soft-deleted
    .single();

  if (role === 'driver' && driverId) {
    query = query.eq('assigned_driver_id', driverId);
  }

  const { data, error } = await query;

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching job by ID:", error);
    throw new Error(error.message);
  }

  if (!data) return undefined;

  // Simulate RLS for price if role is driver (though RLS should handle this on DB)
  if (role === 'driver') {
    const { price, ...rest } = data;
    return { ...rest, price: null } as Job;
  }

  return data as Job;
};

export const getJobStops = async (orgId: string, jobId: string): Promise<JobStop[]> => {
  const { data, error } = await supabase
    .from('job_stops')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .order('seq', { ascending: true });

  if (error) {
    console.error("Error fetching job stops:", error);
    throw new Error(error.message);
  }
  return data as JobStop[];
};

export const getJobEvents = async (orgId: string, jobId: string): Promise<JobEvent[]> => {
  const { data, error } = await supabase
    .from('job_events')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching job events:", error);
    throw new Error(error.message);
  }
  return data as JobEvent[];
};

export const getJobDocuments = async (orgId: string, jobId: string): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('job_id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching job documents:", error);
    throw new Error(error.message);
  }
  return data as Document[];
};

interface CreateJobPayload {
  jobData: Omit<Job, 'id' | 'org_id' | 'created_at' | 'created_by' | 'status'> & { status?: Job['status']; };
  stopsData: Omit<JobStop, 'id' | 'org_id' | 'job_id'>[];
  org_id: string; // Changed from tenant_id
  actor_id: string;
}

export const createJob = async (
  orgId: string, // Changed from tenantId
  jobData: Omit<Job, 'id' | 'org_id' | 'created_at' | 'status' | 'created_by'> & { status?: Job['status']; created_by: string; },
  stopsData: Omit<JobStop, 'id' | 'org_id' | 'job_id'>[],
  actorId: string
): Promise<Job> => {
  const payload: CreateJobPayload = {
    jobData: {
      ref: jobData.ref,
      price: jobData.price,
      scheduled_date: jobData.scheduled_date,
      notes: jobData.notes,
      assigned_driver_id: jobData.assigned_driver_id,
      status: jobData.status,
      created_by: actorId, // Ensure created_by is passed
    },
    stopsData,
    org_id: orgId, // Changed from tenant_id
    actor_id: actorId,
  };

  const result = await callFn<Job>('create-job', payload);
  return result;
};

export const requestPod = async (jobId: string, orgId: string, actorId: string): Promise<boolean> => { // Changed from tenantId
  const { data, error } = await supabase
    .from('job_events')
    .insert({
      org_id: orgId, // Changed from tenant_id
      job_id: jobId,
      actor_id: actorId,
      event_type: 'pod_requested',
      notes: 'POD requested by office.',
    });

  if (error) {
    console.error("Error requesting POD:", error);
    throw new Error(error.message);
  }
  return true;
};

export const generateJobPdf = async (jobId: string, orgId: string, actorId: string): Promise<string | undefined> => { // Changed from tenantId
  // This would typically call an Edge Function that generates and stores the PDF.
  // For now, return a placeholder URL.
  console.log(`Simulating generate_job_pdf for job ${jobId}`);
  const mockPdfUrl = `https://example.com/pdfs/job_${jobId}_report.pdf?token=signed_url_token`;
  return mockPdfUrl;
};

export const cloneJob = async (jobId: string, orgId: string, actorId: string): Promise<Job | undefined> => { // Changed from tenantId
  const { data: originalJob, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
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
    .eq('org_id', orgId); // Changed from tenant_id

  if (stopsError) {
    console.error("Error fetching original stops for cloning:", stopsError);
    throw new Error(stopsError.message);
  }

  const newJobRef = `${originalJob.ref}-CLONE-${Math.floor(Math.random() * 100)}`;
  const newJob: Omit<Job, 'id' | 'created_at'> = {
    org_id: orgId, // Changed from tenant_id
    ref: newJobRef,
    price: originalJob.price,
    status: 'planned',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: originalJob.notes,
    created_by: actorId,
    assigned_driver_id: null,
    deleted_at: null,
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
    org_id: orgId, // Changed from tenant_id
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
      // Consider rolling back job creation here if this is critical
      throw new Error(insertStopsError.message);
    }
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId, // Changed from tenant_id
    actor_id: actorId,
    entity: "jobs",
    entity_id: clonedJobData.id,
    action: "create",
    notes: `Cloned from job ${jobId}`,
    after: clonedJobData,
  }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

  return clonedJobData as Job;
};

export const cancelJob = async (jobId: string, orgId: string, actorId: string): Promise<Job | undefined> => { // Changed from tenantId
  const { data: oldJob, error: fetchError } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null)
    .single();

  if (fetchError || !oldJob) {
    console.error("Error fetching job for cancellation:", fetchError);
    throw new Error(fetchError?.message || "Job not found.");
  }

  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString() }) // Soft delete on cancel
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling job:", error);
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId, // Changed from tenant_id
    actor_id: actorId,
    entity: "jobs",
    entity_id: jobId,
    action: "cancel",
    before: { status: oldJob.status },
    after: { status: 'cancelled', deleted_at: data.deleted_at },
  }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

  return data as Job;
};

export const assignDriverToJob = async (jobId: string, orgId: string, driverId: string, actorId: string): Promise<Job | undefined> => { // Changed from tenantId
  const { data: oldJob, error: fetchError } = await supabase
    .from('jobs')
    .select('assigned_driver_id, status')
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null)
    .single();

  if (fetchError || !oldJob) {
    console.error("Error fetching job for assignment:", fetchError);
    throw new Error(fetchError?.message || "Job not found.");
  }

  const { data, error } = await supabase
    .from('jobs')
    .update({ assigned_driver_id: driverId, status: 'assigned' })
    .eq('id', jobId)
    .eq('org_id', orgId) // Changed from tenant_id
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error("Error assigning driver to job:", error);
    throw new Error(error.message);
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId, // Changed from tenant_id
    actor_id: actorId,
    entity: "jobs",
    entity_id: jobId,
    action: "update",
    before: { assigned_driver_id: oldJob.assigned_driver_id, status: oldJob.status },
    after: { assigned_driver_id: driverId, status: 'assigned' },
  }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

  return data as Job;
};