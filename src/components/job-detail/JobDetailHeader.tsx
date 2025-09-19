"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Job } from '@/utils/mockData';
import { getDisplayStatus, getStatusBadgeVariant } from '@/lib/utils/statusUtils';
import { Copy, XCircle, Pencil, UserPlus, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JobDetailHeaderProps {
  job: Job;
  onClone?: () => void;
  onCancel?: () => void;
  onEditJob?: () => void;
  onAssignDriver?: () => void;
  onExportPdf?: () => void;
}

const JobDetailHeader: React.FC<JobDetailHeaderProps> = ({
  job,
  onClone,
  onCancel,
  onEditJob,
  onAssignDriver,
  onExportPdf,
}) => {
  const badgeVariant = getStatusBadgeVariant(job.status);

  return (
    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between p-0 pb-4 gap-4">
      <div>
        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          Job: {job.order_number}
          <Badge
            variant={badgeVariant}
            className={cn({
              'bg-green-100 text-green-800 border-green-200 hover:bg-green-200': badgeVariant === 'outline',
              'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200': badgeVariant === 'secondary',
              'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200': badgeVariant === 'default',
            })}
          >
            {getDisplayStatus(job.status)}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{job.customer_name}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onEditJob && (
          <Button variant="outline" size="sm" onClick={onEditJob}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Job
          </Button>
        )}
        {onAssignDriver && (
          <Button variant="outline" size="sm" onClick={onAssignDriver}>
            <UserPlus className="h-4 w-4 mr-2" /> Assign Driver
          </Button>
        )}
        {onExportPdf && (
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <FileDown className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        )}
        {onClone && (
          <Button variant="outline" size="sm" onClick={onClone}>
            <Copy className="h-4 w-4 mr-2" /> Clone Job
          </Button>
        )}
        {onCancel && (
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-2" /> Cancel Job
          </Button>
        )}
      </div>
    </CardHeader>
  );
};

export default JobDetailHeader;