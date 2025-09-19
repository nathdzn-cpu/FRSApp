"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getJobs, getProfiles, cancelJob, getTenants } from '@/lib/supabase';
import { Job, Profile, Tenant } from '@/utils/mockData';
import { Loader2, PlusCircle, Users, CalendarIcon, Search, Truck, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { Input } from '@/components/ui/input';
import StatCard from '@/components/StatCard';
import JobsTable from '@/components/JobsTable';
import JobProgressUpdateDialog from '@/components/job-detail/JobProgressUpdateDialog';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import JobAttachmentsDialog from '@/components/JobAttachmentsDialog';
import { updateJob, updateJobProgress } from '@/lib/api/jobs';
import { toast } from 'sonner';
import ActiveJobBanner from '@/components/driver/ActiveJobBanner';
import DriverJobsTable from '@/components/driver/DriverJobsTable';
import ImageUploadDialog from '@/components/driver/ImageUploadDialog';
import CancelJobDialog from '@/components/CancelJobDialog';
import DriverDetailDialog from '@/components/DriverDetailDialog';
import { supabase } from '@/lib/supabaseClient';

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

type DialogType = 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage';

interface DialogState {
  type: DialogType | null;
  job: Job | null;
}

const Index = () => {
  const { user, profile, userRole, isLoadingAuth, isAdmin, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('all'); // Changed default to 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, job: null });
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Profile | null>(null);
  const navigate = useNavigate();

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  const canCreateJob = isOfficeOrAdmin;
  const canAccessAdminUsers = isAdmin;

  // Fetch tenants
  const { data: tenants = [], isLoading: isLoadingTenants, error: tenantsError } = useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: getTenants,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !!currentProfile && !isLoadingAuth,
  });

  // Set selectedOrgId once tenants and profile are loaded
  useEffect(() => {
    if (tenants.length > 0 && currentProfile && !selectedOrgId) {
      setSelectedOrgId(currentProfile.org_id || tenants[0]?.id);
    }
  }, [tenants, currentProfile, selectedOrgId]);

  // Determine date filters for jobs query (using created_at)
  const getJobDateFilters = () => {
    let startDate: string | undefined;
    let endDate: string | undefined;
    const now = dayjs();

    if (filterRange === 'today') {
      startDate = now.startOf('day').toISOString();
      endDate = now.endOf('day').toISOString();
    } else if (filterRange === 'week') {
      startDate = now.startOf('week').toISOString();
      endDate = now.endOf('week').toISOString();
    } else if (filterRange === 'month') {
      startDate = now.startOf('month').toISOString();
      endDate = now.endOf('month').toISOString();
    } else if (filterRange === 'year') {
      startDate = now.startOf('year').toISOString();
      endDate = now.endOf('year').toISOString();
    } else if (filterRange === 'custom' && customStartDate && customEndDate) {
      startDate = dayjs(customStartDate).startOf('day').toISOString();
      endDate = dayjs(customEndDate).endOf('day').toISOString();
    }
    return { startDate, endDate };
  };

  const { startDate, endDate } = getJobDateFilters();

  // Fetch profiles
  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', selectedOrgId, userRole],
    queryFn: () => getProfiles(currentOrgId, userRole),
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedOrgId && !!user && !!currentProfile && !isLoadingAuth && !!userRole,
  });

  // Fetch active jobs specifically for the current driver (used for banner and progression rules)
  const { data: driverActiveJobs = [], isLoading: isLoadingDriverActiveJobs, error: driverActiveJobsError } = useQuery<Job[], Error>({
    queryKey: ['driverActiveJobs', currentOrgId, user?.id],
    queryFn: () => getJobs(currentOrgId, 'driver', undefined, undefined, 'active'),
    staleTime: 30 * 1000,
    enabled: userRole === 'driver' && !!currentOrgId && !!user?.id && !isLoadingAuth,
  });

  // Fetch jobs
  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', selectedOrgId, userRole, startDate, endDate, jobStatusFilter],
    queryFn: () => getJobs(selectedOrgId!, userRole!, startDate, endDate, jobStatusFilter),
    staleTime: 60 * 1000,
    enabled: !!selectedOrgId && !!user && !!currentProfile && !!userRole && !isLoadingAuth,
  });

  // Periodically check for overdue jobs
  const { data: overdueJobsData } = useQuery({
    queryKey: ['checkOverdueJobs'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-overdue-jobs');
      if (error) throw error;
      return data;
    },
    enabled: userRole === 'admin' || userRole === 'office',
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes
    refetchOnWindowFocus: true,
    staleTime: 4 * 60 * 1000,
  });

  useEffect(() => {
    if (overdueJobsData && (overdueJobsData as any).notifiedJobs > 0) {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  }, [overdueJobsData, queryClient]);

  const isLoading = isLoadingAuth || isLoadingTenants || isLoadingProfiles || isLoadingJobs || isLoadingDriverActiveJobs;
  const error = tenantsError || profilesError || jobsError || driverActiveJobsError;

  // Filter jobs by search term on the client side
  const filteredJobs = React.useMemo(() => {
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

  // Calculate job statistics for StatCards
  const totalJobs = jobs.length;
  const activeJobsCount = jobs.filter(job => !['delivered', 'pod_received', 'cancelled'].includes(job.status)).length;
  const completedJobsCount = jobs.filter(job => ['delivered', 'pod_received'].includes(job.status)).length;
  const cancelledJobsCount = jobs.filter(job => job.status === 'cancelled').length;

  const handleJobTableAction = (type: DialogType, job: Job) => {
    setDialogState({ type, job });
  };

  const handleUpdateProgress = async (entries: any[]) => { // entries will be ProgressUpdateEntry[]
    if (!dialogState.job || !currentProfile || !userRole || entries.length === 0) {
      toast.error("No job or user profile/role found, or no status updates to log.");
      return;
    }

    setIsActionBusy(true);
    try {
      const sortedEntries = [...entries].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

      for (const entry of sortedEntries) {
        const payload = {
          job_id: dialogState.job.id,
          org_id: currentOrgId,
          actor_id: currentProfile.id,
          actor_role: userRole,
          new_status: entry.status,
          timestamp: entry.dateTime.toISOString(),
          notes: entry.notes.trim() || undefined,
        };
        await updateJobProgress(payload);
      }
      toast.success('Job progress updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number, userRole] });
      queryClient.invalidateQueries({ queryKey: ['driverActiveJobs'] });
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      toast.error("An unexpected error occurred while updating job progress.");
      throw err;
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!dialogState.job || !currentProfile || !userRole) {
      toast.error("No job or user profile/role found. Cannot assign driver.");
      return;
    }
    setIsActionBusy(true);
    try {
      const jobUpdates: Partial<Job> = {
        assigned_driver_id: driverId,
      };

      const payload = {
        job_id: dialogState.job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
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
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number, userRole] });
      queryClient.invalidateQueries({ queryKey: ['driverActiveJobs'] });
      setDialogState({ type: null, job: null });
    } catch (err: any) {
      console.error("Error assigning driver:", err);
      toast.error("An unexpected error occurred while assigning the driver.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleImageUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job?.order_number, userRole] });
    setDialogState({ type: null, job: null });
  };

  const handleCancelJob = (job: Job) => {
    setJobToCancel(job);
  };

  const confirmCancelJob = async (cancellationPrice: number) => {
    if (!jobToCancel || !currentProfile || !userRole) {
      toast.error("Job to cancel or user profile/role not found. Cannot cancel job.");
      return;
    }

    setIsActionBusy(true);
    try {
      const promise = cancelJob(jobToCancel.id, currentOrgId, currentProfile.id, userRole, cancellationPrice);
      toast.promise(promise, {
        loading: `Cancelling job ${jobToCancel.order_number}...`,
        success: `Job ${jobToCancel.order_number} cancelled successfully!`,
        error: (err) => `Failed to cancel job: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', jobToCancel.order_number, userRole] });
      setJobToCancel(null);
    } catch (err: any) {
      console.error("Error cancelling job:", err);
      toast.error("An unexpected error occurred while cancelling the job.");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleViewDriverProfile = (driver: Profile) => {
    setViewingDriver(driver);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    console.error("Dashboard query error:", error);
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">Dashboard failed to load</p>
        <p className="text-sm text-gray-700">{error.message}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">You are not logged in.</p>
        <Button onClick={() => navigate('/login')} variant="outline">
          Log In
        </Button>
      </div>
    );
  }

  if (!profile || userRole === undefined) {
    console.warn("Profile or role missing:", { profile, userRole });
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">No role assigned to your user account.</p>
        <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(profile, null, 2)}</pre>
        <Button onClick={() => navigate('/login')} variant="outline" className="mt-4">
          Log In Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Jobs Dashboard</h1>
        {userRole !== 'driver' && (
          <div className="flex items-center space-x-2">
            <Button onClick={() => navigate('/create-job')}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Job
            </Button>
          </div>
        )}
      </div>
      <JobsTable />
    </div>
  );
};

export default Index;