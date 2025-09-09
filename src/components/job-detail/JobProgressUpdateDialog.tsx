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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarIcon, Clock } from 'lucide-react'; // Added CalendarIcon and Clock
import { Input } from '@/components/ui/input'; // Added Input
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Added Popover components
import { Calendar } from '@/components/ui/calendar'; // Added Calendar
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus, jobStatusOrder, getSkippedStatuses } from '@/lib/utils/statusUtils';
import { format, setHours, setMinutes, setSeconds, parseISO } from 'date-fns'; // Added parseISO
import { formatAndValidateTimeInput } from '@/lib/utils/timeUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Added cn utility

interface ProgressUpdateEntry {
  status: Job['status'];
  dateTime: Date; // Combined date and time
  timeInput: string;
  timeError: string | null;
  notes: string;
}

interface JobProgressUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  currentProfile: Profile;
  userRole: 'admin' | 'office' | 'driver';
  onUpdateProgress: (entries: ProgressUpdateEntry[]) => Promise<void>;
  isUpdatingProgress: boolean;
  driverActiveJobs?: Job[]; // New prop: list of all active jobs for the driver
}

const JobProgressUpdateDialog: React.FC<JobProgressUpdateDialogProps> = ({
  open,
  onOpenChange,
  job,
  currentProfile,
  userRole,
  onUpdateProgress,
  isUpdatingProgress,
  driverActiveJobs = [], // Default to empty array
}) => {
  const [selectedNewStatus, setSelectedNewStatus] = useState<Job['status'] | ''>('');
  const [progressUpdateEntries, setProgressUpdateEntries] = useState<ProgressUpdateEntry[]>([]);

  // Filter statuses for the progress update dropdown (exclude 'planned', 'assigned', 'cancelled' as direct updates)
  const progressUpdateSelectableStatuses = jobStatusOrder.filter(status =>
    !['planned', 'assigned', 'cancelled'].includes(status)
  );

  // Effect to generate progress update entries when selectedNewStatus changes
  useEffect(() => {
    if (job && selectedNewStatus && jobStatusOrder.includes(job.status) && jobStatusOrder.includes(selectedNewStatus)) {
      const skipped = getSkippedStatuses(job.status, selectedNewStatus);
      const allStatusesToLog = [...skipped, selectedNewStatus];
      
      const now = new Date();
      const defaultTime = format(now, 'HH:mm');

      setProgressUpdateEntries(
        allStatusesToLog.map(status => ({
          status,
          dateTime: setSeconds(setMinutes(setHours(new Date(), now.getHours()), now.getMinutes()), 0), // Today's date, current time, seconds to 0
          notes: '',
          timeInput: defaultTime,
          timeError: null,
        }))
      );
    } else {
      setProgressUpdateEntries([]);
    }
  }, [job, selectedNewStatus]);

  const handleDateChange = (index: number, date: Date | undefined) => {
    setProgressUpdateEntries(prevEntries => {
      const newEntries = [...prevEntries];
      if (date && newEntries[index].dateTime) {
        // Preserve time, update date
        let newDateTime = setHours(date, newEntries[index].dateTime.getHours());
        newDateTime = setMinutes(newDateTime, newEntries[index].dateTime.getMinutes());
        newDateTime = setSeconds(newDateTime, 0);
        newEntries[index].dateTime = newDateTime;
      } else if (date && !newEntries[index].dateTime) {
        // If no previous dateTime, use new date with default time (e.g., 00:00)
        newEntries[index].dateTime = setSeconds(setMinutes(setHours(date, 0), 0), 0);
      } else {
        // Date cleared, clear dateTime
        newEntries[index].dateTime = undefined as any; // Allow undefined for now, validation will catch
      }
      return newEntries;
    });
  };

  const handleTimeInputChange = (index: number, rawInput: string) => {
    setProgressUpdateEntries(prevEntries => {
      const newEntries = [...prevEntries];
      const { formattedTime, error } = formatAndValidateTimeInput(rawInput);
      
      newEntries[index] = {
        ...newEntries[index],
        timeInput: rawInput,
        timeError: error,
      };

      if (formattedTime && newEntries[index].dateTime) {
        // Update time part of existing dateTime
        const [hoursStr, minutesStr] = formattedTime.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        let newDateTime = setHours(newEntries[index].dateTime, hours);
        newDateTime = setMinutes(newDateTime, minutes);
        newDateTime = setSeconds(newDateTime, 0);
        newEntries[index].dateTime = newDateTime;
      } else if (formattedTime && !newEntries[index].dateTime) {
        // If no date is selected, default to today's date with the chosen time
        let newDateTime = new Date();
        newDateTime = setHours(newDateTime, parseInt(formattedTime.split(':')[0], 10));
        newDateTime = setMinutes(newDateTime, parseInt(formattedTime.split(':')[1], 10));
        newDateTime = setSeconds(newDateTime, 0);
        newEntries[index].dateTime = newDateTime;
      } else {
        // If time is invalid or empty, clear the time part of the date
        if (newEntries[index].dateTime) {
          const newDateTime = setHours(setMinutes(setSeconds(newEntries[index].dateTime, 0), 0), 0);
          newEntries[index].dateTime = newDateTime;
        } else {
          newEntries[index].dateTime = undefined as any; // Set to undefined if no date
        }
      }
      return newEntries;
    });
  };

  const handleNotesChange = (index: number, notes: string) => {
    setProgressUpdateEntries(prevEntries => {
      const newEntries = [...prevEntries];
      newEntries[index] = { ...newEntries[index], notes };
      return newEntries;
    });
  };

  const handleConfirmUpdate = async () => {
    if (progressUpdateEntries.length === 0) {
      toast.error("No status updates to log.");
      return;
    }

    const hasErrors = progressUpdateEntries.some(entry => entry.timeError !== null || !entry.dateTime);
    if (hasErrors) {
      toast.error("Please ensure all date and time entries are valid.");
      return;
    }

    // Driver progression restriction: Only one job past 'accepted' at a time
    if (userRole === 'driver') {
      const statusesBeyondAccepted = ['on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery', 'delivered', 'pod_received'];
      const isProgressingBeyondAccepted = progressUpdateEntries.some(entry => statusesBeyondAccepted.includes(entry.status));

      if (isProgressingBeyondAccepted) {
        const otherActiveJobs = driverActiveJobs.filter(activeJob =>
          activeJob.id !== job.id && statusesBeyondAccepted.includes(activeJob.status)
        );

        if (otherActiveJobs.length > 0) {
          toast.error("You already have an active job in progress. Please complete or cancel it before starting another.");
          return; // Block the update
        }
      }
    }

    await onUpdateProgress(progressUpdateEntries);
    // Reset dialog state after successful update
    setSelectedNewStatus('');
    setProgressUpdateEntries([]);
    onOpenChange(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSelectedNewStatus('');
      setProgressUpdateEntries([]);
    }
    onOpenChange(openState);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900">Update Job Progress</AlertDialogTitle>
          <AlertDialogDescription>
            Log a new status update for this job.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progress-status">New Status</Label>
              <Select
                value={selectedNewStatus}
                onValueChange={(value: Job['status']) => setSelectedNewStatus(value)}
                disabled={isUpdatingProgress}
              >
                <SelectTrigger id="progress-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-sm rounded-xl">
                  {progressUpdateSelectableStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {getDisplayStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {progressUpdateEntries.length > 0 && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold">Log Entries:</h3>
                {progressUpdateEntries.map((entry, index) => (
                  <Card key={index} className="p-3 bg-gray-50 shadow-sm rounded-md"> {/* Removed border */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      {/* Status Display */}
                      <div className="flex flex-col sm:col-span-1">
                        <Label className="text-gray-700">Status:</Label>
                        <p className="font-semibold text-lg text-gray-900">{getDisplayStatus(entry.status)}</p>
                      </div>

                      {/* Date Picker */}
                      <div className="flex flex-col sm:col-span-1">
                        <Label className="text-gray-700">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !entry.dateTime && "text-muted-foreground"
                              )}
                              disabled={isUpdatingProgress}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {entry.dateTime ? format(entry.dateTime, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
                            <Calendar
                              mode="single"
                              selected={entry.dateTime}
                              onSelect={(date) => handleDateChange(index, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time Input */}
                      <div className="flex flex-col sm:col-span-1">
                        <Label htmlFor={`time-input-${index}`} className="text-gray-700">Time (HH:MM)</Label>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <Input
                            id={`time-input-${index}`}
                            type="text"
                            value={entry.timeInput}
                            onChange={(e) => handleTimeInputChange(index, e.target.value)}
                            onBlur={(e) => {
                              const { formattedTime } = formatAndValidateTimeInput(e.target.value);
                              if (formattedTime) {
                                handleTimeInputChange(index, formattedTime); // Auto-format on blur if valid
                              }
                            }}
                            placeholder="HH:MM (e.g., 09:00)"
                            className="w-full"
                            disabled={isUpdatingProgress}
                          />
                        </div>
                        {entry.timeError && (
                          <p className="text-red-500 text-sm mt-1">{entry.timeError}</p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 mt-4">
                      <Label htmlFor={`notes-${index}`} className="text-gray-700">Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${index}`}
                        value={entry.notes}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        placeholder="Add any relevant notes for this update..."
                        disabled={isUpdatingProgress}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)} disabled={isUpdatingProgress}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmUpdate} disabled={isUpdatingProgress || progressUpdateEntries.length === 0 || progressUpdateEntries.some(entry => entry.timeError !== null || !entry.dateTime)}>
            {isUpdatingProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Progress
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default JobProgressUpdateDialog;