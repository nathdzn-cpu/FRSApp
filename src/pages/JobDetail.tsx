import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobById, getJobStops, getJobDocuments, getJobProgressLogs, requestPod, cancelJob, updateJob, updateJobProgress } from '@/lib/api/jobs';
import { getProfiles } from '@/lib/api/profiles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobPdfDocument from '@/components/job-detail/JobPdfDocument';
import { Job, JobStop, Document as JobDocument, JobProgressLog, Profile, Organisation } from '@/utils/mockData';
import { getOrganisationDetails } from '@/lib/api/organisation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JobDetailHeader from '@/components/job-detail/JobDetailHeader';
import JobOverviewCard from '@/components/job-detail/JobOverviewCard';
import JobDetailTabs from '@/components/job-detail/JobDetailTabs';
import CloneJobDialog from '@/components/CloneJobDialog';
import DriverJobDetailView from '@/pages/driver/DriverJobDetailView';
import CancelJobDialog from '@/components/CancelJobDialog';
import DriverDetailDialog from '@/components/DriverDetailDialog';

interface JobFormValues {
  order_number?: string | null;
  collection_date: Date;
  delivery_date: Date;
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
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const currentOrgId = profile?.org_id;
  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';

  const { data: organisation } = useQuery<Organisation | null, Error>({
    queryKey: ['organisation', currentOrgId!],
    queryFn: () => getOrganisationDetails(currentOrgId!),
    enabled: !!currentOrgId,
  });

