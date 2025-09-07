"use client";

import React, { useEffect, useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getJobs, getProfiles, getTenants } from '@/lib/supabase';
import { Job, Profile, Tenant } from '@/utils/mockData';
import JobsTable from '@/components/JobsTable';
import { Loader2, PlusCircle, Users, CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import the new utility

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const Index = () => {
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
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
    queryKey: ['profiles', selectedOrgId],
    queryFn: () => getProfiles(selectedOrgId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedOrgId && !!user && !!currentProfile && !isLoadingAuth,
    onError: (err) => console.error("Profiles query failed", err),
  });

  // Fetch jobs
  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', selectedOrgId, userRole, startDate, endDate],
    queryFn: () => getJobs(selectedOrgId!, userRole!, startDate, endDate),
    staleTime: 60 * 1000, // Cache jobs for 1 minute
    enabled: !!selectedOrgId && !!user && !!currentProfile && !!userRole && !isLoadingAuth,
    onError: (err) => console.error("Jobs query failed", err),
  });

  const isLoading = isLoadingAuth || isLoadingTenants || isLoadingProfiles || isLoadingJobs;
  const error = tenantsError || profilesError || jobsError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    console.error("Dashboard query error:", error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-600 font-bold mb-2">Dashboard failed to load</p>
        <p className="text-sm text-gray-700">{error.message}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-600 font-bold mb-2">No role assigned to your user account.</p>
        <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(profile, null, 2)}</pre>
        <Button onClick={() => navigate('/login')} variant="outline" className="mt-4">
          Log In Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Haulage Office Dashboard</h1>
          <div className="flex items-center space-x-2">
            {canAccessAdminUsers && (
              <Button onClick={() => navigate('/admin/users')} variant="outline">
                <Users className="h-4 w-4 mr-2" /> Admin Users
              </Button>
            )}
            {canCreateJob && (
              <Button onClick={() => navigate('/jobs/new')} className="bg-blue-600 text-white hover:bg-blue-700">
                <PlusCircle className="h-4 w-4 mr-2" /> Create New Job
              </Button>
            )}
          </div>
        </div>

        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-row justify-between items-center p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Active Jobs</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Label htmlFor="job-filter-range" className="sr-only sm:not-sr-only text-gray-500">Filter by date:</Label>
              <Select value={filterRange} onValueChange={(value: DateRangeFilter) => setFilterRange(value)}>
                <SelectTrigger id="job-filter-range" className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
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
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "PPP") : <span>Start Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "PPP") : <span>End Date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
            {jobs.length > 0 ? (
              <JobsTable jobs={jobs} profiles={profiles} />
            ) : (
              <p className="text-gray-600">No jobs found for this tenant with the selected filter.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;