"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Job } from "@/utils/mockData";

interface ActiveJobBannerProps {
  activeJobs: Job[];
}

const ActiveJobBanner: React.FC<ActiveJobBannerProps> = ({ activeJobs }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (activeJobs.length === 0) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [activeJobs]);

  if (!isVisible || activeJobs.length === 0) {
    return null;
  }

  const firstActiveJob = activeJobs[0];

  return (
    <Link to={`/jobs/${firstActiveJob.order_number}`} className="block w-full">
      <Alert
        className={cn(
          "relative flex items-center justify-start p-4 rounded-none border-l-0 border-r-0 border-t-0 shadow-md cursor-pointer hover:bg-yellow-200 transition-colors",
          "bg-yellow-100 text-yellow-800 border-b border-yellow-300"
        )}
      >
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="h-5 w-5 text-yellow-600" />
          <div>
            <AlertTitle className="text-base font-semibold">You have a job in progress. Tap to view.</AlertTitle>
          </div>
        </div>
      </Alert>
    </Link>
  );
};

export default ActiveJobBanner;