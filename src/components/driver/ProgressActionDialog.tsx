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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarIcon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, setHours, setMinutes, setSeconds } from 'date-fns';
import { formatAndValidateTimeInput } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProgressActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  onSubmit: (dateTime: Date, notes: string) => Promise<void>;
  isLoading: boolean;
  initialDateTime?: Date;
  initialNotes?: string;
}

const ProgressActionDialog: React.FC<ProgressActionDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onSubmit,
  isLoading,
  initialDateTime,
  initialNotes,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDateTime || new Date());
  const [timeInput, setTimeInput] = useState<string>(initialDateTime ? format(initialDateTime, 'HH:mm') : format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState<string>(initialNotes || '');
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedDate(initialDateTime || new Date());
      setTimeInput(initialDateTime ? format(initialDateTime, 'HH:mm') : format(new Date(), 'HH:mm'));
      setNotes(initialNotes || '');
      setTimeError(null);
    }
  }, [open, initialDateTime, initialNotes]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      return;
    }

    let newDateTime = date;
    if (selectedDate) {
      // Preserve time if a date was already selected
      newDateTime = setHours(newDateTime, selectedDate.getHours());
      newDateTime = setMinutes(newDateTime, selectedDate.getMinutes());
      newDateTime = setSeconds(newDateTime, 0);
    } else {
      // Default to current time if no date was selected before
      const now = new Date();
      newDateTime = setHours(newDateTime, now.getHours());
      newDateTime = setMinutes(newDateTime, now.getMinutes());
      newDateTime = setSeconds(newDateTime, 0);
    }
    setSelectedDate(newDateTime);
    onChange(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setTimeInput(rawInput);
    if (onTimeInputChange) {
      onTimeInputChange(rawInput); // Pass raw input to parent for external validation
    }

    const { formattedTime, error } = formatAndValidateTimeInput(rawInput);
    setInternalTimeError(error);

    if (formattedTime && selectedDate) {
      const [hoursStr, minutesStr] = formattedTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      let newDateTime = setHours(selectedDate, hours);
      newDateTime = setMinutes(newDateTime, minutes);
      newDateTime = setSeconds(newDateTime, 0);
      onChange(newDateTime);
    } else if (formattedTime && !selectedDate) {
      // If no date is selected, default to today's date with the chosen time
      let newDateTime = new Date();
      newDateTime = setHours(newDateTime, parseInt(formattedTime.split(':')[0], 10));
      newDateTime = setMinutes(newDateTime, parseInt(formattedTime.split(':')[1], 10));
      newDateTime = setSeconds(newDateTime, 0);
      setSelectedDate(newDateTime);
      onChange(newDateTime);
    } else {
      // If time is invalid or empty, clear the time part of the date
      if (selectedDate) {
        const newDateTime = setHours(setMinutes(setSeconds(selectedDate, 0), 0), 0);
        onChange(newDateTime);
      } else {
        onChange(undefined);
      }
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || timeError) {
      toast.error("Please ensure a valid date and time are selected.");
      return;
    }
    await onSubmit(selectedDate, notes);
    onOpenChange(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSelectedDate(initialDateTime || new Date());
      setTimeInput(initialDateTime ? format(initialDateTime, 'HH:mm') : format(new Date(), 'HH:mm'));
      setNotes(initialNotes || '');
      setTimeError(null);
    }
    onOpenChange(openState);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md bg-[var(--saas-card-bg)] p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900">{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-gray-700">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[var(--saas-card-bg)] shadow-sm rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-gray-700">Time (HH:MM)</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <Input
                  id="time-input"
                  type="text" // Changed to text to allow custom formatting
                  value={timeInput}
                  onChange={handleTimeChange}
                  onBlur={(e) => {
                    const { formattedTime } = formatAndValidateTimeInput(e.target.value);
                    if (formattedTime) {
                      setTimeInput(formattedTime); // Auto-format on blur if valid
                    }
                  }}
                  placeholder="HH:MM (e.g., 09:00)"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="driver-time-input"
                />
              </div>
              {timeError && (
                <p className="text-red-500 text-sm mt-1">{timeError}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)} disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading || !selectedDate || !!timeError}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ProgressActionDialog;