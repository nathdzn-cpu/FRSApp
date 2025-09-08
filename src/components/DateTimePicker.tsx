"use client";

import React, { useState, useEffect } from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { format, setHours, setMinutes, setSeconds, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAndValidateTimeInput } from '@/lib/utils/timeUtils'; // Import the new utility

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label?: string;
  disabled?: boolean;
  // New props for time input validation/error
  timeError?: string | null;
  onTimeInputChange?: (time: string) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label, disabled, timeError, onTimeInputChange }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [timeInput, setTimeInput] = useState<string>(value ? format(value, 'HH:mm') : '');
  const [internalTimeError, setInternalTimeError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(value);
    setTimeInput(value ? format(value, 'HH:mm') : '');
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(undefined);
      return;
    }

    let newDateTime = date;
    if (selectedDate) {
      // Preserve time if a date was already selected
      newDateTime = setHours(newDateTime, selectedDate.getHours());
      newDateTime = setMinutes(newDateTime, selectedDate.getMinutes());
      newDateTime = setSeconds(newDateTime, selectedDate.getSeconds());
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

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP HH:mm") : <span>Pick a date and time</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[var(--saas-card-bg)] shadow-sm rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="p-3 border-t border-gray-200 flex flex-col space-y-2">
            <Label htmlFor="time-input" className="sr-only">Time</Label>
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
                placeholder="HH:MM (e.g., 09:00 or 15:30)"
                className="w-full"
                disabled={disabled}
              />
            </div>
            {(internalTimeError || timeError) && (
              <p className="text-red-500 text-sm">{internalTimeError || timeError}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateTimePicker;