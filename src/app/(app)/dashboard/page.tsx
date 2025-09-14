"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJobs, getProfiles, cancelJob as apiCancelJob } from '@/lib/api/jobs';
import { useAuth } from '@/context/AuthContext';
import { Job, Profile } from '@/utils/mockData';
import { DataTable } from '@/components/data-table/DataTable';
import { getColumns } from '@/components/job-dashboard/columns';
import { getStatusOptions, getDriverOptions } from '@/components/job-dashboard/filters';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobAttachmentsDialog from '@/components/job-detail/JobAttachmentsDialog';
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
import { cn } from '@/lib/utils';
import JobsTable from '@/components/JobsTable'; // Import JobsTable
import { useState } from 'react'; // Import useState

export default function JobDashboard() {
  const { currentOrgId, profile: currentProfile, userRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useRouter();

  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<Job | null>(null);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [selectedJobForAttachments, setSelectedJobForAttachments] = useState<Job | null>(null);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const [selectedDriverForDetail, setSelectedDriverForDetail] = useState<Profile | null>(null);
  const [isDriverDetailDialogOpen, setIsDriverDetailDialogOpen] = useState(false);

  const { data: jobsData, isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[]>({
    queryKey: ['jobs', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data, error } = await supabase.from('jobs_with_stop_details').select('*').eq('org_id', currentOrgId).is('deleted_at', null);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrgId,
  });

  const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[]>({
    queryKey: ['profiles', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data, error } = await supabase.from('profiles').select('*').eq('org_id', currentOrgId);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrgId,
  });

  const jobs = jobsData || [];
  const allProfiles = profiles || [];

  const drivers = useMemo(() => allProfiles.filter(p => p.role === 'driver'), [allProfiles]);
  const statusOptions = useMemo(() => getStatusOptions(jobs), [jobs]);
  const driverOptions = useMemo(() => getDriverOptions(drivers), [drivers]);

  const handleStatusUpdate = (job: Job) => {
    navigate.push(`/jobs/${job.order_number}`);
  };

  const handleJobView = (orderNumber: string) => {
    navigate.push(`/jobs/${orderNumber}`);
  };

  const handleAssignDriver = (job: Job) => {
    setSelectedJobForAssignment(job);
    setIsAssignDriverDialogOpen(true);
  };

  const handleViewAttachments = (job: Job) => {
    setSelectedJobForAttachments(job);
    setIsAttachmentsDialogOpen(true);
  };

  const handleViewDriverProfile = (driver: Profile) => {
    setSelectedDriverForDetail(driver);
    setIsDriverDetailDialogOpen(true);
  };

  const handleCancelJob = (job: Job) => {
    setJobToCancel(job);
    setIsCancelConfirmOpen(true);
  };

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-job', {
        body: { jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', currentOrgId] });
      toast.success('Job cancelled successfully.');
      setIsCancelConfirmOpen(false);
      setJobToCancel(null);
    },
    onError: (error) => {
      toast.error(`Failed to cancel job: ${error.message}`);
    },
  });

  const columns = useMemo(() => getColumns({
    profiles: allProfiles,
    onStatusUpdate: handleStatusUpdate,
    onJobView: handleJobView,
    onAssignDriver: handleAssignDriver,
    onViewAttachments: handleViewAttachments,
    onCancelJob: handleCancelJob,
    onViewDriverProfile: handleViewDriverProfile,
  }), [allProfiles]);

  if (isLoadingJobs || isLoadingProfiles) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (jobsError || profilesError) {
    return <div className="text-red-500 text-center p-4">Error loading data: {jobsError?.message || profilesError?.message}</div>;
  }

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">Job Dashboard</h1>
      {/* Using JobsTable component */}
      <JobsTable
        jobs={jobs}
        profiles={allProfiles}
        userRole={userRole}
        currentProfile={currentProfile}
        currentOrgId={currentOrgId!}
        onAction={(type, job) => {
          if (type === 'statusUpdate') handleStatusUpdate(job);
          if (type === 'assignDriver') handleAssignDriver(job);
          if (type === 'viewAttachments') handleViewAttachments(job);
        }}
        onCancelJob={handleCancelJob}
        onViewDriverProfile={handleViewDriverProfile} // Pass the handler here
      />

      {selectedJobForAssignment && (
        <AssignDriverDialog
          open={isAssignDriverDialogOpen}
          onOpenChange={setIsAssignDriverDialogOpen}
          job={selectedJobForAssignment}
          drivers={allProfiles.filter(p => p.role === 'driver')}
          onAssignSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['jobs', currentOrgId] });
            toast.success('Driver assigned successfully!');
          }}
        />
      )}

      {selectedJobForAttachments && (
        <JobAttachmentsDialog
          open={isAttachmentsDialogOpen}
          onOpenChange={setIsAttachmentsDialogOpen}
          job={selectedJobForAttachments}
        />
      )}

      {selectedDriverForDetail && (
        <DriverDetailDialog
          open={isDriverDetailDialogOpen}
          onOpenChange={setIsDriverDetailDialogOpen}
          driver={selectedDriverForDetail}
        />
      )}

      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will mark the job as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCancelConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (jobToCancel) {
                  cancelJobMutation.mutate(jobToCancel.id);
                }
              }}
              className={cn(
                "bg-red-600 hover:bg-red-700 text-white",
                cancelJobMutation.isPending && "opacity-50 cursor-not-allowed"
              )}
              disabled={cancelJobMutation.isPending}
            >
              {cancelJobMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}