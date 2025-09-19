"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, getJobs } from '@/lib/supabase';
import { Job, Profile, JobProgressLog } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserPlus, Search, Truck, MapPin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import DriverDetailDialog from '@/components/DriverDetailDialog'; // Import the new dialog component
import dayjs from 'dayjs'; // Import dayjs for date calculations
import isToday from 'dayjs/plugin/isToday';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import DriverCard from '@/components/DriverCard'; // Import the new DriverCard component

dayjs.extend(isToday);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

const Drivers: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth, isOfficeOrAdmin } = useAuth();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const canCreateUser = isOfficeOrAdmin;

  const fetchData = async () => {
    if (!user || !profile) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      // Fetch all profiles for the current organization
      const fetchedProfiles = await getProfiles(currentOrgId, userRole);
      setAllProfiles(fetchedProfiles);

      // Fetch all jobs for the current organization
      const fetchedJobs = await getJobs(currentOrgId, userRole, undefined, undefined, 'all');
      setAllJobs(fetchedJobs);

    } catch (err: any) {
      console.error("Failed to fetch data for drivers page:", err);
      setError(err.message || "Failed to load data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoadingAuth) return;
    fetchData();
  }, [user, profile, userRole, isLoadingAuth, currentOrgId]);

  const drivers = useMemo(() => {
    return allProfiles.filter(p => p.role === 'driver');
  }, [allProfiles]);

  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) {
      return drivers;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return drivers.filter(
      (driver) =>
        driver.full_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (driver.truck_reg && driver.truck_reg.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (driver.trailer_no && driver.trailer_no.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [drivers, searchTerm]);

  const getDriverStats = (driverId: string) => {
    const driverJobs = allJobs.filter(job => job.assigned_driver_id === driverId);
    const now = dayjs();
    const startOfWeek = now.startOf('week');
    const endOfWeek = now.endOf('week');

    const activeJobs = driverJobs.filter(job => !['delivered', 'pod_received', 'cancelled'].includes(job.status)).length;
    
    const jobsToday = driverJobs.filter(job => {
      const completionDate = job.last_status_update_at ? dayjs(job.last_status_update_at) : dayjs(job.delivery_date);
      return (job.status === 'delivered' || job.status === 'pod_received' || job.status === 'cancelled') && completionDate.isToday();
    }).length;

    const jobsThisWeek = driverJobs.filter(job => {
      const completionDate = job.last_status_update_at ? dayjs(job.last_status_update_at) : dayjs(job.delivery_date);
      return (job.status === 'delivered' || job.status === 'pod_received' || job.status === 'cancelled') && completionDate.isBetween(startOfWeek, endOfWeek, null, '[]');
    }).length;

    return { activeJobs, jobsToday, jobsThisWeek };
  };

  const handleViewDetails = (driver: Profile) => {
    setSelectedDriver(driver);
    setIsDetailDialogOpen(true);
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading drivers data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
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

  return (
    <div className="w-full">
      <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Button>

      <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
          <CardTitle className="text-2xl font-bold text-gray-900">Drivers List</CardTitle>
          {canCreateUser && (
            <Button onClick={() => navigate('/admin/users/new/driver')} className="bg-blue-600 text-white hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" /> New Driver
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search drivers by name, vehicle reg, or trailer no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {filteredDrivers.length === 0 ? (
            <p className="text-gray-600">No drivers found matching your criteria.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDrivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  stats={getDriverStats(driver.id)}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDriver && (
        <DriverDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          driver={selectedDriver}
          allJobs={allJobs.filter(j => j.assigned_driver_id === selectedDriver.id)}
        />
      )}
    </div>
  );
};

export default Drivers;