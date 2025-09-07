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
import { Loader2 } from 'lucide-react';
import DateTimePicker from '@/components/DateTimePicker';
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus, jobStatusOrder, getSkippedStatuses } from '@/lib/utils/statusUtils';
import { format, setHours, setMinutes, setSeconds } from 'date-fns';
import { formatAndValidateTimeInput } from '@/lib/utils/timeUtils';
import { toast } from 'sonner';

interface ProgressUpdateEntry {
  status: Job['status'];
  dateTime: Date;
  notes: string;
  timeInput: string;
  timeError: string | null;
}

interface JobProgressUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  currentProfile: Profile;
  userRole: 'admin' | 'office' | 'driver';
  onUpdateProgress: (entries: ProgressUpdateEntry[]) => Promise<void>;
  isUpdatingProgress: boolean;
}

const JobProgressUpdateDialog: React.FC<JobProgressUpdateDialogProps> = ({
  open,
  onOpenChange,
  job,
  currentProfile,
  userRole,
  onUpdateProgress,
  isUpdatingProgress,
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

  const handleProgressUpdateEntryChange = (index: number, field: 'dateTime' | 'notes' | 'timeInput', value: any) => {
    setProgressUpdateEntries(prevEntries => {
      const newEntries = [...prevEntries];
      if (field === 'timeInput') {
        const { formattedTime, error } = formatAndValidateTimeInput(value);
        newEntries[index] = {
          ...newEntries[index],
          timeInput: value,
          timeError: error,
        };
        if (formattedTime) {
          // Update dateTime with today's date and the formatted time
          const [hoursStr, minutesStr] = formattedTime.split(':');
          const hours = parseInt(hoursStr, 10);
          const minutes = parseInt(minutesStr, 10);
          let newDateTime = setHours(new Date(), hours); // Always use today's date
          newDateTime = setMinutes(newDateTime, minutes);
          newDateTime = setSeconds(newDateTime, 0);
          newEntries[index].dateTime = newDateTime;
        } else {
          // If time input is invalid, set dateTime to today 00:00:00
          newEntries[index].dateTime = setSeconds(setMinutes(setHours(new Date(), 0), 0), 0);
        }
      } else {
        newEntries[index] = { ...newEntries[index], [field]: value };
      }
      return newEntries;
    });
  };

  const handleConfirmUpdate = async () => {
    if (progressUpdateEntries.length === 0) {
      toast.error("No status updates to log.");
      return;
    }

    const hasTimeErrors = progressUpdateEntries.some(entry => entry.timeError !== null);
    if (hasTimeErrors) {
      toast.error("Please fix invalid time entries.");
      return;
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
      <AlertDialogContent className="max-w-md bg-white p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
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
                  <Card key={index} className="p-3 bg-gray-50 border border-gray-200">
                    <p className="font-medium text-gray-900 mb-2">{getDisplayStatus(entry.status)}</p>
                    <DateTimePicker
                      label="Date and Time"
                      value={entry.dateTime}
                      onChange={(date) => handleProgressUpdateEntryChange(index, 'dateTime', date)}
                      disabled={isUpdatingProgress}
                      timeError={entry.timeError}
                      onTimeInputChange={(time) => handleProgressUpdateEntryChange(index, 'timeInput', time)}
                    />
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`notes-${index}`}>Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${index}`}
                        value={entry.notes}
                        onChange={(e) => handleProgressUpdateEntryChange(index, 'notes', e.target.value)}
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
          <AlertDialogAction onClick={handleConfirmUpdate} disabled={isUpdatingProgress || progressUpdateEntries.length === 0 || progressUpdateEntries.some(entry => entry.timeError !== null)}>
            {isUpdatingProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Progress
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default JobProgressUpdateDialog;