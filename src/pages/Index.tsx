import React, { useEffect, useState } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from '@/context/AuthContext'; // Updated import
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

type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const Index = () => {
  const { user, profile, userRole, isLoadingAuth } = useAuth(); // Use useAuth
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [loadingData, setLoadingData] = useState(true); // Renamed to avoid conflict with isLoadingAuth
  const [error, setError] = useState<string | null>(null);
  const [filterRange, setFilterRange] = useState<DateRangeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const navigate = useNavigate();

  const currentTenantId = profile?.tenant_id || 'demo-tenant-id'; // Use profile's tenant_id
  const currentProfile = profile; // Use profile from AuthContext
  const canCreateJob = userRole === 'admin' || userRole === 'office';
  const canAccessAdminUsers = userRole === 'admin';

  const fetchData = async () => {
    if (!user || !currentProfile) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      const fetchedTenants = await getTenants();
      setTenants(fetchedTenants);
      // Ensure selectedTenantId is set, ideally from user's profile or a default
      const defaultTenantId = currentProfile.tenant_id || fetchedTenants[0]?.id;
      setSelectedTenantId(defaultTenantId);

      if (defaultTenantId) {
        const fetchedProfiles = await getProfiles(defaultTenantId);
        setProfiles(fetchedProfiles);

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

        const fetchedJobs = await getJobs(defaultTenantId, userRole!, currentProfile?.id, startDate, endDate); // userRole is guaranteed here
        setJobs(fetchedJobs);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && profile) { // Only fetch data if user and profile are loaded
      fetchData();
    } else if (!isLoadingAuth && !user) {
      // If not loading auth and no user, it means we're not logged in, AuthContext will redirect
      setLoadingData(false);
    }
  }, [user, profile, userRole, filterRange, customStartDate, customEndDate, isLoadingAuth]);

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by PrivateRoute or AuthContext redirect
    return null;
  }

  // If user is logged in but no profile/role is found
  if (!profile || userRole === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">No role assigned to your user account. Please contact an administrator.</p>
        <Button onClick={() => navigate('/login')} variant="outline">
          Log In Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Haulage Office Dashboard</h1>
          <div className="flex items-center space-x-2">
            {canAccessAdminUsers && (
              <Button onClick={() => navigate('/admin/users')} variant="outline">
                <Users className="h-4 w-4 mr-2" /> Admin Users
              </Button>
            )}
            {canCreateJob && (
              <Button onClick={() => navigate('/jobs/new')} className="mr-4">
                <PlusCircle className="h-4 w-4 mr-2" /> Create New Job
              </Button>
            )}
            {/* Role switcher removed */}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Active Jobs</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
            <Label htmlFor="job-filter-range" className="sr-only sm:not-sr-only">Filter by date:</Label>
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

          {jobs.length > 0 ? (
            <JobsTable jobs={jobs} profiles={profiles} />
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No jobs found for this tenant with the selected filter.</p>
          )}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;