"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CheckCircle, FileText, Edit, Camera, Truck, XCircle, AlertTriangle } from 'lucide-react';
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

interface JobsTableProps {
  jobs: Job[];
  profiles: Profile[];
  userRole: 'admin' | 'office' | 'driver' | undefined;
  currentProfile: Profile | null;
  currentOrgId: string;
  onAction: (type: 'statusUpdate' | 'assignDriver' | 'viewAttachments' | 'uploadImage', job: Job) => void;
  onCancelJob: (job: Job) => void;
  onViewDriverProfile: (driver: Profile) => void;
}

const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  profiles,
  userRole,
  currentProfile,
  currentOrgId,
  onAction,
  onCancelJob,
  onViewDriverProfile,
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
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const { column } = header;
                    return (
                      <TableHead key={column.id} className="text-gray-700 font-medium">
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center justify-center',
                              header.column.getCanSort() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={column.getToggleSortingHandler()}
                                  className="h-8 w-8 p-0"
                                >
                                  {column.getIsSorted() === 'desc' ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : column.getIsSorted() === 'asc' ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            >
                              {column.renderHeader()}
                            </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
              {jobs.map((job, index) => {
                const driverInfo = getDriverInfo(job.assigned_driver_id);
                const isCancelled = job.status === 'cancelled';
                const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
                const isPlanned = job.status === 'planned';
                const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);
                const isOverdue = (job.status === 'at_collection' || job.status === 'at_delivery') && job.overdue_notification_sent;

                return (
                  <TableRow
                    key={job.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors py-4",
                      isCancelled && 'opacity-70', // Apply opacity for cancelled jobs
                      isOverdue && 'bg-yellow-100 hover:bg-yellow-200'
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
                          "rounded-full px-3 py-1 text-xs font-medium flex items-center",
                          isCancelled && 'bg-red-500 text-white', // Red badge for cancelled
                          isDelivered && 'bg-green-500 text-white',
                          isPlanned && 'bg-yellow-500 text-white',
                          isInProgress && 'bg-blue-500 text-white',
                          isOverdue && 'bg-yellow-400 text-yellow-900'
                        )}
                      >
                        {isOverdue && <AlertTriangle className="h-3 w-3 mr-1.5" />}
                        {getDisplayStatus(job.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.created_at ? format(parseISO(job.created_at), 'dd/MM/yyyy') : 'N/A'}</TableCell>
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
                          {job.assigned_driver_id ? (
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-blue-700 hover:underline"
                              onClick={() => {
                                const driver = profiles.find(p => p.id === job.assigned_driver_id);
                                if (driver) onViewDriverProfile(driver);
                              }}
                            >
                              {driverInfo.name}
                            </Button>
                          ) : (
                            <div className="font-medium text-gray-900">{driverInfo.name}</div>
                          )}
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
                                onClick={() => onCancelJob(job)}
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
      </CardContent>
    </Card>
  );
};

export default JobsTable;