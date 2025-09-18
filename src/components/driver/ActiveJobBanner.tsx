"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Job } from '@/utils/mockData';
import { Link } from 'react-router-dom';

interface ActiveJobBannerProps {
  activeJobs: Job[];
  onDismiss: () => void;
}

const ActiveJobBanner: React.FC<ActiveJobBannerProps> = ({ activeJobs, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // If there are no active jobs, ensure the banner is not visible
    if (activeJobs.length === 0) {
      setIsVisible(false);
    } else {
      setIsVisible(true); // Show if there are active jobs
    }
  }, [activeJobs]);

  if (!isVisible || activeJobs.length === 0) {
    return null;
  }

  const firstActiveJob = activeJobs[0]; // Display info for the first active job

  return (
    <Alert
      className={cn(
        "relative flex flex-col sm:flex-row items-center justify-between p-4 mb-6 rounded-xl shadow-md",
        "bg-yellow-100 text-yellow-800 border-yellow-300"
      )}
    >
      <div className="flex items-center space-x-3 text-center sm:text-left">
        <CheckCircle2 className="h-5 w-5 text-yellow-600" />
        <div>
          <AlertTitle className="text-lg font-semibold">Active Job in Progress</AlertTitle>
          <AlertDescription className="text-sm">
            You must complete or cancel this job before starting another.
            <br />
            <Link to={`/jobs/${firstActiveJob.order_number}`} className="underline font-medium hover:text-yellow-900">
              View Job {firstActiveJob.order_number}
            </Link>
          </AlertDescription>
        </div>
      </div>
      {/* The banner is dismissible only when the active job is completed/cancelled,
          which is handled by the `isVisible` state being updated via `activeJobs.length === 0`.
          So, no explicit dismiss button is needed here. */}
    </Alert>
  );
};

export default ActiveJobBanner;