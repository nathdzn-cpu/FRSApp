"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Phone,
  Mail,
  Truck,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  CalendarDays,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Profile, Job } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { formatGBPDisplay, formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { getJobs } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

dayjs.extend(weekOfYear);

interface DriverDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Profile;
  allJobs: Job[];
  currentOrgId: string;
  onJobView: (orderNumber: string) => void;
}

const DriverDetailDialog: React.FC<DriverDetailDialogProps> = ({
  open,
  onOpenChange,
  driver,
  allJobs,
  currentOrgId,
  onJobView,
}) => {
  const { userRole } = useAuth();
  const [driverJobs, setDriverJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !driver.id || !currentOrgId || !userRole) {
      setDriverJobs([]);
      setLoadingJobs(false);
      return;
    }

    const fetchDriverJobs = async () => {
      setLoadingJobs(true);
      setJobsError(null);
      try {
        const assignedJobs = allJobs.filter(job => job.assigned_driver_id === driver.id);
        setDriverJobs(assignedJobs);
      } catch (err: any) {
        console.error("Failed to fetch driver's jobs:", err);
        setJobsError(err.message || "Failed to load driver's jobs.");
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchDriverJobs();
  }, [open, driver.id, allJobs, currentOrgId, userRole]);

  const driverInitials = driver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const driverEmail = "N/A";

  const completedJobs = useMemo(() => {
    return driverJobs.filter(job => ['delivered', 'pod_received'].includes(job.status));
  }, [driverJobs]);

  const calculateRevenue = (filter: 'today' | 'week' | 'month') => {
    const now = dayjs();
    return completedJobs.reduce((sum, job) => {
      if (!job.last_status_update_at) return sum;

      const completionDate = dayjs(job.last_status_update_at);
      let include = false;

      if (filter === 'today' && completionDate.isSame(now, 'day')) {
        include = true;
      } else if (filter === 'week' && completionDate.isSame(now, 'week')) {
        include = true;
      } else if (filter === 'month' && completionDate.isSame(now, 'month')) {
        include = true;
      }

      return sum + (include && typeof job.price === 'number' ? job.price : 0);
    }, 0);
  };

  const revenueToday = calculateRevenue('today');
  const revenueThisWeek = calculateRevenue('week');
  const revenueThisMonth = calculateRevenue('month');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-[80vh] max-w-5xl bg-white rounded-xl shadow-xl flex flex-col p-6">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">Driver Details: {driver.full_name}</DialogTitle>
          <DialogDescription>Comprehensive overview of {driver.full_name}'s profile and activity.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-gray-50 shadow-sm rounded-xl p-4">
            <CardHeader className="p-0 pb-3 flex flex-row items-center gap-3">
              <Avatar className="h-12 w-12">
                {driver.avatar_url ? (
                  <AvatarImage src={driver.avatar_url} alt={driver.full_name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-medium">{driverInitials}</AvatarFallback>
                )}
              </Avatar>
              <CardTitle className="text-xl font-semibold text-gray-900">{driver.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-gray-500" /> Role: <Badge variant="secondary" className="capitalize">{driver.role}</Badge></p>
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-500" /> DOB: {driver.dob ? format(parseISO(driver.dob), 'PPP') : 'N/A'}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-500" /> Phone: {driver.phone || 'N/A'}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-500" /> Email: {driverEmail}</p>
              <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-gray-500" /> Vehicle Reg: {driver.truck_reg || 'N/A'}</p>
              <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-gray-500" /> Trailer No: {driver.trailer_no || 'N/A'}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /> Last Job Status: <Badge variant="outline" className="capitalize">{driver.last_job_status || 'N/A'}</Badge></p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-gray-50 shadow-sm rounded-xl p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900">Current Jobs ({driverJobs.filter(j => !['delivered', 'pod_received', 'cancelled'].includes(j.status)).length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 space-y-3 text-sm text-gray-700">
              {loadingJobs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" /> Loading jobs...
                </div>
              ) : jobsError ? (
                <p className="text-red-500">Error loading jobs: {jobsError}</p>
              ) : driverJobs.filter(j => !['delivered', 'pod_received', 'cancelled'].includes(j.status)).length === 0 ? (
                <p className="text-gray-600">No active jobs currently assigned.</p>
              ) : (
                <div className="space-y-3">
                  {driverJobs.filter(j => !['delivered', 'pod_received', 'cancelled'].includes(j.status)).map(job => (
                    <div key={job.id} className="flex flex-col p-3 border border-gray-200 rounded-md bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">Order: {job.order_number}</span>
                        <Badge variant="secondary" className="capitalize">{job.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.collection_city && job.collection_postcode
                          ? `${formatAddressPart(job.collection_city)}, ${formatPostcode(job.collection_postcode)}`
                          : 'N/A'}
                        <ArrowRight className="h-3 w-3 mx-1" />
                        {job.delivery_city && job.delivery_postcode
                          ? `${formatAddressPart(job.delivery_city)}, ${formatPostcode(job.delivery_postcode)}`
                          : 'N/A'}
                      </p>
                      <Button variant="link" size="sm" className="self-end p-0 h-auto text-blue-600" onClick={() => onJobView(job.order_number)}>
                        View Job
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 bg-gray-50 shadow-sm rounded-xl p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900">Current Location</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 text-sm text-gray-700">
              {driver.last_location ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-500" /> Lat: {driver.last_location.lat.toFixed(4)}, Lon: {driver.last_location.lon.toFixed(4)}</p>
                  <p className="text-xs text-gray-600 ml-6">Last updated: {format(parseISO(driver.last_location.timestamp), 'PPP HH:mm')}</p>
                  <div className="w-full h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                    Placeholder Map
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Location data not available.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-gray-50 shadow-sm rounded-xl p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2 p-3 bg-white rounded-md shadow-sm">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Revenue Today</p>
                  <p className="text-lg font-bold text-green-700">{formatGBPDisplay(revenueToday)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white rounded-md shadow-sm">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Revenue This Week</p>
                  <p className="text-lg font-bold text-blue-700">{formatGBPDisplay(revenueThisWeek)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white rounded-md shadow-sm">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Revenue This Month</p>
                  <p className="text-lg font-bold text-purple-700">{formatGBPDisplay(revenueThisMonth)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDetailDialog;