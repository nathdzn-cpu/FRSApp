"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Truck, MapPin, Calendar, PoundSterling } from 'lucide-react';
import { Job, JobStop, Profile } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { formatGBP } from '@/lib/money';

interface JobOverviewCardProps {
  job: Job;
  stops: JobStop[];
  allProfiles: Profile[];
}

const JobOverviewCard: React.FC<JobOverviewCardProps> = ({ job, stops, allProfiles }) => {
  const driver = allProfiles.find(p => p.id === job.assigned_driver_id);
  const collectionStops = stops.filter(s => s.type === 'collection');
  const deliveryStops = stops.filter(s => s.type === 'delivery');

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <CardContent className="p-0 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="flex items-start space-x-4">
        <Truck className="h-6 w-6 text-gray-500 mt-1" />
        <div>
          <p className="text-sm font-medium text-gray-500">Driver</p>
          {driver ? (
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={driver.avatar_url || undefined} alt={driver.full_name} />
                <AvatarFallback>{getInitials(driver.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-800">{driver.full_name}</p>
                <p className="text-xs text-gray-500">{driver.truck_reg || 'No truck assigned'}</p>
              </div>
            </div>
          ) : (
            <p className="font-semibold text-gray-800">Unassigned</p>
          )}
        </div>
      </div>

      <div className="flex items-start space-x-4">
        <MapPin className="h-6 w-6 text-gray-500 mt-1" />
        <div>
          <p className="text-sm font-medium text-gray-500">Route</p>
          <p className="font-semibold text-gray-800">
            {collectionStops.length} Collection{collectionStops.length !== 1 ? 's' : ''}
          </p>
          <p className="font-semibold text-gray-800">
            {deliveryStops.length} Delivery{deliveryStops.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-4">
        <Calendar className="h-6 w-6 text-gray-500 mt-1" />
        <div>
          <p className="text-sm font-medium text-gray-500">Dates</p>
          <p className="font-semibold text-gray-800">
            Collect: {format(parseISO(job.collection_date), 'PPP')}
          </p>
          <p className="font-semibold text-gray-800">
            Deliver: {format(parseISO(job.delivery_date), 'PPP')}
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-4">
        <PoundSterling className="h-6 w-6 text-gray-500 mt-1" />
        <div>
          <p className="text-sm font-medium text-gray-500">Price</p>
          <p className="font-semibold text-gray-800">{formatGBP(job.price || 0)}</p>
        </div>
      </div>
    </CardContent>
  );
};

export default JobOverviewCard;