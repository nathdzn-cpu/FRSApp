import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobById, getJobStops, getJobDocuments, getProfiles, requestPod, generateJobPdf, cloneJob, cancelJob, updateJob, getJobProgressLogs, updateJobProgress } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import new modular components
import JobDetailHeader from '@/components/job-detail/JobDetailHeader';
import JobOverviewCard from '@/components/job-detail/JobOverviewCard';
import JobDetailTabs from '@/components/job-detail/JobDetailTabs';
import { Job, JobStop, Document, Profile, JobProgressLog } from '@/utils/mockData';

interface JobFormValues {
  order_number?: string | null;
  date_created: Date;
  price: number | null;
  assigned_driver_id: string | null;
  notes: string | null;
  status: 'planned' | 'assigned' | 'accepted' | 'delivered' | 'cancelled' | 'on_route_collection' | 'at_collection' | 'loaded' | 'on_route_delivery' | 'at_delivery' | 'pod_received';
  collections: Array<{
    id?: string;
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
    type: 'collection';
  }>;
  deliveries: Array<{
    id?: string;
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
    type: 'delivery';
  }>;
}

interface ProgressUpdateEntry {
  status: Job['status'];
  dateTime: Date;
  notes: string;
  timeInput: string;
  timeError: string | null;
}

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  // Fetch profiles separately as they are needed for multiple queries and UI elements
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !!currentProfile,
  });

  // Use useQuery for job details, stops, and documents
  const { data: jobData, isLoading: isLoadingJob, error: jobError, refetch: refetchJobData } = useQuery<{
    job: Job | undefined;
    stops: JobStop[];
    documents: Document[];
    progressLogs: JobProgressLog[];
  }, Error>({
    queryKey: ['jobDetail', id, userRole],
    queryFn: async () => {
      if (!id || !currentOrgId || !currentProfile || !userRole) {
        throw new Error("Missing job ID, organization ID, current profile, or user role.");
      }

      const fetchedJob = await getJobById(currentOrgId, id, userRole);
      if (!fetchedJob) {
        throw new Error("Job not found or you don't have permission to view it.");
      }

      const fetchedStops = await getJobStops(currentOrgId, id);
      const fetchedDocuments = await getJobDocuments(currentOrgId, id);
      const fetchedProgressLogs = await getJobProgressLogs(currentOrgId, id);

      return {
        job: fetchedJob,
        stops: fetchedStops,
        documents: fetchedDocuments,
        progressLogs: fetchedProgressLogs,
      };
    },
    enabled: !!id && !!currentOrgId && !!currentProfile && !!userRole && !isLoadingAuth,
    retry: false,
  });

  const job = jobData?.job;
  const stops = jobData?.stops || [];
  const documents = jobData?.documents || [];
  const progressLogs = jobData?.progressLogs || [];

  const isLoading = isLoadingAuth || isLoadingAllProfiles || isLoadingJob;
  const error = allProfilesError || jobError;

  // --- Handlers (kept for now, but not directly used in simplified render) ---
  const handleRequestPod = async () => { /* ... */ };
  const handleExportPdf = async () => { /* ... */ };
  const handleCloneJob = async () => { /* ... */ };
  const handleCancelJob = async () => { /* ... */ };
  const handleEditSubmit = async (values: JobFormValues) => { /* ... */ };
  const handleAssignDriver = async (driverId: string | null) => { /* ... */ };
  const handleUpdateProgress = async (entries: ProgressUpdateEntry[]) => { /* ... */ };
  // --- End Handlers ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-700 text-lg mb-4">No job found.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Simplified render for debugging
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Job Detail Page - Debugging: {job.order_number}</h1>
        <p>If you see this, the basic page is loading. The issue is in one of the modular components.</p>
      </div>
    </div>
  );
};

export default JobDetail;