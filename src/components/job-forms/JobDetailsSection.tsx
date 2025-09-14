"use client";

import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Job, Profile } from '@/utils/mockData';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import { parseCurrencyInput } from '@/lib/utils/formatUtils';
import { DatePicker } from '@/components/ui/date-picker'; // Import the new DatePicker

interface JobDetailsSectionProps {
  drivers: Profile[];
  isSubmitting: boolean;
  disableAllButDriverFields: boolean;
}

const JobDetailsSection: React.FC<JobDetailsSectionProps> = ({
  drivers,
  isSubmitting,
  disableAllButDriverFields,
}) => {
  const { control, watch, setValue, getValues } = useFormContext();

  // Local state for the price input string
  const [priceInputString, setPriceInputString] = useState<string>('');

  // Sync local state with form's price value
  useEffect(() => {
    const formPrice = getValues('price');
    if (formPrice !== null && formPrice !== undefined) {
      setPriceInputString(formPrice.toFixed(2)); // Format to 2 decimal places for display
    } else {
      setPriceInputString('');
    }
  }, [watch('price'), getValues]); // Watch the form's price field

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
      {/* Order Number */}
      <FormField
        control={control}
        name="order_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">Order Number</FormLabel>
            <FormControl>
              <Input
                placeholder="ORDER-XXX"
                {...field}
                value={field.value || ''}
                disabled={disableAllButDriverFields}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status */}
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger disabled={isSubmitting}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
                {['planned', 'assigned', 'accepted', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery', 'delivered', 'pod_received', 'cancelled'].map(status => (
                  <SelectItem key={status} value={status}>
                    {getDisplayStatus(status as Job['status'])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Date Created */}
      <FormField
        control={control}
        name="date_created"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-gray-700">Date Created</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                    disabled={disableAllButDriverFields}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[var(--saas-card-bg)] shadow-sm rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Collection Date */}
      <FormField
        control={control}
        name="collection_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-gray-700">Collection Date</FormLabel>
            <DatePicker
              date={field.value}
              setDate={field.onChange}
              disabled={disableAllButDriverFields}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Delivery Date */}
      <FormField
        control={control}
        name="delivery_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-gray-700">Delivery Date</FormLabel>
            <DatePicker
              date={field.value}
              setDate={field.onChange}
              disabled={disableAllButDriverFields}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Price */}
      <FormField
        control={control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">Price (GBP)</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  type="text" // Use text type for custom formatting
                  placeholder="0.00"
                  value={priceInputString} // Controlled by local state
                  onChange={(e) => {
                    const rawInput = e.target.value;
                    setPriceInputString(rawInput); // Update local state instantly
                  }}
                  onBlur={() => {
                    const numericValue = parseCurrencyInput(priceInputString);
                    setValue('price', numericValue, { shouldValidate: true, shouldDirty: true }); // Update react-hook-form with numeric value
                    // After updating the form, re-sync local state to ensure full formatting
                    if (numericValue !== null) {
                      setPriceInputString(numericValue.toFixed(2)); // Ensure 2 decimal places on blur
                    } else {
                      setPriceInputString('');
                    }
                    field.onBlur(); // Call react-hook-form's onBlur
                  }}
                  className="pl-7" // Add left padding for the £ symbol
                  disabled={disableAllButDriverFields || isSubmitting}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Assign Driver */}
      <FormField
        control={control}
        name="assigned_driver_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700">Assign Driver (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''} disabled={disableAllButDriverFields}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
                <SelectItem value="null">Unassigned</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.full_name} ({driver.truck_reg || 'N/A'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Notes */}
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel className="text-gray-700">Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Any general notes for this job..." {...field} value={field.value || ''} disabled={isSubmitting} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default JobDetailsSection;