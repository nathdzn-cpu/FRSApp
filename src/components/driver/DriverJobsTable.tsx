"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Edit, Camera } from 'lucide-react';
import { Job } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface DriverJobsTableProps {
  jobs: Job[];
  onAction: (type: 'statusUpdate' | 'viewAttachments' | 'uploadImage', job: Job) => void;
}

const DriverJobsTable: React.FC<DriverJobsTableProps> = ({
  jobs,
  onAction,
}) => {
  const navigate = useNavigate();

  if (jobs.length === 0) {
    return <p className="text-gray-600">No jobs found for you with the selected filter.</p>;
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="text-gray-700 font-medium">Order Number</TableHead>
            <TableHead className="text-gray-700 font-medium">Status</TableHead>
            <TableHead className="text-gray-700 font-medium">Collection Date</TableHead>
            <TableHead className="text-gray-700 font-medium">Delivery Date</TableHead>
            <TableHead className="text-gray-700 font-medium">Collection</TableHead>
            <TableHead className="text-gray-700 font-medium">Delivery</TableHead>
            <TableHead className="text-center text-gray-700 font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200">
          {jobs.map((job) => {
            const isCancelled = job.status === 'cancelled';
            const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
            const isPlanned = job.status === 'planned';
            const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);

            return (
              <TableRow key={job.id} className="hover:bg-gray-50 transition-colors py-4">
                <TableCell className="font-medium">
                  <Link to={`/jobs/${job.order_number}`} className="text-blue-700 hover:underline">
                    {job.order_number}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      isCancelled && 'bg-red-500 text-white',
                      isDelivered && 'bg-green-500 text-white',
                      isPlanned && 'bg-yellow-500 text-white',
                      isInProgress && 'bg-blue-500 text-white',
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell>{job.collection_date ? format(parseISO(job.collection_date), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>{job.delivery_date ? format(parseISO(job.delivery_date), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-gray-900">{formatAddressPart(job.collection_name)}</span>
                    <span className="text-sm text-gray-600">
                      {job.collection_city && job.collection_postcode
                        ? `${formatAddressPart(job.collection_city)}, ${formatPostcode(job.collection_postcode)}`
                        : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-gray-900">{formatAddressPart(job.delivery_name)}</span>
                    <span className="text-sm text-gray-600">
                      {job.delivery_city && job.delivery_postcode
                        ? `${formatAddressPart(job.delivery_city)}, ${formatPostcode(job.delivery_postcode)}`
                        : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-md">
                      <DropdownMenuItem onClick={() => navigate(`/jobs/${job.order_number}`)}>
                        <FileText className="mr-2 h-4 w-4" /> View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('viewAttachments', job)}>
                        <Edit className="mr-2 h-4 w-4" /> View Attachments
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('uploadImage', job)}>
                        <Camera className="mr-2 h-4 w-4" /> Upload Image
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DriverJobsTable;