  // Fetch profiles separately as they are needed for multiple queries and UI elements
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId, userRole],
    queryFn: () => getProfiles(currentOrgId, userRole),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !!profile && !isLoadingAuth && !!userRole,
  });

  // Use useQuery for job details, stops, and documents
  const { data: jobData, isLoading: isLoadingJob, error: jobError, refetch: refetchJobData } = useQuery<{
    job: Job | undefined;
    stops: JobStop[];
    documents: JobDocument[];
    progressLogs: JobProgressLog[];
  }, Error>({
    queryKey: ['jobDetail', orderNumber, userRole],
    queryFn: async () => {
      if (!orderNumber || !currentOrgId || !profile || !userRole) {
        throw new Error("Missing job order number, organization ID, current profile, or user role.");
      }

      const fetchedJob = await getJobById(currentOrgId, orderNumber, userRole);
      if (!fetchedJob) {
        throw new Error("Job not found or you don't have permission to view it.");
      }

      const fetchedStops = await getJobStops(currentOrgId, fetchedJob.id);
      const fetchedDocuments = await getJobDocuments(currentOrgId, fetchedJob.id);
      const fetchedProgressLogs = await getJobProgressLogs(currentOrgId, fetchedJob.id);

      return {
        job: fetchedJob,
        stops: fetchedStops,
        documents: fetchedDocuments,
        progressLogs: fetchedProgressLogs,
      };
    },
    enabled: !!orderNumber && !!currentOrgId && !!profile && !!userRole && !isLoadingAuth,
    retry: false,
  });

  const job = jobData?.job;
  const stops = jobData?.stops || [];
  const documents = jobData?.documents || [];
  const progressLogs = jobData?.progressLogs || [];

  const driver = allProfiles.find(p => p.id === job?.assigned_driver_id);

  const isLoading = isLoadingAuth || isLoadingAllProfiles || isLoadingJob;
  const error = allProfilesError || jobError;

  const handleRequestPod = async () => {
    if (!job || !profile || !userRole) return;
    const promise = requestPod(job.id, currentOrgId, profile.id, userRole);
    toast.promise(promise, {
      loading: 'Requesting POD...',
      success: 'POD request sent to driver!',
      error: 'Failed to request POD.',
    });
    await promise;
    refetchJobData();
  };

  const handleExportPdf = async () => {
    if (!pdfRef.current || !job) {
      toast.error("Could not export PDF. Content is not ready.");
      return;
    }

    setIsExportingPdf(true);
    toast.loading("Generating PDF...", { id: 'pdf-export' });

    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgHeight = pdfWidth / ratio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`Job-${job.order_number}.pdf`);

      toast.success("PDF downloaded successfully!", { id: 'pdf-export' });
    } catch (error: any) {
      console.error("Failed to generate PDF:", error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: 'pdf-export' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCloneJob = () => {
    if (!job) {
      toast.error("No job data available to clone.");
      return;
    }
    setIsCloneDialogOpen(true);
  };

  const handleCloneSuccess = (newJobOrderNumber: string) => {
    navigate(`/jobs/${newJobOrderNumber}`);
  };

  const handleCancelJob = async (cancellationPrice: number) => {
    if (!job || !profile || !userRole) return;
    const promise = cancelJob(job.id, currentOrgId, profile.id, userRole, cancellationPrice);
    toast.promise(promise, {
      loading: 'Cancelling job...',
      success: 'Job cancelled successfully!',
      error: 'Failed to cancel job.',
    });
    await promise;
    setJobToCancel(null);
    refetchJobData();
  };

  const handleApproveRequest = async () => {
    if (!job || !profile || !userRole) return;
    setIsSubmittingEdit(true);
    try {
      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: profile.id,
        actor_role: userRole,
        job_updates: { status: 'planned' }, // Approve to 'planned' status
      };
      await updateJob(payload);
      toast.success('Job request approved!');
      refetchJobData();
    } catch (err) {
      toast.error('Failed to approve job request.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!job || !profile || !userRole) return;
    setIsSubmittingEdit(true);
    try {
      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: profile.id,
        actor_role: userRole,
        job_updates: { status: 'cancelled' }, // Reject to 'cancelled' status
      };
      await updateJob(payload);
      toast.success('Job request rejected.');
      refetchJobData();
    } catch (err) {
      toast.error('Failed to reject job request.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleEditSubmit = async (values: any) => {
    if (!job || !profile || !userRole) {
      toast.error("Job or user profile/role not found. Cannot update job.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const originalStopsMap = new Map(stops.map(s => s.id ? [s.id, s] : []));

      const allNewStops = [...values.collections, ...values.deliveries];

      const stops_to_add = allNewStops.filter(s => !s.id);
      const stops_to_update = allNewStops.filter(s => s.id && originalStopsMap.has(s.id));
      const stops_to_delete = stops.filter(s => !allNewStops.some(ns => ns.id === s.id)).map(s => s.id);

      const jobUpdates: Partial<Job> = {
        order_number: values.order_number || null,
        collection_date: values.collection_date.toISOString().split('T')[0],
        delivery_date: values.delivery_date.toISOString().split('T')[0],
        price: values.price,
        assigned_driver_id: values.assigned_driver_id === 'null' ? null : values.assigned_driver_id,
        notes: values.notes,
        status: values.status,
      };

      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: profile.id,
        actor_role: userRole,
        job_updates: jobUpdates,
        stops_to_add: stops_to_add.map((s, index) => ({ ...s, seq: index + 1 })),
        stops_to_update: stops_to_update.map((s, index) => ({ ...s, seq: index + 1 })),
        stops_to_delete: stops_to_delete,
      };

      const promise = updateJob(payload);
      toast.promise(promise, {
        loading: 'Updating job...',
        success: 'Job updated successfully!',
        error: (err) => `Failed to update job: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
    } catch (err: any) {
      console.error("Error updating job:", err);
      toast.error("An unexpected error occurred while updating the job.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!job || !profile || !userRole) {
      toast.error("Job or user profile/role not found. Cannot assign driver.");
      return;
    }
    setIsAssigningDriver(true);
    try {
      const jobUpdates: Partial<Job> = {
        assigned_driver_id: driverId,
      };

      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: profile.id,
        actor_role: userRole,
        job_updates: jobUpdates,
      };

      const promise = updateJob(payload);
      toast.promise(promise, {
        loading: driverId ? 'Assigning driver...' : 'Unassigning driver...',
        success: driverId ? 'Driver assigned successfully!' : 'Driver unassigned successfully!',
        error: (err) => `Failed to assign driver: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
    } catch (err: any) {
      console.error("Error assigning driver:", err);
      toast.error("An unexpected error occurred while assigning the driver.");
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleUpdateProgress = async (entries: ProgressUpdateEntry[]) => {
    if (!job || !profile || !userRole || entries.length === 0) {
      toast.error("No status updates to log.");
      return;
    }

    setIsUpdatingProgress(true);
    try {
      const sortedEntries = [...entries].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      for (const entry of sortedEntries) {
        const payload = {
          job_id: job.id,
          org_id: currentOrgId,
          actor_id: profile.id,
          actor_role: userRole,
          new_status: entry.status,
          timestamp: entry.dateTime.toISOString(),
          notes: entry.notes.trim() || undefined,
        };

        await updateJobProgress(payload);
      }

      toast.success('Job progress updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      toast.error("An unexpected error occurred while updating job progress.");
      throw err;
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleLogVisibilityChange = async (logId: string, isVisible: boolean) => {
    // This functionality can be fully implemented later.
    console.log(`Visibility change for log ${logId} to ${isVisible}`);
    toast.info("Log visibility change is not yet implemented.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-gray-700 text-lg mb-4">No job found.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Conditional rendering based on user role
  if (userRole === 'driver') {
    return (
      <DriverJobDetailView
        job={job}
        stops={stops}
        progressLogs={progressLogs}
        documents={documents}
        currentProfile={profile!}
        currentOrgId={currentOrgId}
        userRole={userRole}
        refetchJobData={refetchJobData}
      />
    );
  }

  // Default view for admin/office roles
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        {isOfficeOrAdmin && job?.status === 'requested' && (
          <Card className="bg-orange-100 border-orange-300 p-4 mb-6 flex items-center justify-between">
            <p className="text-orange-800 font-semibold">This job is a customer request and is awaiting approval.</p>
            <div className="flex gap-2">
              <Button onClick={handleApproveRequest} disabled={isSubmittingEdit} className="bg-green-600 hover:bg-green-700">
                {isSubmittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
              </Button>
              <Button onClick={handleRejectRequest} disabled={isSubmittingEdit} variant="destructive">
                {isSubmittingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
              </Button>
            </div>
          </Card>
        )}

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <JobDetailHeader
            job={job}
            stops={stops}
            allProfiles={allProfiles}
            userRole={userRole!}
            currentProfile={profile!}
            currentOrgId={currentOrgId!}
            onEditSubmit={handleEditSubmit}
            onAssignDriver={handleAssignDriver}
            onUpdateProgress={handleUpdateProgress}
            onRequestPod={handleRequestPod}
            onExportPdf={handleExportPdf}
            onCloneJob={handleCloneJob}
            onCancelJob={() => setJobToCancel(job)}
            isSubmittingEdit={isSubmittingEdit}
            isAssigningDriver={isAssigningDriver}
            isUpdatingProgress={isUpdatingProgress}
            isExportingPdf={isExportingPdf}
          />
          <JobOverviewCard
            job={job}
            stops={stops}
            allProfiles={allProfiles}
          />
        </Card>

        <JobDetailTabs
          job={job}
          progressLogs={progressLogs}
          allProfiles={allProfiles}
          stops={stops}
          documents={documents}
          currentOrgId={currentOrgId}
          onLogVisibilityChange={handleLogVisibilityChange}
        />

        {job && (
          <CloneJobDialog
            open={isCloneDialogOpen}
            onOpenChange={setIsCloneDialogOpen}
            originalJob={job}
            originalStops={stops}
            onCloneSuccess={handleCloneSuccess}
          />
        )}

        <CancelJobDialog
          open={!!jobToCancel}
          onOpenChange={(open) => !open && setJobToCancel(null)}
          job={jobToCancel}
          onConfirm={handleCancelJob}
          isCancelling={isSubmittingEdit}
        />

        {/* Hidden component for PDF generation */}
        {job && stops && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <JobPdfDocument
              ref={pdfRef}
              job={job}
              stops={stops}
              driver={driver}
              organisation={organisation}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetail;