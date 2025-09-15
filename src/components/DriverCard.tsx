"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Briefcase,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarClock
} from 'lucide-react';
import { Profile } from '@/utils/mockData';
import { cn } from '@/lib/utils';

interface DriverCardProps {
  driver: Profile;
  stats: {
    activeJobs: number;
    jobsToday: number;
    jobsThisWeek: number;
  };
  onViewDetails: (driver: Profile) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, stats, onViewDetails }) => {
  const driverInitials = driver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isActive = stats.activeJobs > 0;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-xl shadow-lg p-4 bg-white",
        "hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 ease-in-out",
        "flex flex-col justify-between w-full"
      )}
    >
      <div className="relative z-10 flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {driver.avatar_url ? (
                <AvatarImage src={driver.avatar_url} alt={driver.full_name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600 text-base font-medium">
                  {driverInitials}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">{driver.full_name}</CardTitle>
              <p className="text-xs text-gray-500 capitalize">{driver.role}</p>
            </div>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              "capitalize text-xs",
              isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            )}
          >
            {isActive ? 'Active' : 'Off Duty'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 pt-3 space-y-3 text-sm text-gray-700 flex-grow">
          <div className="flex items-center gap-2 text-gray-600">
            <Truck className="h-4 w-4 text-gray-400" /> {driver.truck_reg || 'N/A'} {driver.trailer_no ? `(${driver.trailer_no})` : ''}
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-2">
             <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-gray-400" /> Active Jobs:</span>
              <span className="font-semibold">{stats.activeJobs}</span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-gray-400" /> Jobs Today:</span>
              <span className="font-semibold">{stats.jobsToday}</span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> Jobs This Week:</span>
              <span className="font-semibold">{stats.jobsThisWeek}</span>
            </p>
          </div>
        </CardContent>
        <div className="relative z-10 pt-4 border-t border-gray-200 mt-auto">
          <Button onClick={() => onViewDetails(driver)} className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" /> View Performance
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DriverCard;