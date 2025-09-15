"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { getJobs, getProfiles, cancelJob, updateJob, updateJobProgress } from '@/lib/api/jobs';
import { Job, Profile } from '@/utils/mockData';

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | 'requested';
export type DialogType = 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage';

export interface DialogState {
  type: DialogType | null;
  job: Job | null;
}

export const useDashboard = () => {
  const { user, profile, userRole, isLoadingAuth, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>(isOfficeOrAdmin ? 'active' : 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, job: null });
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Profile | null>(null);

  const currentOrgId = profile?.org_id;

  const { startDate, endDate } = useMemo(() => {
    let startDate: string | undefined;
    let endDate: string | undefined;
    const now = dayjs();

    if (filterRange === 'today') {
      startDate = now.startOf('day').toISOString();
      endDate = now.endOf('day').toISOString();
    } else if (filterRange === 'week') {
      startDate = now.startOf('week').toISOString();
      endDate = now.endOf('day').toISOString();
    } else if (filterRange === 'month') {
      startDate = now.startOf('month').toISOString();
      endDate = now.endOf('day').toISOString();
    } else if (filterRange === 'year') {
      startDate = now.startOf('year').toISOString();
      endDate = now.endOf('day').toISOString();
    } else if (filterRange === 'custom' && customStartDate && customEndDate) {
      startDate = dayjs(customStartDate).startOf('day').toISOString();
      endDate = dayjs(customEndDate).endOf('day').toISOString();
    }
    return { startDate, endDate };
  }, [filterRange, customStartDate, customEndDate]);

  const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId, userRole],
    queryFn: () => getProfiles(currentOrgId!, userRole!),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentOrgId && !!userRole,
  });

  const { data: requestsCount = 0 } = useQuery<number, Error>({
    queryKey: ['jobRequestsCount', currentOrgId],
    queryFn: async () => {
      const { count } = await getJobs(currentOrgId!, userRole!, undefined, undefined, 'requested');
      return count || 0;
    },
    enabled: isOfficeOrAdmin && !!currentOrgId,
    refetchInterval: 30000,
  });

  const { data: driverActiveJobs = [] } = useQuery<Job[], Error>({
    queryKey: ['driverActiveJobs', currentOrgId, user?.id],
    queryFn: async () => {
      const { data } = await getJobs(currentOrgId!, 'driver', undefined, undefined, 'active');
      return data;
    },
    staleTime: 30 * 1000,
    enabled: userRole === 'driver' && !!currentOrgId && !!user?.id,
  });

  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', currentOrgId, userRole, startDate, endDate, jobStatusFilter],
    queryFn: async () => {
      const { data } = await getJobs(currentOrgId!, userRole, startDate, endDate, jobStatusFilter);
      return data;
    },
    enabled: !!currentOrgId && !!userRole,
  });

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return jobs.filter(job =>
      job.order_number?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_city?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_postcode?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_city?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_postcode?.toLowerCase().includes(lowerCaseSearchTerm) ||
      profiles.find(p => p.id === job.assigned_driver_id)?.full_name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [jobs, searchTerm, profiles]);

  const stats = useMemo(() => ({
    totalJobs: jobs.length,
    activeJobsCount: jobs.filter(job => !['delivered', 'pod_received', 'cancelled', 'requested'].includes(job.status)).length,
    completedJobsCount: jobs.filter(job => ['delivered', 'pod_received'].includes(job.status)).length,
    cancelledJobsCount: jobs.filter(job => job.status === 'cancelled').length,
  }), [jobs]);

  const handleJobTableAction = (type: DialogType, job: Job) => {
    setDialogState({ type, job });
  };

  const handleUpdateProgress = async (entries: any[]) => {
    if (!dialogState.job || !profile || !userRole || entries.length === 0) return;
    setIsActionBusy(true);
    try {
      for (const entry of entries.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())) {
        await updateJobProgress({
          job_id: dialogState.job.id,
          org_id: currentOrgId!,
          actor_id: profile.id,
          actor_role: userRole,
          new_status: entry.status,
          timestamp: entry.dateTime.toISOString(),
          notes: entry.notes.trim() || undefined,
        });
      }
      toast.success('Job progress updated!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number] });
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!dialogState.job || !profile || !userRole) return;
    setIsActionBusy(true);
    try {
      await updateJob({
        job_id: dialogState.job.id,
        org_id: currentOrgId!,
        actor_id: profile.id,
        actor_role: userRole,
        job_updates: { assigned_driver_id: driverId },
      });
      toast.success('Driver assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number] });
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      toast.error(`Assignment failed: ${err.message}`);
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleImageUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job?.order_number] });
    setDialogState({ type: null, job: null });
  };

  const handleConfirmCancel = async (jobId: string, cancellationPrice?: number) => {
    if (!currentOrgId || !profile || !userRole) return;
    try {
      await cancelJob(jobId, currentOrgId, profile.id, userRole, cancellationPrice);
      toast.success('Job cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setJobToCancel(null);
    } catch (error: any) {
      toast.error(`Failed to cancel job: ${error.message}`);
    }
  };

  return {
    // State
    user,
    profile,
    userRole,
    isOfficeOrAdmin,
    isLoading: isLoadingAuth || isLoadingProfiles || isLoadingJobs,
    error: jobsError,
    navigate,

    // Filters
    filterRange, setFilterRange,
    jobStatusFilter, setJobStatusFilter,
    searchTerm, setSearchTerm,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,

    // Data
    jobs,
    profiles,
    requestsCount,
    driverActiveJobs,
    filteredJobs,
    stats,

    // Dialogs & Actions
    dialogState, setDialogState,
    isActionBusy,
    jobToCancel, setJobToCancel,
    viewingDriver, setViewingDriver,

    // Handlers
    handleJobTableAction,
    handleUpdateProgress,
    handleAssignDriver,
    handleImageUploadSuccess,
    handleConfirmCancel,
  };
};