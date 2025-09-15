"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import JobsTable from '@/components/JobsTable';
import JobCard from '@/components/JobCard';
import { Job, Profile } from '@/utils/mockData';
import { DialogType } from '@/hooks/useDashboard';

interface JobsDisplayProps {
  isLoading: boolean;
  error: Error | null;
  jobs: Job[];
  profiles: Profile[];
  userRole: 'admin' | 'office' | 'driver' | 'customer' | undefined;
  currentProfile: Profile | null;
  currentOrgId: string;
  onAction: (type: DialogType, job: Job) => void;
  onCancelJob: (job: Job) => void;
  onViewDriverProfile: (driver: Profile) => void;
}

const JobsDisplay: React.FC<JobsDisplayProps> = ({
  isLoading,
  error,
  jobs,
  profiles,
  userRole,
  currentProfile,
  currentOrgId,
  onAction,
  onCancelJob,
  onViewDriverProfile,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">Error loading jobs: {error.message}</div>;
  }

  return (
    <>
      <div className="hidden md:block">
        <JobsTable
          jobs={jobs}
          profiles={profiles}
          userRole={userRole}
          currentProfile={currentProfile}
          currentOrgId={currentOrgId}
          onAction={onAction}
          onCancelJob={onCancelJob}
          onViewDriverProfile={onViewDriverProfile}
        />
      </div>
      <div className="md:hidden space-y-4">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            profiles={profiles}
            userRole={userRole}
            currentProfile={currentProfile}
            currentOrgId={currentOrgId}
            onAction={onAction}
          />
        ))}
      </div>
    </>
  );
};

export default JobsDisplay;