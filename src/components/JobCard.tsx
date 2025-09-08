"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Truck, MapPin, MoreHorizontal, CheckCircle, FileText, Edit } from 'lucide-react';
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  profiles: Profile[];
  userRole: 'admin' | 'office' | 'driver' | undefined;
  currentProfile: Profile | null;
  currentOrgId: string;
  onAction: (type: 'statusUpdate' | 'assignDriver' | 'viewAttachments', job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  profiles,
  userRole,
  currentProfile,
  currentOrgId,
  onAction,
}) => {
  const navigate = useNavigate();

  const getDriverInfo = (assignedDriverId: string | null | undefined) => {
    if (!assignedDriverId) {
      return { name: 'Unassigned', reg: '', initials: 'UA' };
    }
    const driver = profiles.find(p => p.id === assignedDriverId && p.role === 'driver');
    const fullName = driver?.full_name || 'Unknown Driver';
    const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      name: fullName,
      reg: driver?.truck_reg || 'N/A',
      initials: initials,
    };
  };

  const driverInfo = getDriverInfo(job.assigned_driver_id);
  const isCancelled = job.status === 'cancelled';
  const isDelivered = job.status === 'delivered' || job.status === 'pod_received';
  const isPlanned = job.status === 'planned';
  const isInProgress = ['accepted', 'assigned', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery'].includes(job.status);

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-xl shadow-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-100",
        "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-in-out",
        "flex flex-col justify-between max-w-sm w-full"
      )}
    >
      {/* Animated Orbs */}
      <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow sm:block hidden" />
      <div className="absolute bottom-[-30px] right-[-30px] w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-pulse-slower sm:block hidden" />
      <div className="absolute top-[50%] left-[50%] w-20 h-20 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow sm:block hidden" />

      <div className="relative z-10 flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <CardTitle className="text-lg font-bold text-gray-900">
            <Link to={`/jobs/${job.order_number}`} className="text-blue-700 hover:underline">
              {job.order_number}
            </Link>
          </CardTitle>
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
        </CardHeader>

        <CardContent className="p-0 pt-3 space-y-3 flex-grow">
          {/* Driver Info */}
          <div className="flex items-center text-sm text-gray-700">
            <Avatar className="h-7 w-7 mr-2">
              <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                {driverInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{driverInfo.name}</div>
              {driverInfo.reg && driverInfo.name !== 'Unassigned' && (
                <div className="text-xs text-gray-500">{driverInfo.reg}</div>
              )}
            </div>
          </div>

          {/* Collection Address */}
          <div className="text-sm text-gray-700">
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-blue-600" /> Collection:
            </p>
            <div className="flex flex-col items-start ml-5">
              <span className="font-medium text-gray-900">{formatAddressPart(job.collection_name)}</span>
              <span className="text-xs text-gray-600">
                {job.collection_city && job.collection_postcode
                  ? `${formatAddressPart(job.collection_city)}, ${formatPostcode(job.collection_postcode)}`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="text-sm text-gray-700">
            <p className="font-medium text-gray-900 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-green-600" /> Delivery:
            </p>
            <div className="flex flex-col items-start ml-5">
              <span className="font-medium text-gray-900">{formatAddressPart(job.delivery_name)}</span>
              <span className="text-xs text-gray-600">
                {job.delivery_city && job.delivery_postcode
                  ? `${formatAddressPart(job.delivery_city)}, ${formatPostcode(job.delivery_postcode)}`
                  : '-'}
              </span>
            </div>
          </div>
        </CardContent>

        {/* Actions */}
        <div className="relative z-10 pt-4 border-t border-gray-200 mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <MoreHorizontal className="h-4 w-4 mr-2" /> Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-md">
              <DropdownMenuItem onClick={() => onAction('statusUpdate', job)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Update Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/jobs/${job.order_number}`)}>
                <FileText className="mr-2 h-4 w-4" /> View Job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('assignDriver', job)}>
                <Truck className="mr-2 h-4 w-4" /> Change Driver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('viewAttachments', job)}>
                <Edit className="mr-2 h-4 w-4" /> View Attachments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default JobCard;