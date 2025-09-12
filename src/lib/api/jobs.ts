import { supabase } from '../supabaseClient';

// ... other functions ...

export const updateJobStatus = async (params: {
  jobId: string;
  stopId: string;
  orgId: string;
  actorId: string;
  actorRole: string;
  action: 'arrive' | 'depart' | 'complete';
  notes?: string;
  signatureUrl?: string | null;
  signatureName?: string | null;
}) => {
  const { jobId, stopId, orgId, actorId, actorRole, action, notes, signatureUrl, signatureName } = params;

  // We need to call an edge function to handle the complex logic of updating job status,
  // creating log entries, and determining the next job status.
  const { data, error } = await supabase.functions.invoke('update-job-progress', {
    body: {
      job_id: jobId,
      stop_id: stopId,
      org_id: orgId,
      actor_id: actorId,
      actor_role: actorRole,
      action: action,
      notes,
      signature_url: signatureUrl,
      signature_name: signatureName,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ... other functions ...