"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/utils/mockData';
import { Phone, Truck, BarChart2, CheckCircle, Clock, ShieldCheck } from 'lucide-react';

interface DriverDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Profile | null;
}

const DriverDetailDialog: React.FC<DriverDetailDialogProps> = ({ open, onOpenChange, driver }) => {
  if (!driver) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-xl">
        <DialogHeader className="pt-6">
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
              <AvatarImage src={driver.avatar_url || ''} alt={driver.full_name} />
              <AvatarFallback className="text-3xl bg-gray-200 text-gray-700">{getInitials(driver.full_name)}</AvatarFallback>
            </Avatar>
            <DialogTitle className="text-2xl font-bold">{driver.full_name}</DialogTitle>
            <DialogDescription>Driver Profile</DialogDescription>
          </div>
        </DialogHeader>
        <div className="py-4 px-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Contact & Vehicle</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-gray-400" />
                <span>{driver.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center">
                <Truck className="h-4 w-4 mr-3 text-gray-400" />
                <span>{driver.truck_reg || 'No truck assigned'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Performance Summary (Placeholder)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center p-2 bg-gray-50 rounded-md">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                <div>
                  <p className="font-semibold">124</p>
                  <p className="text-gray-500">Jobs Done</p>
                </div>
              </div>
              <div className="flex items-center p-2 bg-gray-50 rounded-md">
                <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
                <div>
                  <p className="font-semibold">£15,670</p>
                  <p className="text-gray-500">Revenue</p>
                </div>
              </div>
              <div className="flex items-center p-2 bg-gray-50 rounded-md">
                <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                <div>
                  <p className="font-semibold">98%</p>
                  <p className="text-gray-500">On-time</p>
                </div>
              </div>
              <div className="flex items-center p-2 bg-gray-50 rounded-md">
                <ShieldCheck className="h-5 w-5 mr-2 text-indigo-500" />
                <div>
                  <p className="font-semibold">Active</p>
                  <p className="text-gray-500">Status</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverDetailDialog;