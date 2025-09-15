"use client";

import React from 'react';
import StatCard from '@/components/StatCard';
import { Truck, CheckCircle2, XCircle } from 'lucide-react';

interface Stats {
  totalJobs: number;
  activeJobsCount: number;
  completedJobsCount: number;
  cancelledJobsCount: number;
}

interface DashboardStatCardsProps {
  stats: Stats;
}

const DashboardStatCards: React.FC<DashboardStatCardsProps> = ({ stats }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatCard
        title="Total Jobs"
        value={stats.totalJobs}
        icon={Truck}
        iconColorClass="text-blue-600"
        valueColorClass="text-blue-800"
        description="All jobs in the system"
      />
      <StatCard
        title="Active Jobs"
        value={stats.activeJobsCount}
        icon={Truck}
        iconColorClass="text-yellow-600"
        valueColorClass="text-yellow-800"
        description="Jobs currently in progress"
      />
      <StatCard
        title="Completed Jobs"
        value={stats.completedJobsCount}
        icon={CheckCircle2}
        iconColorClass="text-green-600"
        valueColorClass="text-green-800"
        description="Jobs successfully delivered"
      />
      <StatCard
        title="Cancelled Jobs"
        value={stats.cancelledJobsCount}
        icon={XCircle}
        iconColorClass="text-red-600"
        valueColorClass="text-red-800"
        description="Jobs that were cancelled"
      />
    </div>
  );
};

export default DashboardStatCards;