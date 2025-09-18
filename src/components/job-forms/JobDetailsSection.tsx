"use client";

import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { JobFormValues } from '@/lib/schemas/jobSchema';
import { Profile } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/utils/formatUtils';

interface JobDetailsSectionProps {
  form: UseFormReturn<JobFormValues>;
  isSubmitting: boolean;
  drivers: Profile[];
}

const JobDetailsSection: React.FC<JobDetailsSectionProps> = ({ form, isSubmitting, drivers }) => {
  const [priceInputString, setPriceInputString] = useState<string>('');

  useEffect(() => {
    const formPrice = form.getValues('price');
    if (formPrice !== null && formPrice !== undefined) {
      setPriceInputString(formPrice.toFixed(2));
    } else {
      setPriceInputString('');
    }
  }, [form.watch('price')]);

  return (
    <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900">Job Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
        <FormField
          control={form.control}
          name="order_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Order Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Leave blank for auto-generate, or enter ORDER-XXX"
                  {...field}
                  value={field.value || ''}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="collection_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-gray-700">Collection Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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

        <FormField
          control={form.control}
          name="delivery_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-gray-700">Delivery Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Price (GBP)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={priceInputString}
                    onChange={(e) => setPriceInputString(e.target.value)}
                    onBlur={() => {
                      const numericValue = parseCurrencyInput(priceInputString);
                      field.onChange(numericValue);
                      if (numericValue !== null) {
                        setPriceInputString(numericValue.toFixed(2));
                      } else {
                        setPriceInputString('');
                      }
                      field.onBlur();
                    }}
                    className="pl-7"
                    disabled={isSubmitting}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigned_driver_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Assign Driver (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSubmitting}>
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

        <FormField
          control={form.control}
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
      </CardContent>
    </Card>
  );
};

export default JobDetailsSection;