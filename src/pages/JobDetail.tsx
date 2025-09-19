import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobById, getJobStops, getJobDocuments, getJobProgressLogs, requestPod, cancelJob, updateJob, updateJobProgress, getJobs } from '@/lib/api/jobs';
import { getProfiles } from '@/lib/api/profiles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobPdfDocument from '@/components/job-detail/JobPdfDocument';
import { Job, Profile, Organisation } from '@/utils/mockData';
import { getOrganisationDetails } from '@/lib/api/organisation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JobDetailHeader from '@/components/job-detail/JobDetailHeader';
import JobOverviewCard from '@/components/job-detail/JobOverviewCard';
import JobDetailTabs from '@/components/job-detail/JobDetailTabs';
import CloneJobDialog from '@/components/CloneJobDialog';
import DriverJobDetailView from '@/pages/driver/DriverJobDetailView';
import CancelJobDialog from '@/components/CancelJobDialog';
import { RefetchOptions } from '@tanstack/react-query';
import JobEditForm from '@/components/JobEditForm';

const JobDetail = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignDriverOpen, setAssignDriverOpen] = useState(false);
  const [isStatusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [isAttachmentsOpen, setAttachmentsOpen] = useState(false);
  const [isCancelJobOpen, setCancelJobOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null);

  const currentOrgId = profile?.org_id;

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!orderNumber || !currentOrgId) {
      setError("Job details are unavailable.");
      setLoading(false);
      return;
    }

    const fetchJobAndProfiles = async () => {
      setLoading(true);
      try {
        const [jobData, profilesData] = await Promise.all([
          getJobByOrderNumber(orderNumber, currentOrgId),
          getUsersForAdmin(currentOrgId)
        ]);

        if (!jobData) {
          setError(`Job with order number ${orderNumber} not found.`);
        } else {
          setJob(jobData);
        }
        setProfiles(profilesData);
      } catch (err: any) {
        setError(err.message || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndProfiles();
  }, [orderNumber, currentOrgId, user, isLoadingAuth, navigate]);

  const handleAction = (type: 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage', job: Job) => {
    if (type === 'assignDriver') setAssignDriverOpen(true);
    if (type === 'statusUpdate') setStatusUpdateOpen(true);
    if (type === 'viewAttachments') setAttachmentsOpen(true);
  };

  const handleCancelJob = () => {
    setCancelJobOpen(true);
  };

  const handleViewDriverProfile = (driver: Profile) => {
    setSelectedDriver(driver);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!job) {
    return <div className="text-center p-4">Job not found.</div>;
  }

  return (
    <div className="w-full">
      <JobDetailHeader
        job={job}
        onAction={handleAction}
        onCancelJob={handleCancelJob}
        onViewDriverProfile={handleViewDriverProfile}
        selectedDriver={selectedDriver}
        isAssignDriverOpen={isAssignDriverOpen}
        isStatusUpdateOpen={isStatusUpdateOpen}
        isAttachmentsOpen={isAttachmentsOpen}
        isCancelJobOpen={isCancelJobOpen}
        onAssignDriverOpenChange={setAssignDriverOpen}
        onStatusUpdateOpenChange={setStatusUpdateOpen}
        onAttachmentsOpenChange={setAttachmentsOpen}
        onCancelJobOpenChange={setCancelJobOpen}
        onDriverSelect={setSelectedDriver}
      />
      <JobOverviewCard
        job={job}
        profiles={profiles}
      />
      <JobDetailTabs
        job={job}
        profiles={profiles}
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
        onConfirm={handleCancelJob}
        isCancelling={isSubmittingEdit}
      />
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
  );
};

export default JobDetail;