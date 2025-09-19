import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobStops, cancelJob, getJobByOrderNumber } from '@/lib/api/jobs';
import { getUsersForAdmin } from '@/lib/api/profiles';
import { getOrganisationDetails } from '@/lib/api/organisation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Job, Profile, Organisation, JobStop } from '@/utils/mockData';
import JobDetailHeader from '@/components/job-detail/JobDetailHeader';
import JobOverviewCard from '@/components/job-detail/JobOverviewCard';
import JobDetailTabs from '@/components/job-detail/JobDetailTabs';
import CloneJobDialog from '@/components/CloneJobDialog';
import CancelJobDialog from '@/components/CancelJobDialog';
import JobPdfDocument from '@/components/job-detail/JobPdfDocument';

const JobDetail = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();

  // Component State
  const [job, setJob] = useState<Job | null>(null);
  const [stops, setStops] = useState<JobStop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog States
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);

  const pdfRef = useRef(null);
  const currentOrgId = profile?.org_id;

  // Data Fetching Effect
  useEffect(() => {
    if (isLoadingAuth) return; // Wait for authentication to resolve
    if (!user) {
      navigate('/login');
      return;
    }

    // Only fetch data if we have the order number and the user's organization ID
    if (orderNumber && currentOrgId) {
      const fetchJobDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const jobData = await getJobByOrderNumber(orderNumber, currentOrgId);

          if (!jobData) {
            setError(`Job with order number ${orderNumber} not found.`);
            setJob(null);
            setStops([]);
          } else {
            setJob(jobData);
            // Fetch related data only if job exists
            const [stopsData, profilesData, orgData] = await Promise.all([
              getJobStops(currentOrgId, jobData.id),
              getUsersForAdmin(currentOrgId),
              getOrganisationDetails(currentOrgId),
            ]);
            setStops(stopsData);
            setProfiles(profilesData);
            setOrganisation(orgData);
          }
        } catch (err: any) {
          console.error("Failed to fetch job details:", err);
          setError(err.message || "Failed to load job details.");
        } finally {
          setLoading(false);
        }
      };

      fetchJobDetails();
    }
  }, [orderNumber, currentOrgId, user, isLoadingAuth, navigate]);

  // Handlers
  const handleConfirmCancelJob = async (cancellationPrice?: number) => {
    if (!jobToCancel || !user || !userRole) return;
    setIsSubmitting(true);
    try {
      const updatedJob = await cancelJob(jobToCancel.id, jobToCancel.org_id, user.id, userRole, cancellationPrice);
      setJob(updatedJob); // Update the job state with the cancelled status
      toast.success("Job cancelled successfully.");
      setJobToCancel(null);
    } catch (error: any) {
      toast.error(`Failed to cancel job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneSuccess = (newJob: Job) => {
    setIsCloneDialogOpen(false);
    navigate(`/jobs/${newJob.order_number}`);
    toast.success(`Job successfully cloned. New job number: ${newJob.order_number}`);
  };

  // Derived State
  const driver = job?.assigned_driver_id ? profiles.find(p => p.id === job.assigned_driver_id) : undefined;

  // Render Logic
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!job) {
    // This handles the case where the job is not found after loading is complete
    return <div className="text-center p-4">Job not found.</div>;
  }

  return (
    <div className="w-full">
      <JobDetailHeader
        job={job}
        onClone={() => setIsCloneDialogOpen(true)}
        onCancel={() => setJobToCancel(job)}
      />
      <JobOverviewCard
        job={job}
        profiles={profiles}
        stops={stops}
      />
      <JobDetailTabs
        job={job}
        profiles={profiles}
        stops={stops}
      />
      <CloneJobDialog
        open={isCloneDialogOpen}
        onOpenChange={setIsCloneDialogOpen}
        originalJob={job}
        originalStops={stops}
        onCloneSuccess={handleCloneSuccess}
      />
      <CancelJobDialog
        open={!!jobToCancel}
        onOpenChange={(open) => !open && setJobToCancel(null)}
        job={jobToCancel}
        onConfirm={handleConfirmCancelJob}
        isCancelling={isSubmitting}
      />
      {/* PDF Generation Element (hidden) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <JobPdfDocument
          ref={pdfRef}
          job={job}
          stops={stops}
          driver={driver}
          organisation={organisation}
        />
      </div>
    </div>
  );
};

export default JobDetail;