"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, FileText, Edit, Camera, Truck, XCircle } from 'lucide-react';
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[];
  userRole: 'admin' | 'office' | 'driver' | undefined;
  currentProfile: Profile | null;
  currentOrgId: string;
  onAction: (type: 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage', job: Job) => void;
  onCancelJob: (job: Job) => void; // New prop
}

const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  profiles,
  userRole,
  currentProfile,
  currentOrgId,
  onAction,
  onCancelJob, // Use new prop
}) => {
  const navigate = useNavigate();

  const getDriverInfo = (assignedDriverId: string | null | undefined) => {
    if (!assignedDriverId) {
      return { name: 'Unassigned', reg: '', initials: 'UA', avatar_url: null };
    }
    const driver = profiles.find(p => p.id === assignedDriverId && p.role === 'driver');
    const fullName = driver?.full_name || 'Unknown Driver';
    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      name: fullName,
      reg: driver?.truck_reg || 'N/A',
      initials: initials,
      avatar_url: driver?.avatar_url || null,
    };
  };

  if (jobs.length === 0) {
    return <p className="text-gray-600">No jobs found for this tenant with the selected filter.</p>;
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="text-gray-700 font-medium">Order Number</TableHead>
            <TableHead className="text-gray-700 font-medium">Status</TableHead>
            <TableHead className="text-gray-700 font-medium">Date</TableHead>
            <TableHead className="text-gray-700 font-medium">Driver</TableHead>
            <TableHead className="text-gray-700 font-medium">Collection</TableHead>
            <TableHead className="text-gray-700 font-medium">Delivery</TableHead>
            <TableHead className="text-center text-gray-700 font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-200">
          {jobs.map((job, index) => {
            const driverInfo = getDriverInfo(job.assigned_driver_id);
            const isCancelled = job.status === 'cancelled';
            const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
            const isPlanned = job.status === 'planned';
            const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);

            return (
              <TableRow
                key={job.id}
                className={cn(
                  "hover:bg-gray-50 transition-colors py-4",
                  isCancelled && 'opacity-70' // Apply opacity for cancelled jobs
                )}
              >
                <TableCell className="font-medium">
                  <Link to={`/jobs/${job.order_number}`} className="text-blue-700 hover:underline">
                    {job.order_number}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      isCancelled && 'bg-red-500 text-white', // Red badge for cancelled
                      isDelivered && 'bg-green-500 text-white',
                      isPlanned && 'bg-yellow-500 text-white',
                      isInProgress && 'bg-blue-500 text-white',
                    )}
                  >
                    {getDisplayStatus(job.status)}
                  </Badge>
                </TableCell>
                <TableCell>{format(parseISO(job.date_created), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-gray-700">
                    <Avatar className="h-7 w-7 mr-2">
                      {driverInfo.avatar_url ? (
                        <AvatarImage src={driverInfo.avatar_url} alt={driverInfo.name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                          {driverInfo.initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">{driverInfo.name}</div>
                      {driverInfo.reg && driverInfo.name !== 'Unassigned' && (
                        <div className="text-xs text-gray-500">{driverInfo.reg}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
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
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-md">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onAction('statusUpdate', job)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Update Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/jobs/${job.order_number}`)}>
                        <FileText className="mr-2 h-4 w-4" /> View Job
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('assignDriver', job)}>
                        <Truck className="mr-2 h-4 w-4" />
                        Change Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction('viewAttachments', job)}>
                        <Edit className="mr-2 h-4 w-4" /> View Attachments
                      </DropdownMenuItem>
                      {userRole === 'admin' || userRole === 'office' ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onCancelJob(job)} // Call onCancelJob
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Job
                          </DropdownMenuItem>
                        </>
                      ) : null}
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

export default JobsTable;