"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJobs, cancelJob as apiCancelJob } from '@/lib/api/jobs';
import { getProfiles } from '@/lib/api/profiles';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/types';
import { DataTable } from '@/components/data-table/DataTable';
import { getColumns } from '@/components/job-dashboard/columns';
import { getStatusOptions, getDriverOptions } from '@/components/job-dashboard/filters';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobAttachmentsDialog from '@/components/job-detail/JobAttachmentsDialog';
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
import { cn } from '@/lib/utils';

export default function JobDashboard() {
  const { currentOrgId, profile: currentProfile, userRole } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<Job | null>(null);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [selectedJobForAttachments, setSelectedJobForAttachments] = useState<Job | null>(null);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);

  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', currentOrgId],
    queryFn: () => getJobs(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const drivers = useMemo(() => profiles.filter(p => p.role === 'driver'), [profiles]);
  const statusOptions = useMemo(() => getStatusOptions(jobs), [jobs]);
  const driverOptions = useMemo(() => getDriverOptions(drivers), [drivers]);

  const handleStatusUpdate = (job: Job) => {
    toast.info(`Status update for ${job.order_number} is not implemented yet.`);
  };

  const handleJobView = (orderNumber: string) => {
    router.push(`/jobs/${orderNumber}`);
  };

  const handleAssignDriver = (job: Job) => {
    setSelectedJobForAssignment(job);
    setIsAssignDriverDialogOpen(true);
  };

  const handleViewAttachments = (job: Job) => {
    setSelectedJobForAttachments(job);
    setIsAttachmentsDialogOpen(true);
  };

  const handleCancelJob = (job: Job) => {
    setJobToCancel(job);
    setIsCancelConfirmOpen(true);
  };

  const confirmCancelJob = async () => {
    if (!jobToCancel || !currentProfile || !currentOrgId) return;

    setIsCancelling(true);
    const toastId = toast.loading(`Cancelling job ${jobToCancel.order_number}...`);

    try {
      await apiCancelJob({
        job_id: jobToCancel.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        actor_role: currentProfile.role,
        actor_name: currentProfile.full_name,
      });

      queryClient.invalidateQueries({ queryKey: ['jobs', currentOrgId] });
      toast.success(`Job ${jobToCancel.order_number} has been cancelled.`, { id: toastId });
    } catch (error: any) {
      toast.error(`Failed to cancel job: ${error.message}`, { id: toastId });
    } finally {
      setIsCancelling(false);
      setIsCancelConfirmOpen(false);
      setJobToCancel(null);
    }
  };

  const columns = useMemo(() => getColumns({
    profiles,
    onStatusUpdate: handleStatusUpdate,
    onJobView: handleJobView,
    onAssignDriver: handleAssignDriver,
    onViewAttachments: handleViewAttachments,
    onCancelJob: handleCancelJob,
  }), [profiles]);

  if (isLoadingJobs || isLoadingProfiles) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (jobsError || profilesError) {
    return (
      <div className="text-red-500 text-center py-4">
        Error loading data: {jobsError?.message || profilesError?.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">Job Dashboard</h1>
      <DataTable
        columns={columns}
        data={jobs}
        filterColumn="order_number"
        filterPlaceholder="Filter by Order #"
        statusOptions={statusOptions}
        driverOptions={driverOptions}
        getRowClassName={(row) =>
          cn(row.original.status === 'cancelled' ? 'opacity-70' : '')
        }
      />

      {selectedJobForAssignment && (
        <AssignDriverDialog
          open={isAssignDriverDialogOpen}
          onOpenChange={setIsAssignDriverDialogOpen}
          drivers={drivers}
          currentAssignedDriverId={selectedJobForAssignment.assigned_driver_id}
          onAssign={async (driverId) => {
            // Placeholder for assignment logic
            setIsAssigning(true);
            console.log(`Assigning driver ${driverId} to job ${selectedJobForAssignment.order_number}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            toast.success(`Driver assigned successfully!`);
            queryClient.invalidateQueries({ queryKey: ['jobs', currentOrgId] });
            setIsAssigning(false);
            setIsAssignDriverDialogOpen(false);
          }}
          isAssigning={isAssigning}
        />
      )}

      {selectedJobForAttachments && currentOrgId && (
        <JobAttachmentsDialog
          open={isAttachmentsDialogOpen}
          onOpenChange={setIsAttachmentsDialogOpen}
          job={selectedJobForAttachments}
          currentOrgId={currentOrgId}
        />
      )}

      {jobToCancel && (
        <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to cancel this job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel job <span className="font-bold">{jobToCancel.order_number}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelJob}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Cancel Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}