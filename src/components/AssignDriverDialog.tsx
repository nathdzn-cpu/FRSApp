"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/types';
import { Loader2, User, Truck, CheckCircle2, XCircle } from 'lucide-react';
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(currentAssignedDriverId || null);

  useEffect(() => {
    if (open) {
      setSelectedDriverId(currentAssignedDriverId || null);
      setSearchTerm('');
    }
  }, [open, currentAssignedDriverId]);

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

  const currentAssignedDriver = useMemo(() => {
    return drivers.find(d => d.id === currentAssignedDriverId);
  }, [drivers, currentAssignedDriverId]);

  const selectedDriver = useMemo(() => {
    return drivers.find(d => d.id === selectedDriverId);
  }, [drivers, selectedDriverId]);

  const handleSaveAssignment = async () => {
    await onAssign(selectedDriverId);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isSaveDisabled = isAssigning || selectedDriverId === (currentAssignedDriverId || null);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-4xl h-auto rounded-xl shadow-xl bg-white flex flex-col max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900">Assign Driver</AlertDialogTitle>
          <AlertDialogDescription>
            Select a driver to assign to this job, then click "Save" to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentAssignedDriver ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Avatar className="h-9 w-9">
                      {currentAssignedDriver.avatar_url ? (
                        <AvatarImage src={currentAssignedDriver.avatar_url} alt={currentAssignedDriver.full_name} className="object-cover" />
                      ) : (
                        <AvatarFallback className="bg-green-100 text-green-700 text-sm font-medium">
                          {currentAssignedDriver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">Currently Assigned: {currentAssignedDriver.full_name}</span>
                      <span className="text-xs text-gray-600 flex items-center">
                        <Truck className="h-3 w-3 mr-1" /> {currentAssignedDriver.truck_reg || 'N/A'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-gray-900">Currently Unassigned</span>
                  </>
                )}
              </div>
              {currentAssignedDriver && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDriverId(null)}
                  disabled={isAssigning || selectedDriverId === null}
                >
                  Clear Selection
                </Button>
              )}
            </div>

            <Input
              placeholder="Search drivers by name or truck reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isAssigning}
            />

            <ScrollArea className="h-60 w-full rounded-md border border-[var(--saas-border)]">
              <div className="p-2">
                {filteredDrivers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No drivers found.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredDrivers.map((driver) => (
                      <Button
                        key={driver.id}
                        variant={driver.id === selectedDriverId ? 'default' : 'outline'}
                        onClick={() => setSelectedDriverId(driver.id)}
                        disabled={isAssigning}
                        className={cn(
                          "w-full justify-start text-left h-auto py-2",
                          driver.id === selectedDriverId && "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          {driver.avatar_url ? (
                            <AvatarImage src={driver.avatar_url} alt={driver.full_name} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{driver.full_name}</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Truck className="h-3 w-3 mr-1" /> {driver.truck_reg || 'N/A'}
                          </span>
                        </div>
                        {driver.id === selectedDriverId && <CheckCircle2 className="h-4 w-4 ml-auto text-white" />}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <AlertDialogFooter className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel} disabled={isAssigning}>
            Cancel
          </Button>
          <Button onClick={handleSaveAssignment} disabled={isSaveDisabled}>
            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Assignment
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AssignDriverDialog;