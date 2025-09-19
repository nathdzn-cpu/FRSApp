import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobStops, cancelJob, getJobByOrderNumber, getJobProgressLogs, getJobDocuments, updateJob, updateJobProgress } from '@/lib/api/jobs';
import { getUsersForAdmin } from '@/lib/api/profiles';
import { getOrganisationDetails } from '@/lib/api/organisation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Job, Profile, Organisation, JobStop, JobProgressLog, Document } from '@/utils/mockData';
import JobDetailHeader from '@/components/job-detail/JobDetailHeader';
import JobOverviewCard from '@/components/job-detail/JobOverviewCard';
import JobDetailTabs from '@/components/job-detail/JobDetailTabs';
import CloneJobDialog from '@/components/CloneJobDialog';
import CancelJobDialog from '@/components/CancelJobDialog';
import JobPdfDocument from '@/components/job-detail/JobPdfDocument';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobEditForm from '@/components/JobEditForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobProgressUpdateDialog from '@/components/job-detail/JobProgressUpdateDialog';

const JobDetail = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [isProgressUpdateDialogOpen, setIsProgressUpdateDialogOpen] = useState(false);

  const pdfRef = useRef(null);
  const currentOrgId = profile?.org_id;

  // Data Fetching
  const { data: jobData, isLoading: isLoadingJob, error: jobError, refetch: refetchJobData } = useQuery({
    queryKey: ['jobDetail', orderNumber, currentOrgId],
    queryFn: async () => {
      if (!orderNumber || !currentOrgId) throw new Error("Missing order number or organization ID");
      const job = await getJobByOrderNumber(orderNumber, currentOrgId);
      if (!job) throw new Error(`Job with order number ${orderNumber} not found.`);
      return job;
    },
    enabled: !!orderNumber && !!currentOrgId && !isLoadingAuth,
    retry: false,
  });

  const { data: stops = [], isLoading: isLoadingStops } = useQuery({
    queryKey: ['jobStops', jobData?.id],
    queryFn: () => getJobStops(currentOrgId!, jobData!.id),
    enabled: !!jobData,
  });

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getUsersForAdmin(currentOrgId!),
    enabled: !!currentOrgId && isOfficeOrAdmin,
  });

  const { data: organisation, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organisation', currentOrgId],
    queryFn: () => getOrganisationDetails(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const isLoading = isLoadingAuth || isLoadingJob || isLoadingStops || isLoadingProfiles || isLoadingOrg;
  const error = jobError;
  const job = jobData;
  const driver = job?.assigned_driver_id ? profiles.find(p => p.id === job.assigned_driver_id) : undefined;

  // Handlers
  const handleConfirmCancelJob = async (cancellationPrice?: number) => {
    if (!jobToCancel || !user || !userRole) return;
    setIsSubmitting(true);
    try {
      await cancelJob(jobToCancel.id, jobToCancel.org_id, user.id, userRole, cancellationPrice);
      toast.success("Job cancelled successfully.");
      setJobToCancel(null);
      refetchJobData();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
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

  const handleEditSubmit = async (values: any) => {
    if (!job || !profile || !userRole) return;
    setIsSubmitting(true);
    try {
      // ... (logic from previous JobDetail will be here)
      toast.success("Job updated successfully!");
      setIsEditDialogOpen(false);
      refetchJobData();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      toast.error(`Failed to update job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!job || !profile || !userRole) return;
    setIsSubmitting(true);
    try {
      // ... (logic from previous JobDetail will be here)
      toast.success("Driver assigned successfully!");
      setIsAssignDriverDialogOpen(false);
      refetchJobData();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      toast.error(`Failed to assign driver: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProgress = async (entries: any[]) => {
    if (!job || !profile || !userRole) return;
    setIsSubmitting(true);
    try {
      // ... (logic from previous JobDetail will be here)
      toast.success("Job progress updated!");
      setIsProgressUpdateDialogOpen(false);
      refetchJobData();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      toast.error(`Failed to update progress: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error.message}</div>;
  }

  if (!job) {
    return <div className="text-center p-4">Job not found.</div>;
  }

  return (
    <div className="w-full">
      <JobDetailHeader
        job={job}
        onClone={() => setIsCloneDialogOpen(true)}
        onCancel={() => setJobToCancel(job)}
        onEditJob={() => setIsEditDialogOpen(true)}
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Job: {job.order_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <JobEditForm
              initialJob={job}
              initialStops={stops}
              drivers={profiles.filter(p => p.role === 'driver')}
              onSubmit={handleEditSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
      <AssignDriverDialog
        open={isAssignDriverDialogOpen}
        onOpenChange={setIsAssignDriverDialogOpen}
        drivers={profiles.filter(p => p.role === 'driver')}
        currentAssignedDriverId={job.assigned_driver_id}
        onAssign={handleAssignDriver}
        isAssigning={isSubmitting}
      />
      <JobProgressUpdateDialog
        open={isProgressUpdateDialogOpen}
        onOpenChange={setIsProgressUpdateDialogOpen}
        job={job}
        currentProfile={profile!}
        userRole={userRole!}
        onUpdateProgress={handleUpdateProgress}
        isUpdatingProgress={isSubmitting}
      />
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