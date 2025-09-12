"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Edit, UserPlus, CheckCircle, FileText, FileDown, Copy, XCircle } from 'lucide-react';
import JobEditForm from '@/components/JobEditForm';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobProgressUpdateDialog from './JobProgressUpdateDialog';
import { Job, JobStop, Profile } from '@/types';
import { getDisplayStatus } from '@/lib/utils/statusUtils';

interface JobDetailHeaderProps {
  job: Job;
  stops: JobStop[];
  allProfiles: Profile[];
  userRole: 'admin' | 'office' | 'driver';
  currentProfile: Profile;
  currentOrgId: string;
  onEditSubmit: (values: any) => Promise<void>;
  onAssignDriver: (driverId: string | null) => Promise<void>;
  onUpdateProgress: (entries: any[]) => Promise<void>;
  onRequestPod: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  onCloneJob: () => void;
  onCancelJob: () => Promise<void>;
  isSubmittingEdit: boolean;
  isAssigningDriver: boolean;
  isUpdatingProgress: boolean;
  driverActiveJobs?: Job[]; // New prop
}

const JobDetailHeader: React.FC<JobDetailHeaderProps> = ({
  job,
  stops,
  allProfiles,
  userRole,
  currentProfile,
  currentOrgId,
  onEditSubmit,
  onAssignDriver,
  onUpdateProgress,
  onRequestPod,
  onExportPdf,
  onCloneJob,
  onCancelJob,
  isSubmittingEdit,
  isAssigningDriver,
  isUpdatingProgress,
  driverActiveJobs = [], // Default to empty array
}) => {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [isProgressUpdateDialogOpen, setIsProgressUpdateDialogOpen] = useState(false);

  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';

  return (
    <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
      <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        Job: {job.order_number}
        <Badge
          variant={
            job.status === 'planned'
              ? 'secondary'
              : job.status === 'accepted' || job.status === 'assigned'
              ? 'default'
              : job.status === 'delivered'
              ? 'outline'
              : 'destructive'
          }
          className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
        >
          {getDisplayStatus(job.status)}
        </Badge>
      </CardTitle>
      <div className="flex space-x-2">
        {isOfficeOrAdmin && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" /> Edit Job
              </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Edit Job: {job.order_number}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <JobEditForm
                  initialJob={job}
                  initialStops={stops}
                  drivers={allProfiles.filter(p => p.role === 'driver')}
                  onSubmit={onEditSubmit}
                  isSubmitting={isSubmittingEdit}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {isOfficeOrAdmin && (
          <Button variant="outline" onClick={() => setIsAssignDriverDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Assign Driver
          </Button>
        )}
        {isOfficeOrAdmin && job.status !== 'cancelled' && job.status !== 'delivered' && (
          <>
            <Button variant="outline" onClick={() => setIsProgressUpdateDialogOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" /> Update Progress
            </Button>
            <JobProgressUpdateDialog
              open={isProgressUpdateDialogOpen}
              onOpenChange={setIsProgressUpdateDialogOpen}
              job={job}
              currentProfile={currentProfile}
              userRole={userRole}
              onUpdateProgress={onUpdateProgress}
              isUpdatingProgress={isUpdatingProgress}
              driverActiveJobs={driverActiveJobs} // Pass driverActiveJobs
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" /> Request POD
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Request Proof of Delivery (POD)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a notification to the assigned driver to upload a Proof of Delivery for this job.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="outline">Dismiss</Button>
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onRequestPod}>Request POD</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" onClick={onExportPdf}>
              <FileDown className="h-4 w-4 mr-2" /> Export PDF
            </Button>

            <Button variant="outline" onClick={onCloneJob}>
              <Copy className="h-4 w-4 mr-2" /> Clone Job
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" /> Cancel Job
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure you want to cancel this job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently mark the job as cancelled and it will no longer appear in active job lists.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button variant="outline">Dismiss</Button>
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onCancelJob} variant="destructive">Cancel Job</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
      <AssignDriverDialog
        open={isAssignDriverDialogOpen}
        onOpenChange={setIsAssignDriverDialogOpen}
        drivers={allProfiles.filter(p => p.role === 'driver')}
        currentAssignedDriverId={job.assigned_driver_id}
        onAssign={onAssignDriver}
        isAssigning={isAssigningDriver}
      />
    </CardHeader>
  );
};

export default JobDetailHeader;