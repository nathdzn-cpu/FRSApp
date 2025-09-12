"use client";

import React from 'react';
import { Job, Profile } from '@/utils/mockData';
import JobProgressUpdateDialog from '@/components/job-detail/JobProgressUpdateDialog';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobAttachmentsDialog from '@/components/JobAttachmentsDialog';
import ImageUploadDialog from '@/components/driver/ImageUploadDialog';
import DriverDetailDialog from '@/components/DriverDetailDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type DialogType = 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage';

export interface DialogState {
  type: DialogType | null;
  job: Job | null;
}

interface DashboardDialogsProps {
  dialogState: DialogState;
  setDialogState: (state: DialogState) => void;
  jobToCancel: Job | null;
  isCancelConfirmOpen: boolean;
  setIsCancelConfirmOpen: (isOpen: boolean) => void;
  selectedDriver: Profile | null;
  isDriverDetailOpen: boolean;
  setIsDriverDetailOpen: (isOpen: boolean) => void;
  currentProfile: Profile;
  userRole: 'admin' | 'office' | 'driver';
  isActionBusy: boolean;
  setIsActionBusy: (isBusy: boolean) => void;
  driverActiveJobs: Job[];
  profiles: Profile[];
  currentOrgId: string;
  jobs: Job[];
  handleUpdateProgress: (entries: any[]) => Promise<void>;
  handleAssignDriver: (driverId: string | null) => Promise<void>;
  handleImageUploadSuccess: () => void;
  confirmCancelJob: () => Promise<void>;
}

const DashboardDialogs: React.FC<DashboardDialogsProps> = ({
  dialogState,
  setDialogState,
  jobToCancel,
  isCancelConfirmOpen,
  setIsCancelConfirmOpen,
  selectedDriver,
  isDriverDetailOpen,
  setIsDriverDetailOpen,
  currentProfile,
  userRole,
  isActionBusy,
  setIsActionBusy,
  driverActiveJobs,
  profiles,
  currentOrgId,
  jobs,
  handleUpdateProgress,
  handleAssignDriver,
  handleImageUploadSuccess,
  confirmCancelJob,
}) => {
  const navigate = useNavigate();

  return (
    <>
      {dialogState.type === 'statusUpdate' && dialogState.job && currentProfile && userRole && (
        <JobProgressUpdateDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          job={dialogState.job}
          currentProfile={currentProfile}
          userRole={userRole}
          onUpdateProgress={handleUpdateProgress}
          isUpdatingProgress={isActionBusy}
          driverActiveJobs={driverActiveJobs}
        />
      )}

      {dialogState.type === 'assignDriver' && dialogState.job && currentProfile && userRole && (
        <AssignDriverDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          drivers={profiles.filter(p => p.role === 'driver')}
          currentAssignedDriverId={dialogState.job.assigned_driver_id}
          onAssign={handleAssignDriver}
          isAssigning={isActionBusy}
        />
      )}

      {dialogState.type === 'viewAttachments' && dialogState.job && currentOrgId && (
        <JobAttachmentsDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          job={dialogState.job}
          currentOrgId={currentOrgId}
        />
      )}

      {dialogState.type === 'uploadImage' && dialogState.job && currentProfile && userRole && (
        <ImageUploadDialog
          open={true}
          onOpenChange={() => setDialogState({ type: null, job: null })}
          job={dialogState.job}
          currentProfile={currentProfile}
          onUploadSuccess={handleImageUploadSuccess}
          isLoading={isActionBusy}
          setIsLoading={setIsActionBusy}
        />
      )}

      {jobToCancel && (
        <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
          <AlertDialogContent className="bg-white shadow-xl rounded-xl p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to cancel this job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel job <span className="font-bold">{jobToCancel.order_number}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isActionBusy}>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelJob}
                disabled={isActionBusy}
                className="bg-red-600 hover:bg-red-700"
              >
                {isActionBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Cancel Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedDriver && (
        <DriverDetailDialog
          open={isDriverDetailOpen}
          onOpenChange={setIsDriverDetailOpen}
          driver={selectedDriver}
          allJobs={jobs}
          currentOrgId={currentOrgId}
          onJobView={(orderNumber) => navigate(`/jobs/${orderNumber}`)}
        />
      )}
    </>
  );
};

export default DashboardDialogs;