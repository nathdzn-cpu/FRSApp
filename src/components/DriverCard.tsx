"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Truck, Briefcase, MapPin, ArrowRight } from 'lucide-react';
import { Profile } from '@/utils/mockData';
import { cn } from '@/lib/utils';

interface DriverCardProps {
  driver: Profile;
  jobsAssignedCount: number;
  onViewDetails: (driver: Profile) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, jobsAssignedCount, onViewDetails }) => {
  const driverInitials = driver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isActive = jobsAssignedCount > 0;

  return (
    <Card
      className={cn(
        "bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between transition-all duration-200 ease-in-out",
        "hover:scale-[1.02] hover:shadow-lg",
        "max-w-sm w-full" // Default max-width, full width on smaller screens
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-base font-medium">
              {driverInitials}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg font-bold text-gray-900">{driver.full_name}</CardTitle>
        </div>
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={cn(
            "capitalize",
            isActive ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          )}
        >
          {isActive ? 'Active' : 'Off Duty'}
        </Badge>
      </CardHeader>
      <CardContent className="p-0 pt-3 space-y-2 text-sm text-gray-700 flex-grow">
        <p className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-500" /> {driver.phone || 'N/A'}
        </p>
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-gray-500" /> {driver.truck_reg || 'N/A'} {driver.trailer_no ? `(Trailer: ${driver.trailer_no})` : ''}
        </p>
        <p className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-gray-500" /> Jobs Assigned: {jobsAssignedCount}
        </p>
      </CardContent>
      <div className="pt-4 border-t border-gray-100 mt-4">
        <Button onClick={() => onViewDetails(driver)} className="w-full bg-blue-600 text-white hover:bg-blue-700">
          <ArrowRight className="h-4 w-4 mr-2" /> View Details
        </Button>
      </div>
    </Card>
  );
};

export default DriverCard;