"use client";

import React from 'react';
import StatCard from '@/components/StatCard';
import { Truck, CheckCircle2, XCircle } from 'lucide-react';

interface DashboardStatsProps {
  totalJobs: number;
  activeJobsCount: number;
  completedJobsCount: number;
  cancelledJobsCount: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalJobs,
  activeJobsCount,
  completedJobsCount,
  cancelledJobsCount,
}) => {
  return (
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
  );
};

export default DashboardStats;