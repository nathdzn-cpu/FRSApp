"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile, Job } from '@/utils/mockData';
import { Phone, Truck, Mail, PoundSterling, CheckCircle, Calendar, ShieldCheck } from 'lucide-react';
import { formatGBP } from '@/lib/money';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(isToday);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);

interface DriverDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Profile | null;
  allJobs: Job[];
}

const StatItem: React.FC<{
  icon: React.ElementType,
  label: string,
  value: string | number,
  iconColorClass?: string,
  valueColorClass?: string
}> = ({ icon: Icon, label, value, iconColorClass = 'text-blue-500', valueColorClass = 'text-gray-800' }) => (
  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
    <Icon className={`h-6 w-6 mr-3 ${iconColorClass}`} />
    <div>
      <p className={`font-semibold ${valueColorClass}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

const DriverDetailDialog: React.FC<DriverDetailDialogProps> = ({ open, onOpenChange, driver, allJobs }) => {
  const performanceSummary = useMemo(() => {
    if (!driver || !allJobs) return null;

    const now = dayjs();
    const startOfWeek = now.startOf('week');
    const endOfWeek = now.endOf('week');
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    const relevantJobs = allJobs.filter(job =>
      (job.status === 'delivered' || job.status === 'pod_received' || job.status === 'cancelled') &&
      job.price != null
    );

    const revenueToday = relevantJobs
      .filter(job => dayjs(job.last_status_update_at).isToday())
      .reduce((sum, job) => sum + (job.price || 0), 0);

    const revenueThisWeek = relevantJobs
      .filter(job => dayjs(job.last_status_update_at).isBetween(startOfWeek, endOfWeek, null, '[]'))
      .reduce((sum, job) => sum + (job.price || 0), 0);

    const revenueThisMonth = relevantJobs
      .filter(job => dayjs(job.last_status_update_at).isBetween(startOfMonth, endOfMonth, null, '[]'))
      .reduce((sum, job) => sum + (job.price || 0), 0);

    const jobsToday = relevantJobs.filter(job => dayjs(job.last_status_update_at).isToday()).length;
    const jobsThisWeek = relevantJobs.filter(job => dayjs(job.last_status_update_at).isBetween(startOfWeek, endOfWeek, null, '[]')).length;
    
    const activeJobsCount = allJobs.filter(job => !['delivered', 'pod_received', 'cancelled'].includes(job.status)).length;

    // Calculate averages
    const avgRevenueToday = revenueToday;
    const daysInWeekSoFar = now.diff(startOfWeek, 'day') + 1;
    const avgRevenueThisWeek = daysInWeekSoFar > 0 ? revenueThisWeek / daysInWeekSoFar : 0;
    const daysInMonthSoFar = now.date();
    const avgRevenueThisMonth = daysInMonthSoFar > 0 ? revenueThisMonth / daysInMonthSoFar : 0;

    return {
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      jobsToday,
      jobsThisWeek,
      activeJobsCount,
      avgRevenueToday,
      avgRevenueThisWeek,
      avgRevenueThisMonth,
    };
  }, [driver, allJobs]);

  const getRevenueColor = (average: number) => {
    if (average > 700) return 'text-green-500';
    if (average >= 600) return 'text-orange-500';
    return 'text-red-500';
  };

  if (!driver || !performanceSummary) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-xl">
        <DialogHeader className="pt-6">
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
              <AvatarImage src={driver.avatar_url || ''} alt={driver.full_name} />
              <AvatarFallback className="text-3xl bg-gray-200 text-gray-700">{getInitials(driver.full_name)}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-2xl font-bold">{driver.full_name}</DialogTitle>
            <DialogDescription>Driver Performance Summary</DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-4 px-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Contact & Vehicle</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-gray-400" />
                <span>{driver.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-3 text-gray-400" />
                <span>{driver.email || 'Not provided'}</span>
              </div>
              <div className="flex items-center">
                <Truck className="h-4 w-4 mr-3 text-gray-400" />
                <span>{driver.truck_reg || 'No truck assigned'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatItem
                icon={PoundSterling}
                label="Revenue Today"
                value={formatGBP(performanceSummary.revenueToday)}
                iconColorClass={getRevenueColor(performanceSummary.avgRevenueToday)}
                valueColorClass={getRevenueColor(performanceSummary.avgRevenueToday)}
              />
              <StatItem
                icon={PoundSterling}
                label="Revenue This Week"
                value={formatGBP(performanceSummary.revenueThisWeek)}
                iconColorClass={getRevenueColor(performanceSummary.avgRevenueThisWeek)}
                valueColorClass={getRevenueColor(performanceSummary.avgRevenueThisWeek)}
              />
              <StatItem
                icon={PoundSterling}
                label="Revenue This Month"
                value={formatGBP(performanceSummary.revenueThisMonth)}
                iconColorClass={getRevenueColor(performanceSummary.avgRevenueThisMonth)}
                valueColorClass={getRevenueColor(performanceSummary.avgRevenueThisMonth)}
              />
              <StatItem icon={CheckCircle} label="Jobs Today" value={performanceSummary.jobsToday} />
              <StatItem icon={Calendar} label="Jobs This Week" value={performanceSummary.jobsThisWeek} />
              <StatItem icon={ShieldCheck} label="Active Status" value={performanceSummary.activeJobsCount > 0 ? 'Active' : 'Off Duty'} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDetailDialog;