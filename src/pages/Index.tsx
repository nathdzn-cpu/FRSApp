"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
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
import DriverDetailDialog from '@/components/DriverDetailDialog';

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

type DialogType = 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage';

interface DialogState {
  type: DialogType | null;
  job: Job | null;
}

const Index = () => {
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, job: null });
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null); // State for job to cancel
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false); // State for cancel confirmation dialog
  const [viewingDriver, setViewingDriver] = useState<Profile | null>(null);
  const navigate = useNavigate();

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  const canCreateJob = userRole === 'admin' || userRole === 'office';
  const canAccessAdminUsers = userRole === 'admin';

  // Fetch tenants
  const { data: tenants = [], isLoading: isLoadingTenants, error: tenantsError } = useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: getTenants,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !!currentProfile && !isLoadingAuth,
    onError: (err) => console.error("Tenants query failed", err),
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
    onError: (err) => console.error("Profiles query failed", err),
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
    onError: (err) => console.error("Jobs query failed", err),
  });

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
    setIsCancelConfirmOpen(true);
  };

  const confirmCancelJob = async () => {
    if (!jobToCancel || !currentProfile || !userRole) {
      toast.error("Job to cancel or user profile/role not found. Cannot cancel job.");
      return;
    }

    setIsActionBusy(true);
    try {
      const promise = cancelJob(jobToCancel.id, currentOrgId, currentProfile.id, userRole);
      toast.promise(promise, {
        loading: `Cancelling job ${jobToCancel.order_number}...`,
        success: `Job ${jobToCancel.order_number} cancelled successfully!`,
        error: (err) => `Failed to cancel job: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', jobToCancel.order_number, userRole] });
      setJobToCancel(null);
      setIsCancelConfirmOpen(false);
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
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Haulage Office Dashboard</h1>
          <div className="flex items-center space-x-2">
            {canAccessAdminUsers && (
              <Button onClick={() => navigate('/admin/users')} variant="outline">
                <Users className="h-4 w-4 mr-2" /> Admin Users
              </Button>
            )}
          </div>
        </div>

        {userRole === 'driver' && driverActiveJobs.length > 0 && (
          <ActiveJobBanner activeJobs={driverActiveJobs} onDismiss={() => queryClient.invalidateQueries({ queryKey: ['driverActiveJobs'] })} />
        )}

        {/* Stat Cards Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title="Total Jobs"
            value={totalJobs}
            icon={Truck}
            iconColorClass="text-blue-600"
            valueColorClass="text-blue-800"
            description="All jobs in the system"
          />
          <StatCard
            title="Active Jobs"
            value={activeJobsCount}
            icon={Truck}
            iconColorClass="text-yellow-600"
            valueColorClass="text-yellow-800"
            description="Jobs currently in progress"
          />
          <StatCard
            title="Completed Jobs"
            value={completedJobsCount}
            icon={CheckCircle2}
            iconColorClass="text-green-600"
            valueColorClass="text-green-800"
            description="Jobs successfully delivered"
          />
          <StatCard
            title="Cancelled Jobs"
            value={cancelledJobsCount}
            icon={XCircle}
            iconColorClass="text-red-600"
            valueColorClass="text-red-800"
            description="Jobs that were cancelled"
          />
        </div>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-center p-0 pb-4 sticky top-0 bg-[var(--saas-card-bg)] z-10 border-b border-[var(--saas-border)] -mx-6 px-6 pt-6 -mt-6">
            <CardTitle className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Jobs</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
              {/* Status Filter Buttons */}
              <div className="flex space-x-1 rounded-full bg-gray-100 p-1">
                <Button
                  variant={jobStatusFilter === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    jobStatusFilter === 'active' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
                  )}
                  onClick={() => setJobStatusFilter('active')}
                >
                  Active
                </Button>
                <Button
                  variant={jobStatusFilter === 'completed' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    jobStatusFilter === 'completed' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
                  )}
                  onClick={() => setJobStatusFilter('completed')}
                >
                  Completed
                </Button>
                <Button
                  variant={jobStatusFilter === 'cancelled' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    jobStatusFilter === 'cancelled' ? "bg-blue-600 text-white hover:bg-blue-700" : "text-gray-700 hover:bg-gray-200"
                  )}
                  onClick={() => setJobStatusFilter('cancelled')}
                >
                  Cancelled
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Date Range Filter */}
              <Label htmlFor="job-filter-range" className="sr-only sm:not-sr-only text-gray-500">Filter by date:</Label>
              <Select value={filterRange} onValueChange={(value: DateRangeFilter) => setFilterRange(value)}>
                <SelectTrigger id="job-filter-range" className="w-full sm:w-[180px] rounded-full">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-sm rounded-xl">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {filterRange === 'custom' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal rounded-full",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span>-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal rounded-full",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            {userRole === 'driver' ? (
              <DriverJobsTable
                jobs={filteredJobs}
                onAction={handleJobTableAction}
              />
            ) : (
              <div className="overflow-x-auto">
                <JobsTable
                  jobs={filteredJobs}
                  profiles={profiles}
                  userRole={userRole}
                  currentProfile={currentProfile}
                  currentOrgId={currentOrgId}
                  onAction={handleJobTableAction}
                  onCancelJob={handleCancelJob}
                  onViewDriverProfile={handleViewDriverProfile}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />

      {/* Dialogs */}
      {viewingDriver && (
        <DriverDetailDialog
          open={!!viewingDriver}
          onOpenChange={() => setViewingDriver(null)}
          driver={viewingDriver}
        />
      )}
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
    </div>
  );
};

export default Index;