"use client";

import React, { useEffect, useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getJobs, getProfiles, getTenants } from '@/lib/supabase';
import { Job, Profile, Tenant } from '@/utils/mockData';
import JobsTable from '@/components/JobsTable';
import { Loader2, PlusCircle, Users, CalendarIcon, Search, Truck, CheckCircle2, XCircle } from 'lucide-react'; // Added Truck, CheckCircle2, XCircle for StatCard icons
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { Input } from '@/components/ui/input'; // Import Input for search bar
import StatCard from '@/components/StatCard'; // Import the new StatCard component

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type JobStatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

const Index = () => {
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('active'); // New state for job status filter
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
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
    queryKey: ['profiles', selectedOrgId, userRole], // Add userRole to query key
    queryFn: () => getProfiles(currentOrgId, userRole), // Pass userRole
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedOrgId && !!user && !!currentProfile && !isLoadingAuth && !!userRole, // Ensure userRole is defined
    onError: (err) => console.error("Profiles query failed", err),
  });

  // Fetch jobs
  const { data: jobs = [], isLoading: isLoadingJobs, error: jobsError } = useQuery<Job[], Error>({
    queryKey: ['jobs', selectedOrgId, userRole, startDate, endDate, jobStatusFilter], // Add jobStatusFilter to query key
    queryFn: () => getJobs(selectedOrgId!, userRole!, startDate, endDate, jobStatusFilter), // Pass jobStatusFilter to getJobs
    staleTime: 60 * 1000, // Cache jobs for 1 minute
    enabled: !!selectedOrgId && !!user && !!currentProfile && !!userRole && !isLoadingAuth,
    onError: (err) => console.error("Jobs query failed", err),
  });

  const isLoading = isLoadingAuth || isLoadingTenants || isLoadingProfiles || isLoadingJobs;
  const error = tenantsError || profilesError || jobsError;

  // Filter jobs by search term on the client side
  const filteredJobs = React.useMemo(() => {
    if (!searchTerm) return jobs;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return jobs.filter(job =>
      job.order_number?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.collection_city?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      job.delivery_city?.toLowerCase().includes(lowerCaseSearchTerm) ||
      profiles.find(p => p.id === job.assigned_driver_id)?.full_name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [jobs, searchTerm, profiles]);

  // Calculate job statistics for StatCards
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => !['delivered', 'pod_received', 'cancelled'].includes(job.status)).length;
  const completedJobs = jobs.filter(job => ['delivered', 'pod_received'].includes(job.status)).length;
  const cancelledJobs = jobs.filter(job => job.status === 'cancelled').length;


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    console.error("Dashboard query error:", error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">Dashboard failed to load</p>
        <p className="text-sm text-gray-700">{error.message}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-600 font-bold mb-2">No role assigned to your user account.</p>
        <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(profile, null, 2)}</pre>
        <Button onClick={() => navigate('/login')} variant="outline" className="mt-4">
          Log In Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full"> {/* Removed min-h-screen and explicit padding, handled by App.tsx main */}
      <div className="max-w-7xl mx-auto"> {/* Centering content */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Haulage Office Dashboard</h1>
          <div className="flex items-center space-x-2">
            {canAccessAdminUsers && (
              <Button onClick={() => navigate('/admin/users')} variant="outline">
                <Users className="h-4 w-4 mr-2" /> Admin Users
              </Button>
            )}
            {/* "Create New Job" button is now in the Header component */}
          </div>
        </div>

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
            value={activeJobs}
            icon={Truck}
            iconColorClass="text-yellow-600"
            valueColorClass="text-yellow-800"
            description="Jobs currently in progress"
          />
          <StatCard
            title="Completed Jobs"
            value={completedJobs}
            icon={CheckCircle2}
            iconColorClass="text-green-600"
            valueColorClass="text-green-800"
            description="Jobs successfully delivered"
          />
          <StatCard
            title="Cancelled Jobs"
            value={cancelledJobs}
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
            {filteredJobs.length > 0 ? (
              <JobsTable jobs={filteredJobs} profiles={profiles} />
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