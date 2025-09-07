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

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  label?: string;
  disabled?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, label, disabled }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [timeInput, setTimeInput] = useState<string>(value ? format(value, 'HH:mm') : '');

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
      newDateTime = setSeconds(newDateTime, now.getSeconds());
    }
    setSelectedDate(newDateTime);
    onChange(newDateTime);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeInput(newTime);

    const [hoursStr, minutesStr] = newTime.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (selectedDate && !isNaN(hours) && !isNaN(minutes)) {
      let newDateTime = setHours(selectedDate, hours);
      newDateTime = setMinutes(newDateTime, minutes);
      newDateTime = setSeconds(newDateTime, 0); // Reset seconds to 0
      onChange(newDateTime);
    } else if (!selectedDate && !isNaN(hours) && !isNaN(minutes)) {
      // If no date is selected, default to today's date with the chosen time
      let newDateTime = new Date();
      newDateTime = setHours(newDateTime, hours);
      newDateTime = setMinutes(newDateTime, minutes);
      newDateTime = setSeconds(newDateTime, 0);
      setSelectedDate(newDateTime);
      onChange(newDateTime);
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
        <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="p-3 border-t border-gray-200 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <Input
              type="time"
              value={timeInput}
              onChange={handleTimeChange}
              className="w-full"
              disabled={disabled}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateTimePicker;