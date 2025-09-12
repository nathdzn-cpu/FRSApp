"use client";

import React, { useState, useEffect } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { getJobs, cancelJob, updateJob, updateJobProgress } from '@/lib/api/jobs';
import { getProfiles } from '@/lib/api/profiles';
import { getTenants } from '@/lib/api/tenants';
import { Job, Profile, Tenant } from '@/types';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

import ActiveJobBanner from '@/components/driver/ActiveJobBanner';
import DriverJobsTable from '@/components/driver/DriverJobsTable';
import JobsTable from '@/components/JobsTable';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardFilters, { DateRangeFilter, JobStatusFilter } from '@/components/dashboard/DashboardFilters';
import DashboardDialogs, { DialogType, DialogState } from '@/components/dashboard/DashboardDialogs';

const Index = () => {
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dialogState, setDialogState] = useState<DialogState>({ type: null, job: null });
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null);
  const [isDriverDetailOpen, setIsDriverDetailOpen] = useState(false);

  const currentOrgId = profile?.org_id;
  const currentProfile = profile;
  const canAccessAdminUsers = userRole === 'admin';

  const { data: tenants = [] } = useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: getTenants,
    enabled: !!user && !!currentProfile,
  });

  useEffect(() => {
    if (tenants.length > 0 && currentProfile && !selectedOrgId) {
      setSelectedOrgId(currentProfile.org_id || tenants[0]?.id);
    }
  }, [tenants, currentProfile, selectedOrgId]);

  useEffect(() => {
    if (!currentOrgId || userRole === 'driver') return;
    const channel = supabase
      .channel(`jobs-org-${currentOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `org_id=eq.${currentOrgId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['driverActiveJobs'] });
          if (payload.new && (payload.new as Job).order_number) {
            queryClient.invalidateQueries({ queryKey: ['jobDetail', (payload.new as Job).order_number] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentOrgId, userRole, queryClient]);

  const getJobDateFilters = () => {
    let startDate: string | undefined, endDate: string | undefined;
    const now = dayjs();
    if (filterRange === 'today') { startDate = now.startOf('day').toISOString(); endDate = now.endOf('day').toISOString(); }
    else if (filterRange === 'week') { startDate = now.startOf('week').toISOString(); endDate = now.endOf('week').toISOString(); }
    else if (filterRange === 'month') { startDate = now.startOf('month').toISOString(); endDate = now.endOf('month').toISOString(); }
    else if (filterRange === 'year') { startDate = now.startOf('year').toISOString(); endDate = now.endOf('year').toISOString(); }
    else if (filterRange === 'custom' && customStartDate && customEndDate) { startDate = dayjs(customStartDate).startOf('day').toISOString(); endDate = dayjs(customEndDate).endOf('day').toISOString(); }
    return { startDate, endDate };
  };

  const { startDate, endDate } = getJobDateFilters();

  const { data: profiles = [] } = useQuery<Profile[], Error>({
    queryKey: ['profiles', selectedOrgId, userRole],
    queryFn: () => getProfiles(currentOrgId!, userRole!),
    enabled: !!selectedOrgId && !!userRole,
  });

  const { data: driverActiveJobs = [] } = useQuery<Job[], Error>({
    queryKey: ['driverActiveJobs', currentOrgId, user?.id],
    queryFn: () => getJobs(currentOrgId!, 'driver', undefined, undefined, 'active'),
    enabled: userRole === 'driver' && !!currentOrgId && !!user?.id,
  });

  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', selectedOrgId, userRole, startDate, endDate, jobStatusFilter],
    queryFn: () => getJobs(selectedOrgId!, userRole!, startDate, endDate, jobStatusFilter),
    enabled: !!selectedOrgId && !!userRole,
  });

  const filteredJobs = React.useMemo(() => {
    if (!searchTerm) return jobs;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return jobs.filter(job =>
      job.order_number?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      profiles.find(p => p.id === job.assigned_driver_id)?.full_name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [jobs, searchTerm, profiles]);

  const totalJobs = jobs.length;
  const activeJobsCount = jobs.filter(job => !['delivered', 'pod_received', 'cancelled'].includes(job.status)).length;
  const completedJobsCount = jobs.filter(job => ['delivered', 'pod_received'].includes(job.status)).length;
  const cancelledJobsCount = jobs.filter(job => job.status === 'cancelled').length;

  const handleJobTableAction = (type: DialogType, job: Job) => setDialogState({ type, job });
  const handleDriverSelect = (driver: Profile) => { setSelectedDriver(driver); setIsDriverDetailOpen(true); };

  const handleUpdateProgress = async (entries: any[]) => {
    if (!dialogState.job || !currentProfile || !userRole) return;
    setIsActionBusy(true);
    try {
      const sortedEntries = [...entries].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
      for (const entry of sortedEntries) {
        await updateJobProgress({
          job_id: dialogState.job.id, org_id: currentOrgId!, actor_id: currentProfile.id,
          actor_role: userRole, action: entry.status, timestamp: entry.dateTime.toISOString(), notes: entry.notes.trim() || undefined,
        });
      }
      toast.success('Job progress updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number] });
      setDialogState({ type: null, job: null });
    } catch (err) { toast.error("An unexpected error occurred."); }
    finally { setIsActionBusy(false); }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!dialogState.job || !currentProfile || !userRole) return;
    setIsActionBusy(true);
    try {
      await updateJob({
        job_id: dialogState.job.id, org_id: currentOrgId!, actor_id: currentProfile.id, actor_role: userRole,
        job_updates: { assigned_driver_id: driverId },
      });
      toast.success('Driver assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job.order_number] });
      setDialogState({ type: null, job: null });
    } catch (err) { toast.error("An unexpected error occurred."); }
    finally { setIsActionBusy(false); }
  };

  const handleImageUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['jobDetail', dialogState.job?.order_number] });
    setDialogState({ type: null, job: null });
  };

  const handleCancelJob = (job: Job) => { setJobToCancel(job); setIsCancelConfirmOpen(true); };

  const confirmCancelJob = async () => {
    if (!jobToCancel || !currentProfile || !userRole) return;
    setIsActionBusy(true);
    try {
      await cancelJob(jobToCancel.id, currentOrgId!, currentProfile.id, userRole);
      toast.success(`Job ${jobToCancel.order_number} cancelled successfully!`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobDetail', jobToCancel.order_number] });
      setJobToCancel(null);
      setIsCancelConfirmOpen(false);
    } catch (err) { toast.error("An unexpected error occurred."); }
    finally { setIsActionBusy(false); }
  };

  if (isLoadingAuth || (!!currentOrgId && isLoadingJobs)) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (jobsError) {
    return <div className="text-red-600 p-4">{jobsError.message}</div>;
  }

  if (!user || !profile || !userRole) {
    return <div className="p-4"><Button onClick={() => navigate('/login')}>Log In</Button></div>;
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader canAccessAdminUsers={canAccessAdminUsers} />

        {userRole === 'driver' && driverActiveJobs.length > 0 && (
          <ActiveJobBanner activeJobs={driverActiveJobs} onDismiss={() => queryClient.invalidateQueries({ queryKey: ['driverActiveJobs'] })} />
        )}

        <DashboardStats
          totalJobs={totalJobs}
          activeJobsCount={activeJobsCount}
          completedJobsCount={completedJobsCount}
          cancelledJobsCount={cancelledJobsCount}
        />

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <DashboardFilters
            jobStatusFilter={jobStatusFilter}
            setJobStatusFilter={setJobStatusFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterRange={filterRange}
            setFilterRange={setFilterRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
          <CardContent className="p-0 pt-4">
            {userRole === 'driver' ? (
              <DriverJobsTable jobs={filteredJobs} onAction={handleJobTableAction} />
            ) : (
              <JobsTable
                jobs={filteredJobs}
                profiles={profiles}
                userRole={userRole}
                currentProfile={currentProfile}
                currentOrgId={currentOrgId!}
                onAction={handleJobTableAction}
                onCancelJob={handleCancelJob}
                onDriverSelect={handleDriverSelect}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />

      <DashboardDialogs
        dialogState={dialogState}
        setDialogState={setDialogState}
        jobToCancel={jobToCancel}
        isCancelConfirmOpen={isCancelConfirmOpen}
        setIsCancelConfirmOpen={setIsCancelConfirmOpen}
        selectedDriver={selectedDriver}
        isDriverDetailOpen={isDriverDetailOpen}
        setIsDriverDetailOpen={setIsDriverDetailOpen}
        currentProfile={currentProfile}
        userRole={userRole}
        isActionBusy={isActionBusy}
        setIsActionBusy={setIsActionBusy}
        driverActiveJobs={driverActiveJobs}
        profiles={profiles}
        currentOrgId={currentOrgId!}
        jobs={jobs}
        handleUpdateProgress={handleUpdateProgress}
        handleAssignDriver={handleAssignDriver}
        handleImageUploadSuccess={handleImageUploadSuccess}
        confirmCancelJob={confirmCancelJob}
      />
    </div>
  );
};

export default Index;