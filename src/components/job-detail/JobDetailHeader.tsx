"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Job } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { Copy, XCircle } from 'lucide-react';

export interface JobDetailHeaderProps {
  job: Job;
  onClone?: () => void;
  onCancel?: () => void;
}

const JobDetailHeader: React.FC<JobDetailHeaderProps> = ({
  job,
  onClone,
  onCancel,
}) => {
  const isCancelled = job.status === 'cancelled';

  return (
    <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
      <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        Job: {job.order_number}
        <Badge
          variant={
            job.status === 'planned'
              ? 'secondary'
              : job.status === 'accepted' || job.status === 'assigned'
              ? 'default'
              : job.status === 'delivered'
              ? 'outline'
              : 'destructive'
          }
          className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
        >
          {getDisplayStatus(job.status)}
        </Badge>
      </CardTitle>
      <div className="flex space-x-2">
        {onClone && (
          <Button variant="outline" onClick={onClone}>
            <Copy className="h-4 w-4 mr-2" /> Clone Job
          </Button>
        )}
        {onCancel && !isCancelled && (
          <Button variant="destructive" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-2" /> Cancel Job
          </Button>
        )}
      </div>
    </CardHeader>
  );
};

export default JobDetailHeader;