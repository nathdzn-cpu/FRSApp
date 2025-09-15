"use client";

import React from 'react';
import JobProgressUpdateDialog from '@/components/job-detail/JobProgressUpdateDialog';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobAttachmentsDialog from '@/components/JobAttachmentsDialog';
import ImageUploadDialog from '@/components/driver/ImageUploadDialog';
import CancelJobDialog from '@/components/CancelJobDialog';
import DriverDetailDialog from '@/components/DriverDetailDialog';
import { Job, Profile } from '@/utils/mockData';
import { DialogState } from '@/hooks/useDashboard';

interface DashboardDialogsProps {
  dialogState: DialogState;
  setDialogState: (state: DialogState) => void;
  isActionBusy: boolean;
  setIsActionBusy: (busy: boolean) => void;
  profiles: Profile[];
  currentProfile: Profile | null;
  userRole: 'admin' | 'office' | 'driver' | 'customer' | undefined;
  driverActiveJobs: Job[];
  onUpdateProgress: (entries: any[]) => Promise<void>;
  onAssignDriver: (driverId: string | null) => Promise<void>;
  onImageUploadSuccess: () => void;
  jobToCancel: Job | null;
  setJobToCancel: (job: Job | null) => void;
  onConfirmCancel: (jobId: string, price?: number) => Promise<void>;
  viewingDriver: Profile | null;
  setViewingDriver: (driver: Profile | null) => void;
  allJobs: Job[];
}

const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  dialogState,
  setDialogState,
  isActionBusy,
  setIsActionBusy,
  profiles,
  currentProfile,
  userRole,
  driverActiveJobs,
  onUpdateProgress,
  onAssignDriver,
  onImageUploadSuccess,
  jobToCancel,
  setJobToCancel,
  onConfirmCancel,
  viewingDriver,
  setViewingDriver,
  allJobs,
}) => {
  const closeDialog = () => setDialogState({ type: null, job: null });

  return (
    <>
      {viewingDriver && (
        <DriverDetailDialog
          open={!!viewingDriver}
          onOpenChange={() => setViewingDriver(null)}
          driver={viewingDriver}
          allJobs={allJobs.filter(j => j.assigned_driver_id === viewingDriver.id)}
        />
      )}

      {dialogState.type === 'statusUpdate' && dialogState.job && currentProfile && userRole && (
        <JobProgressUpdateDialog
          open={true}
          onOpenChange={closeDialog}
          job={dialogState.job}
          currentProfile={currentProfile}
          userRole={userRole}
          onUpdateProgress={onUpdateProgress}
          isUpdatingProgress={isActionBusy}
          driverActiveJobs={driverActiveJobs}
        />
      )}

      {dialogState.type === 'assignDriver' && dialogState.job && (
        <AssignDriverDialog
          open={true}
          onOpenChange={closeDialog}
          drivers={profiles.filter(p => p.role === 'driver')}
          currentAssignedDriverId={dialogState.job.assigned_driver_id}
          onAssign={onAssignDriver}
          isAssigning={isActionBusy}
        />
      )}

      {dialogState.type === 'viewAttachments' && dialogState.job && currentProfile?.org_id && (
        <JobAttachmentsDialog
          open={true}
          onOpenChange={closeDialog}
          job={dialogState.job}
          currentOrgId={currentProfile.org_id}
        />
      )}

      {dialogState.type === 'uploadImage' && dialogState.job && currentProfile && (
        <ImageUploadDialog
          open={true}
          onOpenChange={closeDialog}
          job={dialogState.job}
          currentProfile={currentProfile}
          onUploadSuccess={onImageUploadSuccess}
          isLoading={isActionBusy}
          setIsLoading={setIsActionBusy}
        />
      )}

      {jobToCancel && (
        <CancelJobDialog
          open={!!jobToCancel}
          onOpenChange={(open) => !open && setJobToCancel(null)}
          job={jobToCancel}
          onConfirm={onConfirmCancel}
          isCancelling={isActionBusy}
        />
      )}
    </>
  );
};

export default DashboardDialogs;