"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Profile } from '@/utils/mockData';
import { Loader2, User, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drivers: Profile[];
  currentAssignedDriverId: string | null | undefined;
  onAssign: (driverId: string | null) => Promise<void>;
  isAssigning: boolean;
}

const AssignDriverDialog: React.FC<AssignDriverDialogProps> = ({
  open,
  onOpenChange,
  drivers,
  currentAssignedDriverId,
  onAssign,
  isAssigning,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim()) {
      return drivers;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return drivers.filter(
      (driver) =>
        driver.full_name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (driver.truck_reg && driver.truck_reg.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (driver.trailer_no && driver.trailer_no.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [drivers, searchTerm]);

  const handleAssignClick = async (driverId: string | null) => {
    await onAssign(driverId);
    if (!isAssigning) { // Only close if assignment is not still in progress
      onOpenChange(false);
      setSearchTerm('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-200 -mx-6 px-6 pt-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">Assign Driver</DialogTitle>
          <DialogDescription>
            Select a driver to assign to this job, or clear the current assignment.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto p-4 -mx-6 px-6"> {/* Apply ScrollArea here */}
          <div className="space-y-4">
            <Input
              placeholder="Search drivers by name or truck reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isAssigning}
              className="rounded-full border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />

            <Button
              variant="outline"
              onClick={() => handleAssignClick(null)}
              disabled={isAssigning || !currentAssignedDriverId}
              className="w-full justify-start text-left bg-white hover:bg-gray-50"
            >
              {isAssigning && currentAssignedDriverId === null ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clear Assignment
            </Button>

            <div className="rounded-md border">
              <div className="p-2">
                {filteredDrivers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No drivers found.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredDrivers.map((driver) => (
                      <Button
                        key={driver.id}
                        variant={driver.id === currentAssignedDriverId ? 'default' : 'outline'}
                        onClick={() => handleAssignClick(driver.id)}
                        disabled={isAssigning || driver.id === currentAssignedDriverId}
                        className={cn(
                          "w-full justify-start text-left h-auto py-2",
                          driver.id === currentAssignedDriverId ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-900 hover:bg-blue-50 hover:text-blue-600"
                        )}
                      >
                        {isAssigning && driver.id === currentAssignedDriverId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
                              {driver.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{driver.full_name}</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Truck className="h-3 w-3 mr-1" /> {driver.truck_reg || 'N/A'}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDriverDialog;