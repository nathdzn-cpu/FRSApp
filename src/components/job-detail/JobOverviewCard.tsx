"use client";

import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Job, JobStop, Profile } from '@/utils/mockData';
import JobStopsList from '@/components/JobStopsList';
import { format, parseISO } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import getDisplayStatus
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils'; // Import formatPostcode

interface JobOverviewCardProps {
  job: Job;
  stops: JobStop[];
  allProfiles: Profile[];
}

const JobOverviewCard: React.FC<JobOverviewCardProps> = ({ job, stops, allProfiles }) => {
  const collectionStops = stops.filter(s => s.type === 'collection');
  const deliveryStops = stops.filter(s => s.type === 'delivery');

  return (
    <CardContent className="p-0 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">Date Created:</p>
          <p>{format(new Date(job.date_created), 'PPP')}</p>
        </div>
        <div>
          <p className="font-medium text-gray-900">Assigned Driver:</p>
          <p>{job.assigned_driver_id ? allProfiles.find(p => p.id === job.assigned_driver_id)?.full_name || 'Unknown' : 'Unassigned'}</p>
        </div>
        <div>
          <p className="font-medium text-gray-900">Price:</p>
          <p>{job.price ? `£${job.price.toFixed(2)}` : '-'}</p>
        </div>
        <div className="lg:col-span-1">
          <p className="font-medium text-gray-900">Notes:</p>
          <p>{job.notes || '-'}</p>
        </div>
        <div className="lg:col-span-1">
          <p className="font-medium text-gray-900">Last Status Update:</p>
          <p className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-500" />
            {job.last_status_update_at ? format(parseISO(job.last_status_update_at), 'PPP HH:mm') : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--saas-border)]">
        <div>
          <p className="font-medium text-gray-900 flex items-center gap-1 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" /> Collections:
          </p>
          {job.collection_name || (job.collection_city && job.collection_postcode) ? (
            <div className="flex flex-col items-start">
              <span className="font-medium text-gray-900">{formatAddressPart(job.collection_name)}</span>
              <span className="text-sm text-gray-600">
                {job.collection_city && job.collection_postcode
                  ? `${formatAddressPart(job.collection_city)}, ${formatPostcode(job.collection_postcode)}`
                  : '-'}
              </span>
            </div>
          ) : (
            <p className="text-gray-600">No collection stops defined for this job.</p>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900 flex items-center gap-1 mb-2">
            <MapPin className="h-4 w-4 text-green-600" /> Deliveries:
          </p>
          {job.delivery_name || (job.delivery_city && job.delivery_postcode) ? (
            <div className="flex flex-col items-start">
              <span className="font-medium text-gray-900">{formatAddressPart(job.delivery_name)}</span>
              <span className="text-sm text-gray-600">
                {job.delivery_city && job.delivery_postcode
                  ? `${formatAddressPart(job.delivery_city)}, ${formatPostcode(job.delivery_postcode)}`
                  : '-'}
              </span>
            </div>
          ) : (
            <p className="text-gray-600">No delivery stops defined for this job.</p>
          )}
        </div>
      </div>
    </CardContent>
  );
};

export default JobOverviewCard;